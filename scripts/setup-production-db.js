const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupProductionDatabase() {
  try {
    console.log('🚀 Setting up production database...');

    // Run migrations
    console.log('📦 Running database migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Seed the database with initial data
    console.log('🌱 Seeding database with initial data...');
    await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "Role" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "UserRole" CASCADE`;

    // Create roles
    const roles = [
      { name: 'SUPER_ADMIN', description: 'Super Administrator' },
      { name: 'ADMIN', description: 'Administrator' },
      { name: 'BASE_MANAGER', description: 'Base Manager' },
      { name: 'INSTRUCTOR', description: 'Flight Instructor' },
      { name: 'PILOT', description: 'Pilot' },
      { name: 'STUDENT', description: 'Student Pilot' }
    ];

    for (const role of roles) {
      await prisma.role.create({
        data: role
      });
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@cruiseraviation.ro',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        status: 'ACTIVE',
        userRoles: {
          create: {
            role: {
              connect: {
                name: 'SUPER_ADMIN'
              }
            }
          }
        }
      }
    });

    console.log('✅ Production database setup complete!');
    console.log(`👤 Super admin user created: ${superAdmin.email}`);
    console.log('🔑 Default password: admin123');
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error setting up production database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupProductionDatabase();
}

module.exports = { setupProductionDatabase }; 