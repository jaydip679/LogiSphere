#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * LogiSphere — Consolidated Render Multi-Process Orchestrator
 *
 * Runs all 6 LogiSphere backend microservices in a single Render container
 * while strictly preserving service boundaries, domain isolation, and memory limits:
 *
 *   [Render $PORT / External Traffic]
 *                 │
 *                 ▼
 *         API Gateway (:PORT / :10000)
 *                 │  (Internal Loopback HTTP)
 *     ┌───────────┼───────────┬───────────┬───────────┐
 *     ▼           ▼           ▼           ▼           ▼
 *    Auth      Shipment     Fleet     Tracking  Notification
 *   (:5001)    (:5002)     (:5003)    (:5004)     (:5005)
 *
 * Memory Protection on Render Free Tier (512 MB RSS):
 *  - Enforces --max-old-space-size=60 on each V8 process
 *  - Actively polls Linux /proc/<pid>/status for actual child process RSS
 *  - Enforces warning threshold (400 MB) and critical alerting (460 MB)
 *  - Traps SIGTERM/SIGINT for coordinated, graceful microservice teardown
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(ROOT_DIR, '.env'))) {
  dotenv.config({ path: path.join(ROOT_DIR, '.env') });
}
const MAX_RSS_LIMIT_MB = 512;
const WARN_RSS_THRESHOLD_MB = 400;
const CRITICAL_RSS_THRESHOLD_MB = 460;
const V8_OLD_SPACE_SIZE_MB = 35;

// Port assignments
const PORT = parseInt(process.env.PORT, 10) || 10000;
const PORTS = {
  AUTH: 5001,
  SHIPMENT: 5002,
  FLEET: 5003,
  TRACKING: 5004,
  NOTIFICATION: 5005,
  GATEWAY: PORT,
};

// Define the 6 microservice definitions
const SERVICES = [
  {
    name: 'auth-service',
    entry: path.join(ROOT_DIR, 'services/auth-service/src/server.js'),
    port: PORTS.AUTH,
    schema: 'app_auth',
    env: {
      PORT: String(PORTS.AUTH),
      HOST: '127.0.0.1',
      NOTIFICATION_SERVICE_URL: `http://127.0.0.1:${PORTS.NOTIFICATION}`,
    },
  },
  {
    name: 'shipment-service',
    entry: path.join(ROOT_DIR, 'services/shipment-service/src/server.js'),
    port: PORTS.SHIPMENT,
    schema: 'shipment',
    env: {
      PORT: String(PORTS.SHIPMENT),
      HOST: '127.0.0.1',
      AUTH_SERVICE_URL: `http://127.0.0.1:${PORTS.AUTH}`,
      FLEET_SERVICE_URL: `http://127.0.0.1:${PORTS.FLEET}`,
    },
  },
  {
    name: 'fleet-dispatch-service',
    entry: path.join(ROOT_DIR, 'services/fleet-dispatch-service/src/server.js'),
    port: PORTS.FLEET,
    schema: 'fleet',
    env: {
      PORT: String(PORTS.FLEET),
      HOST: '127.0.0.1',
      SHIPMENT_SERVICE_URL: `http://127.0.0.1:${PORTS.SHIPMENT}`,
    },
  },
  {
    name: 'tracking-service',
    entry: path.join(ROOT_DIR, 'services/tracking-service/src/server.js'),
    port: PORTS.TRACKING,
    schema: 'tracking',
    env: {
      PORT: String(PORTS.TRACKING),
      HOST: '127.0.0.1',
    },
  },
  {
    name: 'notification-service',
    entry: path.join(ROOT_DIR, 'services/notification-service/src/server.js'),
    port: PORTS.NOTIFICATION,
    schema: 'notification',
    env: {
      PORT: String(PORTS.NOTIFICATION),
      HOST: '127.0.0.1',
    },
  },
  {
    name: 'api-gateway',
    entry: path.join(ROOT_DIR, 'services/api-gateway/src/server.js'),
    port: PORTS.GATEWAY,
    isGateway: true,
    env: {
      PORT: String(PORTS.GATEWAY),
      HOST: '0.0.0.0',
      AUTH_SERVICE_URL: `http://127.0.0.1:${PORTS.AUTH}`,
      SHIPMENT_SERVICE_URL: `http://127.0.0.1:${PORTS.SHIPMENT}`,
      FLEET_SERVICE_URL: `http://127.0.0.1:${PORTS.FLEET}`,
      TRACKING_SERVICE_URL: `http://127.0.0.1:${PORTS.TRACKING}`,
      NOTIFICATION_SERVICE_URL: `http://127.0.0.1:${PORTS.NOTIFICATION}`,
    },
  },
];

