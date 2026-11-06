const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.neon') });

const { PrismaClient } = require('@prisma/client');

let rawUrl = process.env.NEON_DATABASE_URL || '';
if (rawUrl.includes('schema=')) {
  rawUrl = rawUrl.replace(/schema=[^&]+/, 'schema=app_auth');
} else if (rawUrl.includes('?')) {
  rawUrl = `${rawUrl}&schema=app_auth`;
} else {
  rawUrl = `${rawUrl}?schema=app_auth`;
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: rawUrl },
  },
});

async function verify() {
  console.log('Connecting to Neon PostgreSQL via pooled connection...');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  console.log('✓ Successfully connected to Neon via pooled connection!');
  console.log('\n--- Seeded Platform Admin in Neon app_auth.users ---');
  console.log(users);

  // Inspect existing schemas
  const schemas = await prisma.$queryRawUnsafe(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name IN ('app_auth', 'shipment', 'fleet', 'tracking', 'notification')
    ORDER BY schema_name;
  `);
  console.log('\n--- Verified Schemas in Neon ---');
  schemas.forEach((s) => console.log('  Schema:', s.schema_name));

  // Inspect existing tables
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema IN ('app_auth', 'shipment', 'fleet', 'tracking', 'notification')
    ORDER BY table_schema, table_name;
  `);
  console.log(`\n--- Verified Tables in Neon (${tables.length} total) ---`);
  tables.forEach((t) => console.log(`  ${t.table_schema}.${t.table_name}`));

  await prisma.$disconnect();
}

verify().catch((err) => {
  console.error('✗ Verification error:', err.message);
  process.exit(1);
});
