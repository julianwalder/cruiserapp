const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedIcaoDataV2() {
  console.log('🌱 Seeding ICAO aircraft data (v2) - with all manufacturers...');
  
  try {
    // Read the parsed data
    const parsedDataPath = path.join(__dirname, 'parsed-data-v2/parsed-aircraft.json');
    if (!fs.existsSync(parsedDataPath)) {
      console.log('❌ Parsed data file not found. Please run the parser first.');
      return;
    }
    
    const aircraftData = JSON.parse(fs.readFileSync(parsedDataPath, 'utf8'));
    console.log(`📊 Loaded ${aircraftData.length} aircraft records`);
    
    // Clear existing ICAO reference aircraft
    console.log('🧹 Clearing existing ICAO reference aircraft...');
    await prisma.aircraft.deleteMany({
      where: {
        isIcaoReference: true
      }
    });
    console.log('✅ Cleared existing ICAO reference aircraft');
    
    // Insert new ICAO data in batches
    const batchSize = 100;
    const totalBatches = Math.ceil(aircraftData.length / batchSize);
    
    console.log(`📦 Inserting ${aircraftData.length} aircraft in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, aircraftData.length);
      const batch = aircraftData.slice(start, end);
      
      const aircraftToInsert = batch.map(aircraft => ({
        registration: `ICAO-${aircraft.icaoTypeDesignator}-${aircraft.manufacturer.replace(/[^A-Z0-9]/g, '')}`,
        icaoTypeDesignator: aircraft.icaoTypeDesignator,
        manufacturer: aircraft.manufacturer,
        model: aircraft.model,
        description: aircraft.description,
        engineType: aircraft.engineType,
        engineCount: aircraft.engineCount,
        wakeTurbulenceCategory: aircraft.wakeTurbulenceCategory,
        status: 'REFERENCE',
        isIcaoReference: true,
        totalFlightHours: 0
      }));
      
      try {
        await prisma.aircraft.createMany({
          data: aircraftToInsert,
          skipDuplicates: true
        });
        
        console.log(`✅ Batch ${i + 1}/${totalBatches}: Inserted ${batch.length} aircraft`);
      } catch (error) {
        console.log(`⚠️ Batch ${i + 1}/${totalBatches}: Error inserting batch:`, error.message);
        
        // Try inserting one by one if batch fails
        console.log(`🔄 Retrying batch ${i + 1} one by one...`);
        let successCount = 0;
        
        for (const aircraft of aircraftToInsert) {
          try {
            await prisma.aircraft.create({
              data: aircraft
            });
            successCount++;
          } catch (individualError) {
            console.log(`⚠️ Failed to insert ${aircraft.registration}: ${individualError.message}`);
          }
        }
        
        console.log(`✅ Batch ${i + 1}/${totalBatches}: Inserted ${successCount}/${batch.length} aircraft individually`);
      }
    }
    
    // Verify the data
    console.log('\n🔍 Verifying seeded data...');
    
    const totalIcaoAircraft = await prisma.aircraft.count({
      where: {
        isIcaoReference: true
      }
    });
    
    const uniqueDesignators = await prisma.aircraft.groupBy({
      by: ['icaoTypeDesignator'],
      where: {
        isIcaoReference: true
      },
      _count: {
        icaoTypeDesignator: true
      }
    });
    
    const designatorsWithMultipleManufacturers = uniqueDesignators.filter(d => d._count.icaoTypeDesignator > 1);
    
    console.log(`📊 Verification Results:`);
    console.log(`✅ Total ICAO aircraft: ${totalIcaoAircraft}`);
    console.log(`✅ Unique designators: ${uniqueDesignators.length}`);
    console.log(`✅ Designators with multiple manufacturers: ${designatorsWithMultipleManufacturers.length}`);
    
    // Show sample of designators with multiple manufacturers
    console.log('\n📋 Sample designators with multiple manufacturers:');
    const sampleDesignators = designatorsWithMultipleManufacturers.slice(0, 10);
    
    for (const designator of sampleDesignators) {
      const manufacturers = await prisma.aircraft.findMany({
        where: {
          icaoTypeDesignator: designator.icaoTypeDesignator,
          isIcaoReference: true
        },
        select: {
          manufacturer: true
        }
      });
      
      const manufacturerNames = manufacturers.map(m => m.manufacturer).join(', ');
      console.log(`  ${designator.icaoTypeDesignator}: ${manufacturerNames}`);
    }
    
    // Get statistics
    const engineTypeStats = await prisma.aircraft.groupBy({
      by: ['engineType'],
      where: {
        isIcaoReference: true
      },
      _count: {
        engineType: true
      }
    });
    
    console.log('\n🔧 Engine Type Distribution:');
    engineTypeStats.forEach(stat => {
      console.log(`  ${stat.engineType}: ${stat._count.engineType}`);
    });
    
    const wakeTurbulenceStats = await prisma.aircraft.groupBy({
      by: ['wakeTurbulenceCategory'],
      where: {
        isIcaoReference: true
      },
      _count: {
        wakeTurbulenceCategory: true
      }
    });
    
    console.log('\n🌪️ Wake Turbulence Distribution:');
    wakeTurbulenceStats.forEach(stat => {
      console.log(`  ${stat.wakeTurbulenceCategory}: ${stat._count.wakeTurbulenceCategory}`);
    });
    
    console.log('\n🎉 ICAO data seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding ICAO data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedIcaoDataV2().catch(console.error);
}

module.exports = { seedIcaoDataV2 }; 