const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Common ICAO aircraft types based on real-world data
const icaoAircraftTypes = [
  // Cessna Aircraft
  {
    icaoTypeDesignator: 'C152',
    manufacturer: 'Cessna',
    model: '152',
    description: 'Cessna 152',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C172',
    manufacturer: 'Cessna',
    model: '172 Skyhawk',
    description: 'Cessna 172 Skyhawk',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C182',
    manufacturer: 'Cessna',
    model: '182 Skylane',
    description: 'Cessna 182 Skylane',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C206',
    manufacturer: 'Cessna',
    model: '206 Stationair',
    description: 'Cessna 206 Stationair',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C210',
    manufacturer: 'Cessna',
    model: '210 Centurion',
    description: 'Cessna 210 Centurion',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C310',
    manufacturer: 'Cessna',
    model: '310',
    description: 'Cessna 310',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C402',
    manufacturer: 'Cessna',
    model: '402 Businessliner',
    description: 'Cessna 402 Businessliner',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C421',
    manufacturer: 'Cessna',
    model: '421 Golden Eagle',
    description: 'Cessna 421 Golden Eagle',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C441',
    manufacturer: 'Cessna',
    model: '441 Conquest II',
    description: 'Cessna 441 Conquest II',
    engineType: 'TURBOPROP',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },
  {
    icaoTypeDesignator: 'C525',
    manufacturer: 'Cessna',
    model: '525 CitationJet',
    description: 'Cessna 525 CitationJet',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C550',
    manufacturer: 'Cessna',
    model: '550 Citation II',
    description: 'Cessna 550 Citation II',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'C650',
    manufacturer: 'Cessna',
    model: '650 Citation III',
    description: 'Cessna 650 Citation III',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },

  // Piper Aircraft
  {
    icaoTypeDesignator: 'PA28',
    manufacturer: 'Piper',
    model: 'PA-28 Cherokee',
    description: 'Piper PA-28 Cherokee',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'PA32',
    manufacturer: 'Piper',
    model: 'PA-32 Cherokee Six',
    description: 'Piper PA-32 Cherokee Six',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'PA34',
    manufacturer: 'Piper',
    model: 'PA-34 Seneca',
    description: 'Piper PA-34 Seneca',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'PA44',
    manufacturer: 'Piper',
    model: 'PA-44 Seminole',
    description: 'Piper PA-44 Seminole',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'PA46',
    manufacturer: 'Piper',
    model: 'PA-46 Malibu',
    description: 'Piper PA-46 Malibu',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },

  // Beechcraft Aircraft
  {
    icaoTypeDesignator: 'BE20',
    manufacturer: 'Beechcraft',
    model: 'King Air 200',
    description: 'Beechcraft King Air 200',
    engineType: 'TURBOPROP',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },
  {
    icaoTypeDesignator: 'BE30',
    manufacturer: 'Beechcraft',
    model: 'King Air 300',
    description: 'Beechcraft King Air 300',
    engineType: 'TURBOPROP',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },
  {
    icaoTypeDesignator: 'BE35',
    manufacturer: 'Beechcraft',
    model: 'V35 Bonanza',
    description: 'Beechcraft V35 Bonanza',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'BE36',
    manufacturer: 'Beechcraft',
    model: 'A36 Bonanza',
    description: 'Beechcraft A36 Bonanza',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'BE58',
    manufacturer: 'Beechcraft',
    model: 'Baron',
    description: 'Beechcraft Baron',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'BE90',
    manufacturer: 'Beechcraft',
    model: 'King Air 90',
    description: 'Beechcraft King Air 90',
    engineType: 'TURBOPROP',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },

  // Diamond Aircraft
  {
    icaoTypeDesignator: 'DA20',
    manufacturer: 'Diamond',
    model: 'DA20 Katana',
    description: 'Diamond DA20 Katana',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'DA40',
    manufacturer: 'Diamond',
    model: 'DA40 Diamond Star',
    description: 'Diamond DA40 Diamond Star',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'DA42',
    manufacturer: 'Diamond',
    model: 'DA42 Twin Star',
    description: 'Diamond DA42 Twin Star',
    engineType: 'PISTON',
    engineCount: 2,
    wakeTurbulenceCategory: 'LIGHT'
  },

  // Cirrus Aircraft
  {
    icaoTypeDesignator: 'SR20',
    manufacturer: 'Cirrus',
    model: 'SR20',
    description: 'Cirrus SR20',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'SR22',
    manufacturer: 'Cirrus',
    model: 'SR22',
    description: 'Cirrus SR22',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },

  // Commercial Aircraft
  {
    icaoTypeDesignator: 'A320',
    manufacturer: 'Airbus',
    model: 'A320',
    description: 'Airbus A320',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },
  {
    icaoTypeDesignator: 'A330',
    manufacturer: 'Airbus',
    model: 'A330',
    description: 'Airbus A330',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'HEAVY'
  },
  {
    icaoTypeDesignator: 'A350',
    manufacturer: 'Airbus',
    model: 'A350',
    description: 'Airbus A350',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'HEAVY'
  },
  {
    icaoTypeDesignator: 'A380',
    manufacturer: 'Airbus',
    model: 'A380',
    description: 'Airbus A380',
    engineType: 'TURBOFAN',
    engineCount: 4,
    wakeTurbulenceCategory: 'SUPER'
  },
  {
    icaoTypeDesignator: 'B737',
    manufacturer: 'Boeing',
    model: '737',
    description: 'Boeing 737',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'MEDIUM'
  },
  {
    icaoTypeDesignator: 'B747',
    manufacturer: 'Boeing',
    model: '747',
    description: 'Boeing 747',
    engineType: 'TURBOFAN',
    engineCount: 4,
    wakeTurbulenceCategory: 'HEAVY'
  },
  {
    icaoTypeDesignator: 'B777',
    manufacturer: 'Boeing',
    model: '777',
    description: 'Boeing 777',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'HEAVY'
  },
  {
    icaoTypeDesignator: 'B787',
    manufacturer: 'Boeing',
    model: '787 Dreamliner',
    description: 'Boeing 787 Dreamliner',
    engineType: 'TURBOFAN',
    engineCount: 2,
    wakeTurbulenceCategory: 'HEAVY'
  },

  // Helicopters
  {
    icaoTypeDesignator: 'R22',
    manufacturer: 'Robinson',
    model: 'R22',
    description: 'Robinson R22',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'R44',
    manufacturer: 'Robinson',
    model: 'R44',
    description: 'Robinson R44',
    engineType: 'PISTON',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'AS50',
    manufacturer: 'Airbus Helicopters',
    model: 'AS350 Écureuil',
    description: 'Airbus Helicopters AS350 Écureuil',
    engineType: 'TURBOSHAFT',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'B206',
    manufacturer: 'Bell',
    model: '206 JetRanger',
    description: 'Bell 206 JetRanger',
    engineType: 'TURBOSHAFT',
    engineCount: 1,
    wakeTurbulenceCategory: 'LIGHT'
  },

  // Gliders
  {
    icaoTypeDesignator: 'ASK21',
    manufacturer: 'Alexander Schleicher',
    model: 'ASK 21',
    description: 'Alexander Schleicher ASK 21',
    engineType: 'PISTON',
    engineCount: 0,
    wakeTurbulenceCategory: 'LIGHT'
  },
  {
    icaoTypeDesignator: 'DG100',
    manufacturer: 'DG Flugzeugbau',
    model: 'DG-1000',
    description: 'DG Flugzeugbau DG-1000',
    engineType: 'PISTON',
    engineCount: 0,
    wakeTurbulenceCategory: 'LIGHT'
  }
];