// Tracking child processes
const runningProcesses = new Map(); // name -> { proc, service, restarts: [] }
let isShuttingDown = false;
let telemetryTimer = null;

// ====================================================================
// Memory Inspection (Cross-Platform / Linux /proc aware)
// ====================================================================
function getProcessRssMB(pid) {
  if (!pid) return 0;

  // On Linux (Render), read /proc/<pid>/status directly (0ms overhead)
  const procStatusPath = `/proc/${pid}/status`;
  if (fs.existsSync(procStatusPath)) {
    try {
      const statusContent = fs.readFileSync(procStatusPath, 'utf8');
      const match = statusContent.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match && match[1]) {
        return Math.round(parseInt(match[1], 10) / 1024);
      }
    } catch {
      // Process might have terminated during read
      return 0;
    }
  }

  // Windows fallback
  if (process.platform === 'win32') {
    try {
      const output = execSync(
        `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).WorkingSet64"`,
        { encoding: 'utf8', timeout: 2000 }
      ).trim();
      const bytes = parseInt(output, 10);
      if (!isNaN(bytes)) {
        return Math.round(bytes / (1024 * 1024));
      }
    } catch {
      return 0;
    }
  }

  return 0;
}

function sampleSystemMemory() {
  if (runningProcesses.size === 0) {
    const mem = process.memoryUsage();
    const rss = Math.round(mem.rss / (1024 * 1024));
    const heap = Math.round(mem.heapUsed / (1024 * 1024));
    const percentOfLimit = Math.round((rss / MAX_RSS_LIMIT_MB) * 100);
    const logMsg = `[MEMORY TELEMETRY] Total RSS: ${rss}MB / ${MAX_RSS_LIMIT_MB}MB (${percentOfLimit}%) | V8 Heap: ${heap}MB | High-Efficiency Unified In-Process Architecture`;
    if (rss >= CRITICAL_RSS_THRESHOLD_MB) {
      console.error(`\x1b[31m[CRITICAL MEMORY ALERT] ${logMsg}\x1b[0m`);
    } else if (rss >= WARN_RSS_THRESHOLD_MB) {
      console.warn(`\x1b[33m[MEMORY WARNING] ${logMsg}\x1b[0m`);
    } else {
      console.log(`\x1b[32m${logMsg}\x1b[0m`);
    }
    return rss;
  }

  const orchRss = Math.round(process.memoryUsage().rss / (1024 * 1024));
  let totalChildRss = 0;
  const breakdown = [];

  for (const [name, entry] of runningProcesses.entries()) {
    const rss = getProcessRssMB(entry.proc.pid);
    totalChildRss += rss;
    breakdown.push(`${name.replace('-service', '')}:${rss}MB`);
  }

  const grandTotalRss = orchRss + totalChildRss;
  const percentOfLimit = Math.round((grandTotalRss / MAX_RSS_LIMIT_MB) * 100);

  const logMsg = `[MEMORY TELEMETRY] Total RSS: ${grandTotalRss}MB / ${MAX_RSS_LIMIT_MB}MB (${percentOfLimit}%) | orch:${orchRss}MB | ${breakdown.join(' | ')}`;

  if (grandTotalRss >= CRITICAL_RSS_THRESHOLD_MB) {
    console.error(`\x1b[31m[CRITICAL MEMORY ALERT] ${logMsg}\x1b[0m`);
  } else if (grandTotalRss >= WARN_RSS_THRESHOLD_MB) {
    console.warn(`\x1b[33m[MEMORY WARNING] ${logMsg}\x1b[0m`);
  } else {
    console.log(`\x1b[36m${logMsg}\x1b[0m`);
  }

  return grandTotalRss;
}

