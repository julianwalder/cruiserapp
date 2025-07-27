import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system access' },
    { name: 'ADMIN', description: 'Administrator with management permissions' },
    { name: 'PILOT', description: 'Pilot with flight operations access' },
    { name: 'STUDENT', description: 'Student pilot with limited access' },
    { name: 'INSTRUCTOR', description: 'Flight instructor with teaching permissions' },
    { name: 'BASE_MANAGER', description: 'Base manager with operational area access' },
    { name: 'PROSPECT', description: 'Prospective student or customer with limited access' },
  ];

  console.log('Creating roles...');
  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
    console.log(`Created/updated role: ${roleData.name}`);
  }

  // Create users
  const users = [
    {
      email: 'admin@cruiserapp.com',
      password: 'admin123',
      firstName: 'Super',
      lastName: 'Admin',
      roles: ['SUPER_ADMIN'],
      phone: '+1234567890',
      address: '123 Admin Street',
      city: 'Admin City',
      state: 'AS',
      zipCode: '12345',
      country: 'US',
    },
    {
      email: 'pilot@cruiserapp.com',
      password: 'pilot123',
      firstName: 'John',
      lastName: 'Pilot',
      roles: ['PILOT'],
      phone: '+1234567891',
      address: '456 Pilot Avenue',
      city: 'Pilot City',
      state: 'PC',
      zipCode: '54321',
      country: 'US',
      licenseNumber: 'PPL-123456',
      medicalClass: 'Class 2',
      totalFlightHours: 250.5,
    },
    {
      email: 'instructor@cruiserapp.com',
      password: 'instructor123',
      firstName: 'Sarah',
      lastName: 'Instructor',
      roles: ['INSTRUCTOR'],
      phone: '+1234567892',
      address: '789 Instructor Road',
      city: 'Instructor City',
      state: 'IC',
      zipCode: '98765',
      country: 'US',
      licenseNumber: 'CFI-789012',
      medicalClass: 'Class 1',
      totalFlightHours: 1200.0,
      instructorRating: 'CFI, CFII, MEI',
    },
    {
      email: 'student@cruiserapp.com',
      password: 'student123',
      firstName: 'Mike',
      lastName: 'Student',
      roles: ['STUDENT'],
      phone: '+1234567893',
      address: '321 Student Lane',
      city: 'Student City',
      state: 'SC',
      zipCode: '11111',
      country: 'US',
      licenseNumber: 'Student-456789',
      medicalClass: 'Class 3',
      totalFlightHours: 45.0,
    },
  ];

  console.log('Creating users...');
  for (const userData of users) {
    console.log(`Creating user: ${userData.email}`);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        status: 'ACTIVE',
        phone: userData.phone,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        zipCode: userData.zipCode,
        country: userData.country,
        licenseNumber: userData.licenseNumber,
        medicalClass: userData.medicalClass,
        totalFlightHours: userData.totalFlightHours,
        instructorRating: userData.instructorRating,
      },
    });

    // Assign roles to user
    for (const roleName of userData.roles) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (!role) {
        console.error(`Role ${roleName} not found for user ${userData.email}`);
        continue;
      }

      // Check if user already has this role
      const existingUserRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: role.id,
        },
      });

      if (!existingUserRole) {
        // Assign role to user
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: user.id, // Self-assigned for seed data
            assignedAt: new Date(),
          },
        });
        console.log(`Assigned role ${roleName} to user ${userData.email}`);
      }
    }
  }

  console.log('\n=== User Credentials ===');
  console.log('Super Admin:');
  console.log('  Email: admin@cruiserapp.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Pilot:');
  console.log('  Email: pilot@cruiserapp.com');
  console.log('  Password: pilot123');
  console.log('');
  console.log('Instructor:');
  console.log('  Email: instructor@cruiserapp.com');
  console.log('  Password: instructor123');
  console.log('');
  console.log('Student:');
  console.log('  Email: student@cruiserapp.com');
  console.log('  Password: student123');
  console.log('');
  console.log('Please change passwords after first login!');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 