async function seedIcaoAircraftTypes() {
  try {
    console.log('Starting ICAO aircraft types seeding...');
    
    // Create a table to store ICAO aircraft types
    const createdTypes = [];
    
    for (const aircraftType of icaoAircraftTypes) {
      try {
        // Check if type already exists in ICAOReferenceType table
        const existingType = await prisma.iCAOReferenceType.findFirst({
          where: { 
            typeDesignator: aircraftType.icaoTypeDesignator,
            manufacturer: aircraftType.manufacturer,
            model: aircraftType.model
          }
        });
        
        if (!existingType) {
          const createdType = await prisma.iCAOReferenceType.create({
            data: {
              typeDesignator: aircraftType.icaoTypeDesignator,
              manufacturer: aircraftType.manufacturer,
              model: aircraftType.model,
              description: aircraftType.description,
              engineType: aircraftType.engineType,
              engineCount: aircraftType.engineCount,
              wtc: aircraftType.wakeTurbulenceCategory
            }
          });
          createdTypes.push(createdType);
          console.log(`Created ICAO type: ${aircraftType.icaoTypeDesignator} - ${aircraftType.manufacturer} ${aircraftType.model}`);
        } else {
          console.log(`ICAO type already exists: ${aircraftType.icaoTypeDesignator}`);
        }
      } catch (error) {
        console.error(`Error creating ICAO type ${aircraftType.icaoTypeDesignator}:`, error);
      }
    }
    
    console.log(`✅ Successfully seeded ${createdTypes.length} ICAO aircraft types`);
    console.log(`Total ICAO types in database: ${await prisma.iCAOReferenceType.count()}`);
    
  } catch (error) {
    console.error('Error seeding ICAO aircraft types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedIcaoAircraftTypes(); 