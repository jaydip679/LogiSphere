const { execSync } = require('child_process');

const SERVICES = [
  'auth-service',
  'shipment-service',
  'fleet-dispatch-service',
  'tracking-service',
  'notification-service',
];

console.log('Generating Prisma Clients for all 5 microservices with isolated outputs...');
for (const svc of SERVICES) {
  const schemaPath = `./services/${svc}/prisma/schema.prisma`;
  console.log(`\n--> Generating client for ${svc}...`);
  execSync(`npx prisma generate --schema=${schemaPath}`, {
    stdio: 'inherit',
    env: process.env,
  });
}
console.log('\n[SUCCESS] All Prisma clients generated successfully.');
