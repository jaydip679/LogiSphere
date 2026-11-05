const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVICES = [
  { name: 'auth-service', schema: 'auth' },
  { name: 'shipment-service', schema: 'shipment' },
  { name: 'fleet-dispatch-service', schema: 'fleet' },
  { name: 'tracking-service', schema: 'tracking' },
  { name: 'notification-service', schema: 'notification' },
];

const runMigrations = () => {
  const mode = process.argv[2] || 'deploy'; // deploy or dev
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
