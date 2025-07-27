const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestPilot() {
  try {
    // Check if test pilot already exists
    const existingPilot = await prisma.user.findUnique({
      where: { email: 'pilot@test.com' },
    });

    if (existingPilot) {
      console.log('Test pilot already exists:', existingPilot.email);
      return existingPilot;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create test pilot user
    const pilot = await prisma.user.create({
      data: {
        email: 'pilot@test.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Pilot',
        status: 'ACTIVE',
        totalFlightHours: 0,
      },
    });

    // Get PILOT role
    const pilotRole = await prisma.role.findUnique({
      where: { name: 'PILOT' },
    });

    if (!pilotRole) {
      console.error('PILOT role not found. Please run the seed script first.');
      return;
    }

    // Assign PILOT role to user
    await prisma.userRole.create({
      data: {
        userId: pilot.id,
        roleId: pilotRole.id,
        assignedAt: new Date(),
      },
    });

    console.log('✅ Test pilot created successfully!');
    console.log('Email: pilot@test.com');
    console.log('Password: password123');
    console.log('Role: PILOT');
    console.log('User ID:', pilot.id);

    return pilot;
  } catch (error) {
    console.error('Error creating test pilot:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestPilot(); 