const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Check if Neon validation was explicitly requested via CLI flag or environment
const isNeon =
  process.argv.includes('--neon') ||
  process.env.TARGET_DB === 'neon' ||
  process.env.USE_NEON === 'true';

if (isNeon) {
  const neonEnvPath = path.resolve(__dirname, '../.env.neon');
  if (fs.existsSync(neonEnvPath)) {
    dotenv.config({ path: neonEnvPath, override: true });
    console.info('[MIGRATION] Target database: Neon Serverless PostgreSQL (.env.neon loaded)');
  } else {
    console.error(`✗ [MIGRATION ERROR] .env.neon not found at ${neonEnvPath}`);
    process.exit(1);
  }

  const rawUrl = process.env.NEON_DATABASE_URL || '';
  if (rawUrl.includes('YOUR-ENDPOINT') || rawUrl.includes('USER:PASSWORD')) {
    console.error('✗ [MIGRATION ERROR] .env.neon still contains placeholder values.');
    console.error('  Please replace them with your actual Neon database credentials in .env.neon before running with --neon.');
    process.exit(1);
  }

  if (process.env.NEON_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
  }
  if (process.env.NEON_DIRECT_URL) {
    process.env.DIRECT_URL = process.env.NEON_DIRECT_URL;
  }
} else {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const SERVICES = [
  { name: 'auth-service', schema: 'app_auth' },
  { name: 'shipment-service', schema: 'shipment' },
  { name: 'fleet-dispatch-service', schema: 'fleet' },
  { name: 'tracking-service', schema: 'tracking' },
  { name: 'notification-service', schema: 'notification' },
];

const runMigrations = () => {
  const nonFlagArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const mode = nonFlagArgs[0] || 'deploy'; // deploy or dev
  console.info(`Starting centralized Prisma database migration runner [mode: ${mode}]...`);

  for (const service of SERVICES) {
    const serviceDir = path.resolve(__dirname, `../services/${service.name}`);
    const schemaPath = path.join(serviceDir, 'prisma', 'schema.prisma');

    if (!fs.existsSync(schemaPath)) {
      console.warn(`[SKIP] No schema.prisma found for ${service.name} at ${schemaPath}`);
      continue;
    }

    console.info(`\n--> Migrating schema '${service.schema}' in ${service.name}...`);
    try {
      // Determine service-specific DATABASE_URL targeting the dedicated PostgreSQL schema
      const schemaEnvKey = `DATABASE_URL_${service.schema.toUpperCase()}`;
      let serviceDbUrl = process.env[schemaEnvKey];
      if (!serviceDbUrl && service.schema === 'app_auth') {
        serviceDbUrl = process.env.DATABASE_URL_AUTH;
      }

      if (!serviceDbUrl && process.env.DATABASE_URL) {
        const base = process.env.DATABASE_URL;
        if (base.includes('schema=')) {
          serviceDbUrl = base.replace(/schema=[^&]+/, `schema=${service.schema}`);
        } else if (base.includes('?')) {
          serviceDbUrl = `${base}&schema=${service.schema}`;
        } else {
          serviceDbUrl = `${base}?schema=${service.schema}`;
        }
      }

      if (!serviceDbUrl) {
        serviceDbUrl = `postgresql://postgres:postgres@localhost:5432/logisphere?schema=${service.schema}`;
      }

      // Determine service-specific DIRECT_URL for unpooled DDL operations (Neon/PgBouncer)
      const directSchemaEnvKey = `DIRECT_URL_${service.schema.toUpperCase()}`;
      let serviceDirectUrl = process.env[directSchemaEnvKey];
      if (!serviceDirectUrl && service.schema === 'app_auth') {
        serviceDirectUrl = process.env.DIRECT_URL_AUTH;
      }

      if (!serviceDirectUrl && process.env.DIRECT_URL) {
        const directBase = process.env.DIRECT_URL;
        if (directBase.includes('schema=')) {
          serviceDirectUrl = directBase.replace(/schema=[^&]+/, `schema=${service.schema}`);
        } else if (directBase.includes('?')) {
          serviceDirectUrl = `${directBase}&schema=${service.schema}`;
        } else {
          serviceDirectUrl = `${directBase}?schema=${service.schema}`;
        }
      }

      if (!serviceDirectUrl) {
        serviceDirectUrl = serviceDbUrl;
      }

      const migrationsDir = path.join(serviceDir, 'prisma', 'migrations');
      const hasMigrations =
        fs.existsSync(migrationsDir) &&
        fs.readdirSync(migrationsDir).filter((f) => !f.startsWith('.')).length > 0;

      let command;
      if (mode === 'dev') {
        command = 'npx prisma migrate dev';
      } else if (hasMigrations) {
        command = 'npx prisma migrate deploy';
      } else {
        command = 'npx prisma db push --skip-generate';
      }

      execSync(command, {
        cwd: serviceDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: serviceDbUrl,
          DIRECT_URL: serviceDirectUrl,
          DATABASE_SCHEMA: service.schema,
        },
      });
      console.info(`✓ Successfully migrated ${service.name} (${service.schema})`);
    } catch (error) {
      console.error(`✗ Migration failed for ${service.name} (${service.schema}): ${error.message}`);
      process.exit(1);
    }
  }

  console.info('\n✓ Centralized migrations completed successfully across all service schemas.');
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
