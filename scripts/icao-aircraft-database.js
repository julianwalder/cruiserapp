const { PrismaClient } = require('@prisma/client');

// Comprehensive ICAO Aircraft Type Database
// Based on real ICAO DOC 8643 data and common aircraft types
const icaoAircraftDatabase = [
  // Cessna Aircraft
  { icaoTypeDesignator: 'C150', manufacturer: 'Cessna', model: '150', description: 'Cessna 150', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C152', manufacturer: 'Cessna', model: '152', description: 'Cessna 152', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C172', manufacturer: 'Cessna', model: '172 Skyhawk', description: 'Cessna 172 Skyhawk', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C182', manufacturer: 'Cessna', model: '182 Skylane', description: 'Cessna 182 Skylane', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C206', manufacturer: 'Cessna', model: '206 Stationair', description: 'Cessna 206 Stationair', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C210', manufacturer: 'Cessna', model: '210 Centurion', description: 'Cessna 210 Centurion', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C310', manufacturer: 'Cessna', model: '310', description: 'Cessna 310', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C402', manufacturer: 'Cessna', model: '402 Businessliner', description: 'Cessna 402 Businessliner', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C421', manufacturer: 'Cessna', model: '421 Golden Eagle', description: 'Cessna 421 Golden Eagle', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C441', manufacturer: 'Cessna', model: '441 Conquest II', description: 'Cessna 441 Conquest II', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'C525', manufacturer: 'Cessna', model: '525 CitationJet', description: 'Cessna 525 CitationJet', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C550', manufacturer: 'Cessna', model: '550 Citation II', description: 'Cessna 550 Citation II', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'C650', manufacturer: 'Cessna', model: '650 Citation III', description: 'Cessna 650 Citation III', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'C750', manufacturer: 'Cessna', model: '750 Citation X', description: 'Cessna 750 Citation X', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },

  // Piper Aircraft
  { icaoTypeDesignator: 'PA28', manufacturer: 'Piper', model: 'PA-28 Cherokee', description: 'Piper PA-28 Cherokee', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'PA32', manufacturer: 'Piper', model: 'PA-32 Cherokee Six', description: 'Piper PA-32 Cherokee Six', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'PA34', manufacturer: 'Piper', model: 'PA-34 Seneca', description: 'Piper PA-34 Seneca', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'PA44', manufacturer: 'Piper', model: 'PA-44 Seminole', description: 'Piper PA-44 Seminole', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'PA46', manufacturer: 'Piper', model: 'PA-46 Malibu', description: 'Piper PA-46 Malibu', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },

  // Beechcraft Aircraft
  { icaoTypeDesignator: 'BE20', manufacturer: 'Beechcraft', model: 'King Air 200', description: 'Beechcraft King Air 200', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'BE30', manufacturer: 'Beechcraft', model: 'King Air 300', description: 'Beechcraft King Air 300', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'BE35', manufacturer: 'Beechcraft', model: 'V35 Bonanza', description: 'Beechcraft V35 Bonanza', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'BE36', manufacturer: 'Beechcraft', model: 'A36 Bonanza', description: 'Beechcraft A36 Bonanza', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'BE58', manufacturer: 'Beechcraft', model: 'Baron', description: 'Beechcraft Baron', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'BE90', manufacturer: 'Beechcraft', model: 'King Air 90', description: 'Beechcraft King Air 90', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'BE99', manufacturer: 'Beechcraft', model: '99 Airliner', description: 'Beechcraft 99 Airliner', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },

  // Diamond Aircraft
  { icaoTypeDesignator: 'DA20', manufacturer: 'Diamond', model: 'DA20 Katana', description: 'Diamond DA20 Katana', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'DA40', manufacturer: 'Diamond', model: 'DA40 Diamond Star', description: 'Diamond DA40 Diamond Star', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'DA42', manufacturer: 'Diamond', model: 'DA42 Twin Star', description: 'Diamond DA42 Twin Star', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'DA62', manufacturer: 'Diamond', model: 'DA62', description: 'Diamond DA62', engineType: 'PISTON', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },

  // Cirrus Aircraft
  { icaoTypeDesignator: 'SR20', manufacturer: 'Cirrus', model: 'SR20', description: 'Cirrus SR20', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'SR22', manufacturer: 'Cirrus', model: 'SR22', description: 'Cirrus SR22', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'SF50', manufacturer: 'Cirrus', model: 'SF50 Vision Jet', description: 'Cirrus SF50 Vision Jet', engineType: 'TURBOFAN', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },

  // Commercial Aircraft - Airbus
  { icaoTypeDesignator: 'A220', manufacturer: 'Airbus', model: 'A220', description: 'Airbus A220', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'A318', manufacturer: 'Airbus', model: 'A318', description: 'Airbus A318', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'A319', manufacturer: 'Airbus', model: 'A319', description: 'Airbus A319', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'A320', manufacturer: 'Airbus', model: 'A320', description: 'Airbus A320', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'A321', manufacturer: 'Airbus', model: 'A321', description: 'Airbus A321', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'A330', manufacturer: 'Airbus', model: 'A330', description: 'Airbus A330', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'A340', manufacturer: 'Airbus', model: 'A340', description: 'Airbus A340', engineType: 'TURBOFAN', engineCount: 4, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'A350', manufacturer: 'Airbus', model: 'A350', description: 'Airbus A350', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'A380', manufacturer: 'Airbus', model: 'A380', description: 'Airbus A380', engineType: 'TURBOFAN', engineCount: 4, wakeTurbulenceCategory: 'SUPER' },

  // Commercial Aircraft - Boeing
  { icaoTypeDesignator: 'B712', manufacturer: 'Boeing', model: '717', description: 'Boeing 717', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B732', manufacturer: 'Boeing', model: '737-200', description: 'Boeing 737-200', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B733', manufacturer: 'Boeing', model: '737-300', description: 'Boeing 737-300', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B734', manufacturer: 'Boeing', model: '737-400', description: 'Boeing 737-400', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B735', manufacturer: 'Boeing', model: '737-500', description: 'Boeing 737-500', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B736', manufacturer: 'Boeing', model: '737-600', description: 'Boeing 737-600', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B737', manufacturer: 'Boeing', model: '737-700', description: 'Boeing 737-700', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B738', manufacturer: 'Boeing', model: '737-800', description: 'Boeing 737-800', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B739', manufacturer: 'Boeing', model: '737-900', description: 'Boeing 737-900', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B744', manufacturer: 'Boeing', model: '747-400', description: 'Boeing 747-400', engineType: 'TURBOFAN', engineCount: 4, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B748', manufacturer: 'Boeing', model: '747-8', description: 'Boeing 747-8', engineType: 'TURBOFAN', engineCount: 4, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B752', manufacturer: 'Boeing', model: '757-200', description: 'Boeing 757-200', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B753', manufacturer: 'Boeing', model: '757-300', description: 'Boeing 757-300', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'B762', manufacturer: 'Boeing', model: '767-200', description: 'Boeing 767-200', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B763', manufacturer: 'Boeing', model: '767-300', description: 'Boeing 767-300', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B764', manufacturer: 'Boeing', model: '767-400', description: 'Boeing 767-400', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B772', manufacturer: 'Boeing', model: '777-200', description: 'Boeing 777-200', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B773', manufacturer: 'Boeing', model: '777-300', description: 'Boeing 777-300', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B778', manufacturer: 'Boeing', model: '777-8', description: 'Boeing 777-8', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B779', manufacturer: 'Boeing', model: '777-9', description: 'Boeing 777-9', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B781', manufacturer: 'Boeing', model: '787-8', description: 'Boeing 787-8', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B782', manufacturer: 'Boeing', model: '787-9', description: 'Boeing 787-9', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },
  { icaoTypeDesignator: 'B783', manufacturer: 'Boeing', model: '787-10', description: 'Boeing 787-10', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'HEAVY' },

  // Helicopters
  { icaoTypeDesignator: 'R22', manufacturer: 'Robinson', model: 'R22', description: 'Robinson R22', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'R44', manufacturer: 'Robinson', model: 'R44', description: 'Robinson R44', engineType: 'PISTON', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'R66', manufacturer: 'Robinson', model: 'R66', description: 'Robinson R66', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'AS50', manufacturer: 'Airbus Helicopters', model: 'AS350 Écureuil', description: 'Airbus Helicopters AS350 Écureuil', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'AS55', manufacturer: 'Airbus Helicopters', model: 'AS355 Écureuil 2', description: 'Airbus Helicopters AS355 Écureuil 2', engineType: 'TURBOSHAFT', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'B206', manufacturer: 'Bell', model: '206 JetRanger', description: 'Bell 206 JetRanger', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'B407', manufacturer: 'Bell', model: '407', description: 'Bell 407', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'B412', manufacturer: 'Bell', model: '412', description: 'Bell 412', engineType: 'TURBOSHAFT', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'H125', manufacturer: 'Airbus Helicopters', model: 'H125', description: 'Airbus Helicopters H125', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'H130', manufacturer: 'Airbus Helicopters', model: 'H130', description: 'Airbus Helicopters H130', engineType: 'TURBOSHAFT', engineCount: 1, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'H135', manufacturer: 'Airbus Helicopters', model: 'H135', description: 'Airbus Helicopters H135', engineType: 'TURBOSHAFT', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'H145', manufacturer: 'Airbus Helicopters', model: 'H145', description: 'Airbus Helicopters H145', engineType: 'TURBOSHAFT', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'H175', manufacturer: 'Airbus Helicopters', model: 'H175', description: 'Airbus Helicopters H175', engineType: 'TURBOSHAFT', engineCount: 2, wakeTurbulenceCategory: 'LIGHT' },

  // Gliders
  { icaoTypeDesignator: 'ASK21', manufacturer: 'Alexander Schleicher', model: 'ASK 21', description: 'Alexander Schleicher ASK 21', engineType: 'PISTON', engineCount: 0, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'DG100', manufacturer: 'DG Flugzeugbau', model: 'DG-1000', description: 'DG Flugzeugbau DG-1000', engineType: 'PISTON', engineCount: 0, wakeTurbulenceCategory: 'LIGHT' },
  { icaoTypeDesignator: 'DG300', manufacturer: 'DG Flugzeugbau', model: 'DG-300', description: 'DG Flugzeugbau DG-300', engineType: 'PISTON', engineCount: 0, wakeTurbulenceCategory: 'LIGHT' },

  // Other Popular Aircraft
  { icaoTypeDesignator: 'AT72', manufacturer: 'ATR', model: 'ATR 72', description: 'ATR 72', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'AT76', manufacturer: 'ATR', model: 'ATR 76', description: 'ATR 76', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'CRJ1', manufacturer: 'Bombardier', model: 'CRJ100', description: 'Bombardier CRJ100', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'CRJ2', manufacturer: 'Bombardier', model: 'CRJ200', description: 'Bombardier CRJ200', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'CRJ7', manufacturer: 'Bombardier', model: 'CRJ700', description: 'Bombardier CRJ700', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'CRJ9', manufacturer: 'Bombardier', model: 'CRJ900', description: 'Bombardier CRJ900', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'E170', manufacturer: 'Embraer', model: 'E170', description: 'Embraer E170', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'E175', manufacturer: 'Embraer', model: 'E175', description: 'Embraer E175', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'E190', manufacturer: 'Embraer', model: 'E190', description: 'Embraer E190', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'E195', manufacturer: 'Embraer', model: 'E195', description: 'Embraer E195', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'F100', manufacturer: 'Fokker', model: '100', description: 'Fokker 100', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'F50', manufacturer: 'Fokker', model: '50', description: 'Fokker 50', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'MD80', manufacturer: 'McDonnell Douglas', model: 'MD-80', description: 'McDonnell Douglas MD-80', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'MD90', manufacturer: 'McDonnell Douglas', model: 'MD-90', description: 'McDonnell Douglas MD-90', engineType: 'TURBOFAN', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'SF34', manufacturer: 'Saab', model: '340', description: 'Saab 340', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' },
  { icaoTypeDesignator: 'SF50', manufacturer: 'Saab', model: '2000', description: 'Saab 2000', engineType: 'TURBOPROP', engineCount: 2, wakeTurbulenceCategory: 'MEDIUM' }
];

async function seedIcaoDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting ICAO aircraft database seeding...');
    console.log(`📊 Total aircraft types to process: ${icaoAircraftDatabase.length}`);
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const aircraft of icaoAircraftDatabase) {
      try {
        // Check if aircraft already exists
        const existing = await prisma.aircraft.findFirst({
          where: { icaoTypeDesignator: aircraft.icaoTypeDesignator }
        });
        
        if (!existing) {
          await prisma.aircraft.create({
            data: {
              ...aircraft,
              registration: `ICAO-${aircraft.icaoTypeDesignator}-REF`,
              status: 'ACTIVE',
              totalFlightHours: 0,
              notes: 'ICAO reference aircraft type from comprehensive database'
            }
          });
          createdCount++;
          console.log(`✅ Created: ${aircraft.icaoTypeDesignator} - ${aircraft.manufacturer} ${aircraft.model}`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped (exists): ${aircraft.icaoTypeDesignator}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error creating ${aircraft.icaoTypeDesignator}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Seeding complete!`);
    console.log(`✅ Created: ${createdCount} aircraft types`);
    console.log(`⏭️  Skipped: ${skippedCount} existing aircraft types`);
    console.log(`❌ Errors: ${errorCount} failed creations`);
    
    // Generate statistics
    const stats = {
      total: icaoAircraftDatabase.length,
      byEngineType: {},
      byWakeTurbulenceCategory: {},
      byManufacturer: {}
    };
    
    icaoAircraftDatabase.forEach(aircraft => {
      stats.byEngineType[aircraft.engineType] = (stats.byEngineType[aircraft.engineType] || 0) + 1;
      stats.byWakeTurbulenceCategory[aircraft.wakeTurbulenceCategory] = (stats.byWakeTurbulenceCategory[aircraft.wakeTurbulenceCategory] || 0) + 1;
      stats.byManufacturer[aircraft.manufacturer] = (stats.byManufacturer[aircraft.manufacturer] || 0) + 1;
    });
    
    console.log('\n📊 Database Statistics:');
    console.log(`Total aircraft types: ${stats.total}`);
    console.log('By engine type:', stats.byEngineType);
    console.log('By wake turbulence category:', stats.byWakeTurbulenceCategory);
    console.log('Top 5 manufacturers:', Object.entries(stats.byManufacturer)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([manufacturer, count]) => `${manufacturer}: ${count}`)
      .join(', ')
    );
    
  } catch (error) {
    console.error('❌ Error seeding ICAO database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { icaoAircraftDatabase, seedIcaoDatabase };

// Run if called directly
if (require.main === module) {
  seedIcaoDatabase();
} 