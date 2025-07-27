const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function updateIcaoData() {
  console.log('🚀 Starting ICAO data update (v6)...');
  
  try {
    // Read the extracted aircraft data
    const dataPath = path.join(__dirname, 'icao-aircraft-extracted-v6.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('ICAO aircraft data file not found. Please run the scraper first.');
    }
    
    const aircraftData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📊 Loaded ${aircraftData.length} aircraft records`);
    
    // Clear existing ICAO reference data
    console.log('🧹 Clearing existing ICAO reference data...');
    await prisma.aircraft.deleteMany({
      where: {
        status: 'REFERENCE'
      }
    });
    
    console.log('✅ Cleared existing reference data');
    
    // Transform and insert new data
    console.log('📝 Inserting new ICAO data...');
    let insertedCount = 0;
    let skippedCount = 0;
    
    for (const aircraft of aircraftData) {
      try {
        // Transform the data to match our schema
        const aircraftRecord = {
          registration: `REF-${aircraft.Designator}-${aircraft.ManufacturerCode}-${aircraft.ModelFullName.replace(/[^a-zA-Z0-9]/g, '')}`.substring(0, 20),
          icaoTypeDesignator: aircraft.Designator,
          manufacturer: aircraft.ManufacturerCode,
          model: aircraft.ModelFullName,
          description: aircraft.AircraftDescription || null,
          engineType: mapEngineType(aircraft.EngineType),
          engineCount: parseInt(aircraft.EngineCount) || 1,
          wakeTurbulenceCategory: mapWakeTurbulenceCategory(aircraft.WTC),
          status: 'REFERENCE',
          totalFlightHours: 0,
          isIcaoReference: true
        };
        
        await prisma.aircraft.create({
          data: aircraftRecord
        });
        
        insertedCount++;
        
        if (insertedCount % 100 === 0) {
          console.log(`📊 Processed ${insertedCount} records...`);
        }
        
      } catch (error) {
        console.log(`⚠️ Error inserting aircraft ${aircraft.Designator}/${aircraft.ModelFullName}: ${error.message}`);
        skippedCount++;
      }
    }
    
    console.log('✅ ICAO data update completed!');
    console.log(`📊 Total inserted: ${insertedCount}`);
    console.log(`⚠️ Total skipped: ${skippedCount}`);
    
    // Create a summary
    const summary = {
      totalProcessed: aircraftData.length,
      totalInserted: insertedCount,
      totalSkipped: skippedCount,
      updateDate: new Date().toISOString(),
      uniqueIcaoTypes: new Set(aircraftData.map(a => a.Designator)).size,
      uniqueManufacturers: new Set(aircraftData.map(a => a.ManufacturerCode)).size
    };
    
    const summaryPath = path.join(__dirname, 'icao-update-summary-v6.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Update summary saved to ${summaryPath}`);
    
    // Test the CRUZ data specifically
    console.log('🔍 Testing CRUZ data...');
    const cruzData = await prisma.aircraft.findMany({
      where: {
        icaoTypeDesignator: 'CRUZ',
        status: 'REFERENCE'
      },
      select: {
        icaoTypeDesignator: true,
        manufacturer: true,
        model: true,
        engineType: true,
        engineCount: true,
        wakeTurbulenceCategory: true
      },
      orderBy: {
        manufacturer: 'asc'
      }
    });
    
    console.log(`📊 Found ${cruzData.length} CRUZ records:`);
    cruzData.forEach(record => {
      console.log(`  - ${record.manufacturer}: ${record.model} (${record.engineType}, ${record.engineCount} engine, ${record.wakeTurbulenceCategory})`);
    });
    
  } catch (error) {
    console.error('❌ Error during ICAO data update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function mapEngineType(engineType) {
  const mapping = {
    'Piston': 'PISTON',
    'Jet': 'JET',
    'Turboprop': 'TURBOPROP',
    'Turbofan': 'TURBOFAN',
    'Turboshaft': 'TURBOSHAFT',
    'Electric': 'ELECTRIC',
    'Hybrid': 'HYBRID'
  };
  
  return mapping[engineType] || 'PISTON';
}

function mapWakeTurbulenceCategory(wtc) {
  const mapping = {
    'L': 'LIGHT',
    'M': 'MEDIUM',
    'H': 'HEAVY',
    'J': 'SUPER'
  };
  
  return mapping[wtc] || 'LIGHT';
}

// Run the update
if (require.main === module) {
  updateIcaoData().catch(console.error);
}

module.exports = { updateIcaoData }; 