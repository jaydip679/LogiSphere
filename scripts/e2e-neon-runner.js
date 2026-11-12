#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * LogiSphere — Neon Live Cloud E2E Validation Runner
 *
 * Runs the full 40-assertion automated E2E test suite against a dedicated
 * Neon cloud validation branch or database to verify schema compatibility,
 * connection pooling, and live cloud query execution WITHOUT risking or
 * polluting the main Neon production database.
 *
 * Usage:
 *   npm run test:e2e:neon
 *   NEON_VALIDATION_DATABASE_URL="postgresql://..." npm run test:e2e:neon
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { spawn, execSync } = require('child_process');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const NEON_ENV_PATH = path.join(ROOT_DIR, '.env.neon');

// Load .env first for base secrets, then .env.neon for Neon validation URLs
if (fs.existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH });
}
if (fs.existsSync(NEON_ENV_PATH)) {
  dotenv.config({ path: NEON_ENV_PATH, override: true });
}

// Color helpers
const green = (txt) => `\x1b[32m${txt}\x1b[0m`;
const red = (txt) => `\x1b[31m${txt}\x1b[0m`;
const cyan = (txt) => `\x1b[36m${txt}\x1b[0m`;
const yellow = (txt) => `\x1b[33m${txt}\x1b[0m`;
const bold = (txt) => `\x1b[1m${txt}\x1b[0m`;

const ensureConnectTimeout = (url) => {
  if (!url || url.includes('connect_timeout=')) return url;
  return url.includes('?') ? `${url}&connect_timeout=30` : `${url}?connect_timeout=30`;
};

const rawValidationDbUrl =
  process.env.NEON_VALIDATION_DATABASE_URL || process.env.NEON_TEST_DATABASE_URL;

const validationDbUrl = ensureConnectTimeout(rawValidationDbUrl);

const directValidationUrl = ensureConnectTimeout(
  process.env.NEON_VALIDATION_DIRECT_URL || validationDbUrl
);

function printBranchInstruction() {
  console.log(bold(yellow('\n[SAFETY GUARDRAIL: DEDICATED VALIDATION BRANCH REQUIRED]')));
  console.log(
    'In accordance with the approved deployment safety policy, automated E2E test runs\n' +
      'must NOT be executed against the main production Neon database.\n'
  );
  console.log(bold('How to create your Neon validation branch (60 seconds, Free Tier):'));
  console.log('  1. Open Neon Console: https://console.neon.tech');
  console.log('  2. In your LogiSphere project, navigate to "Branches" -> "Create Branch".');
  console.log('  3. Name the branch: validation (branched from main).');
  console.log('  4. Copy the Pooled connection string.');
  console.log('  5. Add to .env.neon:');
  console.log(
    cyan(
      '     NEON_VALIDATION_DATABASE_URL="postgresql://user:pass@ep-validation-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"\n'
    )
  );
  console.log('Once added, re-run: npm run test:e2e:neon\n');
}

