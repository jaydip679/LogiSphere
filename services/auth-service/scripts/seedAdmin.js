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
