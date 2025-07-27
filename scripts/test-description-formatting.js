const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Function to format aircraft description from JSON (same as in the API)
const formatAircraftDescription = (description) => {
  if (!description) return '';
  
  try {
    // Check if it's JSON
    if (description.startsWith('{')) {
      const descData = JSON.parse(description);
      if (descData.AircraftDescription) {
        // Format the aircraft description properly
        const aircraftDesc = descData.AircraftDescription;
        switch (aircraftDesc.toLowerCase()) {
          case 'landplane':
            return 'Landplane';
          case 'seaplane':
            return 'Seaplane';
          case 'amphibian':
            return 'Amphibian';
          case 'helicopter':
            return 'Helicopter';
          case 'gyrocopter':
            return 'Gyrocopter';
          case 'glider':
            return 'Glider';
          case 'poweredglider':
            return 'Powered Glider';
          case 'airship':
            return 'Airship';
          case 'balloon':
            return 'Balloon';
          case 'ultralight':
            return 'Ultralight';
          default:
            return aircraftDesc;
        }
      }
      // If no AircraftDescription, try to use Description field
      if (descData.Description) {
        return descData.Description;
      }
    }
    
    // If not JSON, return as is
    return description;
  } catch (error) {
    // If JSON parsing fails, return original description
    return description;
  }
};

async function testDescriptionFormatting() {
  console.log('🧪 Testing aircraft description formatting...');
  
  try {
    // Test CRUZ entries specifically
    const cruzEntries = await prisma.iCAOReferenceType.findMany({
      where: { typeDesignator: 'CRUZ' },
      take: 5
    });
    
    console.log('\n📋 CRUZ entries with formatted descriptions:');
    cruzEntries.forEach((entry, index) => {
      const originalDesc = entry.description;
      const formattedDesc = formatAircraftDescription(entry.description);
      
      console.log(`\n${index + 1}. ${entry.typeDesignator} - ${entry.manufacturer} ${entry.model}`);
      console.log(`   Original: ${originalDesc.substring(0, 100)}...`);
      console.log(`   Formatted: ${formattedDesc}`);
    });
    
    // Test a few other aircraft types
    const otherEntries = await prisma.iCAOReferenceType.findMany({
      where: {
        typeDesignator: {
          in: ['C172', 'A320', 'R22', 'ASK21']
        }
      },
      take: 4
    });
    
    console.log('\n📋 Other aircraft types with formatted descriptions:');
    otherEntries.forEach((entry, index) => {
      const formattedDesc = formatAircraftDescription(entry.description);
      console.log(`${index + 1}. ${entry.typeDesignator} - ${entry.manufacturer} ${entry.model}: ${formattedDesc}`);
    });
    
    // Test different aircraft categories
    console.log('\n📋 Testing different aircraft categories:');
    const categories = [
      { search: 'LandPlane', expected: 'Landplane' },
      { search: 'Seaplane', expected: 'Seaplane' },
      { search: 'Amphibian', expected: 'Amphibian' },
      { search: 'Helicopter', expected: 'Helicopter' },
      { search: 'Glider', expected: 'Glider' }
    ];
    
    for (const category of categories) {
      const sample = await prisma.iCAOReferenceType.findFirst({
        where: {
          description: {
            contains: category.search
          }
        }
      });
      
      if (sample) {
        const formattedDesc = formatAircraftDescription(sample.description);
        console.log(`   ${category.search} → ${formattedDesc} (expected: ${category.expected})`);
      }
    }
    
    console.log('\n✅ Description formatting test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDescriptionFormatting(); 