function probeUrl(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/health', timeout: 2000 }, (res) =>
      resolve(res.statusCode === 200)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForGateway(port, maxWaitSec = 60) {
  const start = Date.now();
  while (Date.now() - start < maxWaitSec * 1000) {
    if (await probeUrl(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function runNeonValidation() {
  console.log(bold(cyan('\n==================================================================')));
  console.log(bold(cyan('      LogiSphere — Neon Cloud E2E Automated Validation Runner    ')));
  console.log(bold(cyan('==================================================================\n')));

  if (!validationDbUrl) {
    printBranchInstruction();
    process.exit(1);
  }

  // Prevent accidental execution against main database
  if (
    process.env.NEON_DATABASE_URL &&
    validationDbUrl === process.env.NEON_DATABASE_URL &&
    !process.argv.includes('--force')
  ) {
    console.error(
      red(
        '[ERROR] NEON_VALIDATION_DATABASE_URL is identical to NEON_DATABASE_URL.\n' +
          'E2E tests create test users and organizations. To prevent pollution of the main\n' +
          'database, use a dedicated Neon branch (e.g. branch "validation").\n' +
          'To bypass this check intentionally, append --force.\n'
      )
    );
    process.exit(1);
  }

  console.log(`${green('✓')} Validation database URL configured.`);
  console.log(
    `Endpoint: ${validationDbUrl.split('@')[1] ? validationDbUrl.split('@')[1].split('/')[0] : 'masked'}`
  );

  // Step 1: Run migrations on the validation branch
  console.log('\n[Step 1/4] Running sequential migrations on validation branch...');
  try {
    execSync('node scripts/migrate-all.js --neon', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: directValidationUrl || validationDbUrl,
        DIRECT_URL: directValidationUrl || validationDbUrl,
        FORCE_BASE_DB_URL: 'true',
        TARGET_DB: 'neon',
        USE_NEON: 'true',
      },
    });
    console.log(`${green('✓')} Validation branch migrations complete.`);
  } catch (err) {
    console.error(red(`[ERROR] Validation migrations failed: ${err.message}`));
    process.exit(1);
  }

  // Step 2: Seed Platform Admin on the validation branch
  console.log('\n[Step 2/4] Seeding Platform Admin on validation branch...');
  try {
    execSync('node services/auth-service/scripts/seedAdmin.js --neon', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: `${validationDbUrl}&schema=app_auth`,
        FORCE_BASE_DB_URL: 'true',
        TARGET_DB: 'neon',
        USE_NEON: 'true',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@logisphere.local',
        ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD || 'TestAdminValidationPass123!',
      },
    });
    console.log(`${green('✓')} Platform Admin seeded on validation branch.`);
  } catch (err) {
    console.error(red(`[ERROR] Admin seeding failed: ${err.message}`));
    process.exit(1);
  }

  // Step 3: Spawn temporary orchestrator pointing to validation branch
  const testGatewayPort = 5500;
  console.log(`\n[Step 3/4] Launching backend test stack on port ${testGatewayPort}...`);

  const orchestratorProc = spawn(process.execPath, ['scripts/render-orchestrator.js'], {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(testGatewayPort),
      DATABASE_URL: validationDbUrl,
      DIRECT_URL: directValidationUrl || validationDbUrl,
      SKIP_STARTUP_MIGRATIONS: 'true',
    },
  });

  orchestratorProc.stdout.on('data', (d) => {
    process.stdout.write(d);
  });

  orchestratorProc.stderr.on('data', (d) => {
    process.stderr.write(d);
  });

  const cleanup = () => {
    console.log('\n[CLEANUP] Stopping temporary validation services...');
    try {
      orchestratorProc.kill('SIGTERM');
    } catch {
      // ignore
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('Waiting for test Gateway health probe...');
  const isUp = await waitForGateway(testGatewayPort, 90);

  if (!isUp) {
    console.error(
      red(`[ERROR] Test Gateway did not become healthy on port ${testGatewayPort} within 90s.`)
    );
    cleanup();
    process.exit(1);
  }

  console.log(`${green('✓')} Validation Gateway is UP on http://127.0.0.1:${testGatewayPort}`);

  // Step 4: Run the 40-assertion E2E test suite
  console.log('\n[Step 4/4] Executing Master 40-Assertion E2E Test Suite against Neon...');
  let testExitCode = 0;
  try {
    execSync(`node scripts/e2e-test.js`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        GATEWAY_URL: `http://127.0.0.1:${testGatewayPort}`,
      },
    });
    console.log(
      bold(green('\n=================================================================='))
    );
    console.log(bold(green('  NEON LIVE CLOUD VALIDATION PASSED: ALL 40/40 ASSERTIONS SUCCESS! ')));
    console.log(
      bold(green('==================================================================\n'))
    );
  } catch (err) {
    testExitCode = err.status || 1;
    console.error(bold(red(`\n[FAIL] Neon E2E validation failed with exit code ${testExitCode}`)));
  } finally {
    cleanup();
  }

  process.exit(testExitCode);
}

runNeonValidation().catch((err) => {
  console.error(red(`[FATAL] Neon validation runner encountered unexpected error: ${err.message}`));
  process.exit(1);
});
