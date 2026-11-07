const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Check if Neon validation was explicitly requested
const isNeon =
  process.argv.includes('--neon') ||
  process.env.TARGET_DB === 'neon' ||
  process.env.USE_NEON === 'true';

if (isNeon) {
  const neonEnvPath = path.resolve(__dirname, '../../../.env.neon');
  if (fs.existsSync(neonEnvPath)) {
    dotenv.config({ path: neonEnvPath, override: true });
    console.info('[BOOTSTRAP] Target database: Neon Serverless PostgreSQL (.env.neon loaded)');
  } else {
    console.error(`✗ [BOOTSTRAP ERROR] .env.neon not found at ${neonEnvPath}`);
    process.exit(1);
  }

  const rawUrl = process.env.NEON_DATABASE_URL || '';
  if (rawUrl.includes('YOUR-ENDPOINT') || rawUrl.includes('USER:PASSWORD')) {
    console.error('✗ [BOOTSTRAP ERROR] .env.neon still contains placeholder values.');
    console.error(
      '  Please replace them with your actual Neon database credentials in .env.neon before running with --neon.'
    );
    process.exit(1);
  }

  let neonUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (neonUrl) {
    if (neonUrl.includes('schema=')) {
      neonUrl = neonUrl.replace(/schema=[^&]+/, 'schema=app_auth');
    } else if (neonUrl.includes('?')) {
      neonUrl = `${neonUrl}&schema=app_auth`;
    } else {
      neonUrl = `${neonUrl}?schema=app_auth`;
    }
    process.env.DATABASE_URL = neonUrl;
  }
}

const prisma = require('../src/database/prisma');
const config = require('../src/config');
const { hashPassword } = require('../src/utils/passwordUtils');

const seedAdmin = async () => {
  const { email, password, fullName } = config.adminBootstrap;

  console.info(`[BOOTSTRAP] Checking Platform Admin existence for: ${email}`);

  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      console.info(
        `[BOOTSTRAP] Platform Admin with email '${email}' already exists. Updating credentials to match current configuration.`
      );
      const passwordHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          fullName: fullName || existing.fullName,
        },
      });
      console.info('✓ [BOOTSTRAP SUCCESS] Platform Admin credentials updated successfully.');
      return;
    }

    const passwordHash = await hashPassword(password);

    const admin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        role: 'PLATFORM_ADMIN',
        mustChangePassword: true,
      },
    });

    console.info(`✓ [BOOTSTRAP SUCCESS] Platform Admin created successfully (ID: ${admin.id}).`);
    console.info('✓ User will be required to change password on first login.');
  } catch (error) {
    console.error(`✗ [BOOTSTRAP ERROR] Failed to seed Platform Admin: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  seedAdmin();
}

module.exports = { seedAdmin };
