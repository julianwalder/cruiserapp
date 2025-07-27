const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importComprehensiveIcaoData() {
  console.log('🌱 Importing comprehensive ICAO aircraft data...');
  
  try {
    // Read the comprehensive ICAO data
    const dataPath = path.join(__dirname, 'icao-aircraft-complete.json');
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Comprehensive ICAO data file not found.');
      return;
    }
    
    const aircraftData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📊 Loaded ${aircraftData.length} aircraft records from comprehensive data`);
    
    // Clear existing ICAO reference types
    console.log('🧹 Clearing existing ICAO reference types...');
    await prisma.iCAOReferenceType.deleteMany({});
    console.log('✅ Cleared existing ICAO reference types');
    
    // Process and insert data
    const batchSize = 100;
    const totalBatches = Math.ceil(aircraftData.length / batchSize);
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`📦 Processing ${aircraftData.length} aircraft in ${totalBatches} batches...`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, aircraftData.length);
      const batch = aircraftData.slice(start, end);
      
      console.log(`📊 Processing batch ${i + 1}/${totalBatches} (${batch.length} items)`);
      
      for (const aircraft of batch) {
        try {
          // Parse the description JSON to extract model name
          let modelName = aircraft.model || 'Unknown';
          let manufacturerName = aircraft.manufacturer || 'Unknown';
          
          if (aircraft.description && aircraft.description.startsWith('{')) {
            try {
              const descData = JSON.parse(aircraft.description);
              if (descData.ModelFullName) {
                modelName = descData.ModelFullName;
              }
              if (descData.ManufacturerCode) {
                manufacturerName = descData.ManufacturerCode;
              }
            } catch (parseError) {
              // Use fallback values if JSON parsing fails
            }
          }
          
          // Map engine types
          let engineType = 'PISTON';
          if (aircraft.engineType === 'TURBOFAN') engineType = 'TURBOFAN';
          else if (aircraft.engineType === 'TURBOPROP') engineType = 'TURBOPROP';
          else if (aircraft.engineType === 'TURBOSHAFT') engineType = 'TURBOSHAFT';
          else if (aircraft.engineType === 'ELECTRIC') engineType = 'ELECTRIC';
          else if (aircraft.engineType === 'HYBRID') engineType = 'HYBRID';
          
          // Map wake turbulence categories
          let wtc = 'LIGHT';
          if (aircraft.wakeTurbulenceCategory === 'MEDIUM') wtc = 'MEDIUM';
          else if (aircraft.wakeTurbulenceCategory === 'HEAVY') wtc = 'HEAVY';
          else if (aircraft.wakeTurbulenceCategory === 'SUPER') wtc = 'SUPER';
          
          await prisma.iCAOReferenceType.create({
            data: {
              typeDesignator: aircraft.icaoTypeDesignator,
              manufacturer: manufacturerName,
              model: modelName,
              description: aircraft.description || '',
              engineType: engineType,
              engineCount: aircraft.engineCount || 1,
              wtc: wtc
            }
          });
          
          successCount++;
        } catch (error) {
          errorCount++;
          if (errorCount <= 10) { // Only show first 10 errors to avoid spam
            console.log(`⚠️ Error importing ${aircraft.icaoTypeDesignator}: ${error.message}`);
          }
        }
      }
      
      console.log(`✅ Batch ${i + 1}/${totalBatches} completed. Success: ${successCount}, Errors: ${errorCount}`);
    }
    
    // Final summary
    console.log('\n🎉 Import completed!');
    console.log(`✅ Successfully imported: ${successCount} aircraft types`);
    console.log(`❌ Errors: ${errorCount} aircraft types`);
    console.log(`📊 Total ICAO types in database: ${await prisma.iCAOReferenceType.count()}`);
    
    // Show some sample data
    console.log('\n📋 Sample imported aircraft types:');
    const samples = await prisma.iCAOReferenceType.findMany({
      take: 10,
      orderBy: { typeDesignator: 'asc' }
    });
    
    samples.forEach(aircraft => {
      console.log(`  ${aircraft.typeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
    });
    
  } catch (error) {
    console.error('❌ Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importComprehensiveIcaoData(); 