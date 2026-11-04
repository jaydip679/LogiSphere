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
      const command = mode === 'dev' ? 'npx prisma migrate dev' : 'npx prisma migrate deploy';
      execSync(command, {
        cwd: serviceDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_SCHEMA: service.schema,
        },
      });
      console.info(`✓ Successfully migrated ${service.name} (${service.schema})`);
    } catch (error) {
      console.error(`✗ Migration failed for ${service.name} (${service.schema}):`, error.message);
      process.exit(1);
    }
  }

  console.info('\n✓ Centralized migrations completed successfully across all service schemas.');
};

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
