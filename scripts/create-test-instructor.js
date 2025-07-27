const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestInstructor() {
  try {
    // Check if test instructor already exists
    const existingInstructor = await prisma.user.findUnique({
      where: { email: 'instructor@test.com' },
    });

    if (existingInstructor) {
      console.log('Test instructor already exists:', existingInstructor.email);
      return existingInstructor;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create test instructor user
    const instructor = await prisma.user.create({
      data: {
        email: 'instructor@test.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Instructor',
        status: 'ACTIVE',
        totalFlightHours: 1500,
        instructorRating: 'CFI',
      },
    });

    // Get INSTRUCTOR role
    const instructorRole = await prisma.role.findUnique({
      where: { name: 'INSTRUCTOR' },
    });

    if (!instructorRole) {
      console.error('INSTRUCTOR role not found. Please run the seed script first.');
      return;
    }

    // Assign INSTRUCTOR role to user
    await prisma.userRole.create({
      data: {
        userId: instructor.id,
        roleId: instructorRole.id,
        assignedAt: new Date(),
      },
    });

    console.log('✅ Test instructor created successfully!');
    console.log('Email: instructor@test.com');
    console.log('Password: password123');
    console.log('Role: INSTRUCTOR');
    console.log('User ID:', instructor.id);

    return instructor;
  } catch (error) {
    console.error('Error creating test instructor:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestInstructor(); 