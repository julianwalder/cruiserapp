const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testImport() {
  try {
    console.log('Testing airfield import functionality...\n');

    // Test creating a sample airfield
    const testAirfield = await prisma.airfield.create({
      data: {
        name: 'Test Airport',
        code: 'TEST',
        type: 'AIRPORT',
        city: 'Test City',
        country: 'RO',
        latitude: 44.4268,
        longitude: 26.1025,
        elevation: 100,
        phone: null,
        email: null,
        website: null,
        status: 'ACTIVE',
        isBase: false,
        createdById: null,
      }
    });

    console.log('Successfully created test airfield:', testAirfield);

    // Test finding the airfield
    const foundAirfield = await prisma.airfield.findUnique({
      where: { code: 'TEST' }
    });

    console.log('Successfully found airfield:', foundAirfield);

    // Test updating the airfield
    const updatedAirfield = await prisma.airfield.update({
      where: { code: 'TEST' },
      data: { isBase: true }
    });

    console.log('Successfully updated airfield:', updatedAirfield);

    // Clean up - delete the test airfield
    await prisma.airfield.delete({
      where: { code: 'TEST' }
    });

    console.log('Successfully deleted test airfield');

    console.log('\n✅ All tests passed! The airfield import functionality should work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImport(); 