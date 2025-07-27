const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedRoles() {
  try {
    console.log('🌱 Seeding roles and super admin user...');

    // Create roles
    const roles = [
      { name: 'SUPER_ADMIN', description: 'Full system access and role management' },
      { name: 'ADMIN', description: 'Administrative access to all features' },
      { name: 'INSTRUCTOR', description: 'Flight instruction and student management' },
      { name: 'PILOT', description: 'Pilot access to flight planning and records' },
      { name: 'STUDENT', description: 'Student access to learning materials and scheduling' },
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: role,
        create: role,
      });
      console.log(`✅ Role ${role.name} created/updated`);
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@cruiseraviation.com' },
      update: {},
      create: {
        email: 'admin@cruiseraviation.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        personalNumber: 'ADMIN001',
        status: 'ACTIVE',
      },
    });

    // Assign SUPER_ADMIN role to the user
    const superAdminRole = await prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (superAdminRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: superAdmin.id,
            roleId: superAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        },
      });
      console.log('✅ Super admin user created with SUPER_ADMIN role');
    }

    console.log('🎉 Seeding completed successfully!');
    console.log('📧 Super Admin Email: admin@cruiseraviation.com');
    console.log('🔑 Super Admin Password: admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRoles(); 