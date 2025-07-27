const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function seedIcaoParsedData() {
  console.log('🚁 Seeding parsed ICAO aircraft data...');
  
  try {
    // Read the parsed ICAO data
    const dataPath = path.join(__dirname, 'icao-aircraft-parsed.json');
    const rawData = await fs.readFile(dataPath, 'utf8');
    const aircraftData = JSON.parse(rawData);
    
    console.log(`📊 Found ${aircraftData.length} aircraft types to seed`);
    
    // Clear existing ICAO reference aircraft
    console.log('🧹 Clearing existing ICAO reference aircraft...');
    await prisma.aircraft.deleteMany({
      where: {
        isIcaoReference: true
      }
    });
    
    console.log('✅ Cleared existing ICAO reference aircraft');
    
    // Prepare data for seeding
    const seedData = aircraftData.map(aircraft => ({
      registration: `ICAO-${aircraft.icaoTypeDesignator}`,
      icaoTypeDesignator: aircraft.icaoTypeDesignator,
      manufacturer: aircraft.manufacturer || 'Unknown',
      model: aircraft.model || 'Unknown',
      description: aircraft.description || '',
      engineType: aircraft.engineType,
      engineCount: aircraft.engineCount,
      wakeTurbulenceCategory: aircraft.wakeTurbulenceCategory,
      totalFlightHours: 0,
      status: 'REFERENCE',
      isIcaoReference: true,
      notes: `ICAO Reference Aircraft - ${aircraft.aircraftType || 'Unknown Type'}`
    }));
    
    console.log('📊 Seeding aircraft data...');
    
    // Seed in batches to avoid memory issues
    const batchSize = 100;
    let seededCount = 0;
    
    for (let i = 0; i < seedData.length; i += batchSize) {
      const batch = seedData.slice(i, i + batchSize);
      console.log(`📊 Seeding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(seedData.length/batchSize)} (${batch.length} items)`);
      
      try {
        await prisma.aircraft.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        seededCount += batch.length;
        console.log(`✅ Seeded ${seededCount}/${seedData.length} aircraft types`);
      } catch (error) {
        console.error(`❌ Error seeding batch ${Math.floor(i/batchSize) + 1}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully seeded ${seededCount} ICAO aircraft types`);
    
    // Create summary
    const summary = {
      totalSeeded: seededCount,
      totalAvailable: aircraftData.length,
      engineTypeBreakdown: {},
      wakeTurbulenceBreakdown: {},
      aircraftTypeBreakdown: {},
      seededAt: new Date().toISOString(),
      source: 'ICAO DOC 8643 Parsed Data'
    };
    
    // Count breakdowns
    aircraftData.forEach(aircraft => {
      summary.engineTypeBreakdown[aircraft.engineType] = (summary.engineTypeBreakdown[aircraft.engineType] || 0) + 1;
      summary.wakeTurbulenceBreakdown[aircraft.wakeTurbulenceCategory] = (summary.wakeTurbulenceBreakdown[aircraft.wakeTurbulenceCategory] || 0) + 1;
      summary.aircraftTypeBreakdown[aircraft.aircraftType] = (summary.aircraftTypeBreakdown[aircraft.aircraftType] || 0) + 1;
    });
    
    const summaryPath = path.join(__dirname, 'icao-seeding-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Seeding summary saved to ${summaryPath}`);
    
    // Display some statistics
    console.log('\n📈 Seeding Statistics:');
    console.log(`Total Aircraft Types: ${seededCount}`);
    console.log(`Engine Types: ${Object.keys(summary.engineTypeBreakdown).length}`);
    console.log(`Wake Turbulence Categories: ${Object.keys(summary.wakeTurbulenceBreakdown).length}`);
    console.log(`Aircraft Types: ${Object.keys(summary.aircraftTypeBreakdown).length}`);
    
    console.log('\n🔧 Engine Type Breakdown:');
    Object.entries(summary.engineTypeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n🌪️ Wake Turbulence Breakdown:');
    Object.entries(summary.wakeTurbulenceBreakdown).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    console.log('\n✈️ Aircraft Type Breakdown:');
    Object.entries(summary.aircraftTypeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding ICAO data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedIcaoParsedData().catch(console.error);
}

module.exports = { seedIcaoParsedData }; 