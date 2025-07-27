const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importIcaoAircraft() {
  console.log('🚀 Starting ICAO Reference Type Import...');
  
  try {
    // Read the transformed data
    const dataPath = path.join(__dirname, 'icao-transformed-data.json');
    const statsPath = path.join(__dirname, 'icao-stats-data.json');
    
    if (!fs.existsSync(dataPath)) {
      throw new Error('icao-transformed-data.json not found. Please run the scraper first.');
    }
    
    if (!fs.existsSync(statsPath)) {
      throw new Error('icao-stats-data.json not found. Please run the scraper first.');
    }
    
    const aircraftData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const statsData = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    
    console.log(`📊 Found ${aircraftData.length} ICAO reference entries to import`);
    console.log(`📅 Last Updated: ${statsData.LastUpdated}`);
    console.log(`📅 Next Scheduled Update: ${statsData.NextUpdate}`);
    
    // Clear existing ICAO reference types
    console.log('🧹 Clearing existing ICAOReferenceType entries...');
    await prisma.iCAOReferenceType.deleteMany({});
    console.log('✅ Cleared existing ICAOReferenceType entries');
    
    // Import new data
    let imported = 0;
    let errors = 0;
    for (const entry of aircraftData) {
      try {
        await prisma.iCAOReferenceType.create({
          data: {
            manufacturer: entry.manufacturer,
            model: entry.model,
            typeDesignator: entry.typeDesignator,
            description: entry.description,
            engineType: entry.engineType,
            engineCount: parseInt(entry.engineCount) || 1,
            wtc: entry.wtc,
          }
        });
        imported++;
      } catch (error) {
        console.error(`❌ Error importing ${entry.typeDesignator}:`, error.message);
        errors++;
      }
    }
    
    // Save import summary
    const importSummary = {
      timestamp: new Date().toISOString(),
      totalEntries: aircraftData.length,
      imported: imported,
      errors: errors,
      lastUpdated: statsData.LastUpdated,
      nextScheduledUpdate: statsData.NextUpdate,
      success: errors === 0
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'icao-import-summary.json'),
      JSON.stringify(importSummary, null, 2)
    );
    
    console.log('\n🎉 ICAO Reference Type Import Completed!');
    console.log(`📊 Summary:`);
    console.log(`   - Total entries: ${aircraftData.length}`);
    console.log(`   - Successfully imported: ${imported}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Last Updated: ${statsData.LastUpdated}`);
    console.log(`   - Next Scheduled Update: ${statsData.NextUpdate}`);
    
    return importSummary;
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import if called directly
if (require.main === module) {
  importIcaoAircraft()
    .then(() => {
      console.log('✅ Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importIcaoAircraft }; 