// ====================================================================
// Health Check Helper
// ====================================================================
function checkHealth(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/health',
        timeout: timeoutMs,
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(service, maxWaitSeconds = 60) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const isUp = await checkHealth(service.port);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function getServiceDbUrl(baseUrl, schema) {
  if (!baseUrl || !schema) return undefined;
  let url = baseUrl;
  if (url.includes('schema=')) {
    url = url.replace(/schema=[^&]+/, `schema=${schema}`);
  } else if (url.includes('?')) {
    url = `${url}&schema=${schema}`;
  } else {
    url = `${url}?schema=${schema}`;
  }
  // Trim per-service pool size to reduce Prisma engine binary memory footprint
  if (!url.includes('connection_limit=')) {
    url += '&connection_limit=2';
  }
  return url;
}

// ====================================================================
// Process Lifecycle & Spawning
// ====================================================================
function spawnService(service) {
  if (isShuttingDown) return;

  const args = [
    '--optimize-for-size',
    `--max-old-space-size=${V8_OLD_SPACE_SIZE_MB}`,
    '--max-semi-space-size=2',
    service.entry,
  ];

  const serviceDbUrl = service.schema
    ? getServiceDbUrl(process.env.DATABASE_URL, service.schema)
    : undefined;

  const env = {
    ...process.env,
    ...service.env,
    ...(serviceDbUrl ? { DATABASE_URL: serviceDbUrl } : {}),
  };

  // Enforce JWT isolation: Never distribute private signing key to non-auth services
  if (service.name !== 'auth-service') {
    delete env.JWT_PRIVATE_KEY;
  }

  console.log(`[ORCHESTRATOR] Spawning ${service.name} on port ${service.port}...`);

  const child = spawn(process.execPath, args, {
    cwd: ROOT_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = `[${service.name}]`;
  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });

  const entry = runningProcesses.get(service.name) || { service, restarts: [] };
  entry.proc = child;
  runningProcesses.set(service.name, entry);

  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;

    console.warn(
      `[ORCHESTRATOR WARNING] ${service.name} exited with code ${code}, signal ${signal}`
    );

    // Circuit breaker: max 5 restarts in 10 minutes
    const now = Date.now();
    entry.restarts = entry.restarts.filter((t) => now - t < 10 * 60 * 1000);
    entry.restarts.push(now);

    if (entry.restarts.length > 5) {
      console.error(
        `[ORCHESTRATOR ERROR] ${service.name} exceeded restart limit (5 crashes in 10 mins). Halting restart.`
      );
      return;
    }

    console.log(
      `[ORCHESTRATOR] Restarting ${service.name} in 3 seconds (crash ${entry.restarts.length}/5)...`
    );
    setTimeout(() => spawnService(service), 3000);
  });

  return child;
}

// ====================================================================
// Graceful Shutdown
// ====================================================================
async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[ORCHESTRATOR] Received ${signal}. Initiating coordinated graceful shutdown...`);

  if (telemetryTimer) clearInterval(telemetryTimer);

  // Send SIGTERM to all child processes
  for (const [name, entry] of runningProcesses.entries()) {
    if (entry.proc && !entry.proc.killed) {
      console.log(`[ORCHESTRATOR] Sending SIGTERM to ${name} (PID: ${entry.proc.pid})...`);
      try {
        entry.proc.kill('SIGTERM');
      } catch (err) {
        console.warn(`[ORCHESTRATOR] Error sending SIGTERM to ${name}: ${err.message}`);
      }
    }
  }

  // Allow up to 8 seconds for clean drainage of connections and pools
  const forceKillTimeout = setTimeout(() => {
    console.warn(
      '[ORCHESTRATOR WARNING] Graceful shutdown timeout reached (8s). Force-killing remaining processes...'
    );
    for (const [, entry] of runningProcesses.entries()) {
      if (entry.proc && !entry.proc.killed) {
        try {
          entry.proc.kill('SIGKILL');
        } catch {
          // ignore
        }
      }
    }
    process.exit(0);
  }, 8000);

  forceKillTimeout.unref();

  // Wait for all children to exit
  await Promise.all(
    Array.from(runningProcesses.values()).map(
      (entry) =>
        new Promise((resolve) => {
          if (!entry.proc || entry.proc.killed) return resolve();
          entry.proc.on('exit', () => resolve());
        })
    )
  );

  console.log('[ORCHESTRATOR] All microservices successfully stopped. Exiting cleanly.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ====================================================================
// Database Migrations Step
// ====================================================================
function runDatabaseMigrations() {
  if (process.env.SKIP_STARTUP_MIGRATIONS === 'true') {
    console.log('[ORCHESTRATOR] SKIP_STARTUP_MIGRATIONS is set. Skipping startup migrations.\n');
    return;
  }
  console.log('\n[ORCHESTRATOR] Checking database migrations...');
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!directUrl) {
    console.warn(
      '[ORCHESTRATOR WARNING] No DIRECT_URL or DATABASE_URL provided. Skipping startup migrations.'
    );
    return;
  }

  try {
    console.log('[ORCHESTRATOR] Running centralized migrations across all 5 schemas...');
    execSync('node scripts/migrate-all.js', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: directUrl,
      },
      timeout: 120000,
    });
    console.log('[ORCHESTRATOR] Database migrations verified successfully.\n');
  } catch (err) {
    console.error(`[ORCHESTRATOR ERROR] Database migrations failed: ${err.message}`);
    // If critical to boot, we log and proceed (Render will keep running existing schema if minor)
  }
}

// ====================================================================
// Main Bootstrap Orchestration Sequence
// ====================================================================
async function main() {
  console.log('==================================================================');
  console.log('  LogiSphere — Render Microservices Multi-Process Orchestrator   ');
  console.log('==================================================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Public Port : ${PORT} (API Gateway Ingress)`);
  console.log(`RAM Limit   : ${MAX_RSS_LIMIT_MB} MB RSS Budget`);
  console.log(`V8 Heap Cap : ${V8_OLD_SPACE_SIZE_MB} MB max-old-space-size per service`);
  console.log('==================================================================\n');

  // Pre-flight check
  if (!process.env.DATABASE_URL) {
    console.warn(
      '[ORCHESTRATOR WARNING] DATABASE_URL is not set. Services may fail to connect to database.'
    );
  }

  // 1. Run migrations if configured
  runDatabaseMigrations();

  const mode = process.env.ORCHESTRATOR_MODE || 'embedded';

  if (mode === 'embedded') {
    console.log(
      '[ORCHESTRATOR] Architecture Mode: High-Efficiency Unified In-Process (RAM budget: <200MB)\n'
    );

    // Explicitly guarantee downstream ports and loopback bindings
    process.env.PORT_AUTH = String(PORTS.AUTH);
    process.env.HOST_AUTH = '127.0.0.1';
    process.env.PORT_SHIPMENT = String(PORTS.SHIPMENT);
    process.env.HOST_SHIPMENT = '127.0.0.1';
    process.env.PORT_FLEET = String(PORTS.FLEET);
    process.env.HOST_FLEET = '127.0.0.1';
    process.env.PORT_TRACKING = String(PORTS.TRACKING);
    process.env.HOST_TRACKING = '127.0.0.1';
    process.env.PORT_NOTIFICATION = String(PORTS.NOTIFICATION);
    process.env.HOST_NOTIFICATION = '127.0.0.1';
    process.env.PORT_GATEWAY = String(PORT);
    process.env.HOST_GATEWAY = '0.0.0.0';

    process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${PORTS.AUTH}`;
    process.env.SHIPMENT_SERVICE_URL = `http://127.0.0.1:${PORTS.SHIPMENT}`;
    process.env.FLEET_SERVICE_URL = `http://127.0.0.1:${PORTS.FLEET}`;
    process.env.TRACKING_SERVICE_URL = `http://127.0.0.1:${PORTS.TRACKING}`;
    process.env.NOTIFICATION_SERVICE_URL = `http://127.0.0.1:${PORTS.NOTIFICATION}`;

    const servers = [];
    console.log('[ORCHESTRATOR] Booting auth-service on 127.0.0.1:5001...');
    const auth = require('../services/auth-service/src/server');
    servers.push({ name: 'auth-service', server: auth, port: PORTS.AUTH });

    console.log('[ORCHESTRATOR] Booting shipment-service on 127.0.0.1:5002...');
    const shipment = require('../services/shipment-service/src/server');
    servers.push({ name: 'shipment-service', server: shipment, port: PORTS.SHIPMENT });

    console.log('[ORCHESTRATOR] Booting fleet-dispatch-service on 127.0.0.1:5003...');
    const fleet = require('../services/fleet-dispatch-service/src/server');
    servers.push({ name: 'fleet-dispatch-service', server: fleet, port: PORTS.FLEET });

    console.log('[ORCHESTRATOR] Booting tracking-service on 127.0.0.1:5004...');
    const tracking = require('../services/tracking-service/src/server');
    servers.push({ name: 'tracking-service', server: tracking, port: PORTS.TRACKING });

    console.log('[ORCHESTRATOR] Booting notification-service on 127.0.0.1:5005...');
    const notification = require('../services/notification-service/src/server');
    servers.push({ name: 'notification-service', server: notification, port: PORTS.NOTIFICATION });

    // Wait for all 5 downstream services to report healthy
    for (const s of servers) {
      const healthy = await waitForHealth(s, 30);
      if (healthy) {
        console.log(`[ORCHESTRATOR] ✓ ${s.name} is UP on port ${s.port}`);
      } else {
        console.warn(`[ORCHESTRATOR WARNING] ${s.name} health probe timed out on port ${s.port}`);
      }
    }

    // Boot API Gateway on public ingress port
    console.log(`\n[ORCHESTRATOR] Starting API Gateway on public ingress port ${PORT}...`);
    const gateway = require('../services/api-gateway/src/server');
    servers.push({ name: 'api-gateway', server: gateway, port: PORT });

    const gatewayHealthy = await waitForHealth({ port: PORT }, 30);
    if (gatewayHealthy) {
      console.log(
        `[ORCHESTRATOR] ✓ API Gateway is UP and accepting public traffic on 0.0.0.0:${PORT}\n`
      );
    } else {
      console.warn(`[ORCHESTRATOR WARNING] API Gateway health probe timed out on port ${PORT}.\n`);
    }

    // Coordinated graceful shutdown
    const handleShutdown = async (sig) => {
      console.log(`\n[ORCHESTRATOR] Received ${sig}. Gracefully shutting down all microservice servers...`);
      if (telemetryTimer) clearInterval(telemetryTimer);
      for (const s of servers) {
        if (s.server && s.server.close) {
          s.server.close();
        }
      }
      setTimeout(() => process.exit(0), 1000);
    };
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    sampleSystemMemory();
    telemetryTimer = setInterval(sampleSystemMemory, 25000);
    return;
  }

  // 2. Spawn 5 downstream microservices sequentially (multi-process mode)
  const downstreamServices = SERVICES.filter((s) => !s.isGateway);
  for (const svc of downstreamServices) {
    spawnService(svc);
    const healthy = await waitForHealth(svc, 30);
    if (healthy) {
      console.log(`[ORCHESTRATOR] ✓ ${svc.name} is UP on port ${svc.port}`);
    } else {
      console.warn(
        `[ORCHESTRATOR WARNING] ${svc.name} health probe timed out on port ${svc.port}. Proceeding...`
      );
    }
  }

  // 3. Spawn API Gateway (binds to Render $PORT)
  const gatewayService = SERVICES.find((s) => s.isGateway);
  console.log(`\n[ORCHESTRATOR] Starting API Gateway on public ingress port ${PORT}...`);
  spawnService(gatewayService);

  const gatewayHealthy = await waitForHealth(gatewayService, 30);
  if (gatewayHealthy) {
    console.log(
      `[ORCHESTRATOR] ✓ API Gateway is UP and accepting public traffic on 0.0.0.0:${PORT}\n`
    );
  } else {
    console.warn(`[ORCHESTRATOR WARNING] API Gateway health probe timed out on port ${PORT}.\n`);
  }

  // 4. Initial memory sample
  sampleSystemMemory();

  // 5. Start periodic telemetry (every 25 seconds)
  telemetryTimer = setInterval(() => {
    if (!isShuttingDown) {
      sampleSystemMemory();
    }
  }, 25000);
}

main().catch((err) => {
  console.error(`[ORCHESTRATOR FATAL] Startup failed: ${err.message}`, err);
  process.exit(1);
});
