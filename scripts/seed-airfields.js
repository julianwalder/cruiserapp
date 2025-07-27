const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleAirfields = [
  {
    name: 'Henri Coandă International Airport',
    code: 'OTP',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Bucharest',
    state: 'Ilfov',
    country: 'Romania',
    latitude: '44.5711',
    longitude: '26.0850',
    elevation: '314',
    runwayLength: '11483',
    runwaySurface: 'Concrete',
    phone: '+40 21 204 1000',
    email: 'info@otp-airport.ro',
    website: 'https://www.bucharestairports.ro',
  },
  {
    name: 'Cluj-Napoca International Airport',
    code: 'CLJ',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Cluj-Napoca',
    state: 'Cluj',
    country: 'Romania',
    latitude: '46.7852',
    longitude: '23.6862',
    elevation: '1036',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 264 307 500',
    email: 'info@airportcluj.ro',
    website: 'https://www.airportcluj.ro',
  },
  {
    name: 'Timișoara Traian Vuia International Airport',
    code: 'TSR',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Timișoara',
    state: 'Timiș',
    country: 'Romania',
    latitude: '45.8099',
    longitude: '21.3379',
    elevation: '348',
    runwayLength: '11483',
    runwaySurface: 'Concrete',
    phone: '+40 256 493 000',
    email: 'info@aerotim.ro',
    website: 'https://www.aerotim.ro',
  },
  {
    name: 'Băneasa Aurel Vlaicu International Airport',
    code: 'BBU',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Bucharest',
    state: 'Bucharest',
    country: 'Romania',
    latitude: '44.5032',
    longitude: '26.1021',
    elevation: '297',
    runwayLength: '5906',
    runwaySurface: 'Asphalt',
    phone: '+40 21 232 0020',
    email: 'info@baneasa-airport.ro',
    website: 'https://www.baneasa-airport.ro',
  },
  {
    name: 'Sibiu International Airport',
    code: 'SBZ',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Sibiu',
    state: 'Sibiu',
    country: 'Romania',
    latitude: '45.7856',
    longitude: '24.0913',
    elevation: '1496',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 269 253 135',
    email: 'info@sibiuairport.ro',
    website: 'https://www.sibiuairport.ro',
  },
  {
    name: 'Bacău International Airport',
    code: 'BCM',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Bacău',
    state: 'Bacău',
    country: 'Romania',
    latitude: '46.5219',
    longitude: '26.9103',
    elevation: '607',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 234 558 000',
    email: 'info@aeroportbacau.ro',
    website: 'https://www.aeroportbacau.ro',
  },
  {
    name: 'Iași International Airport',
    code: 'IAS',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Iași',
    state: 'Iași',
    country: 'Romania',
    latitude: '47.1785',
    longitude: '27.6206',
    elevation: '397',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 232 271 000',
    email: 'info@aeroport-iasi.ro',
    website: 'https://www.aeroport-iasi.ro',
  },
  {
    name: 'Craiova International Airport',
    code: 'CRA',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Craiova',
    state: 'Dolj',
    country: 'Romania',
    latitude: '44.3181',
    longitude: '23.8886',
    elevation: '626',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 251 416 000',
    email: 'info@aeroportcraiova.ro',
    website: 'https://www.aeroportcraiova.ro',
  },
  {
    name: 'Oradea International Airport',
    code: 'OMR',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Oradea',
    state: 'Bihor',
    country: 'Romania',
    latitude: '47.0253',
    longitude: '21.9025',
    elevation: '465',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 259 436 000',
    email: 'info@aeroportoradea.ro',
    website: 'https://www.aeroportoradea.ro',
  },
  {
    name: 'Arad International Airport',
    code: 'ARW',
    type: 'AIRPORT',
    status: 'ACTIVE',
    city: 'Arad',
    state: 'Arad',
    country: 'Romania',
    latitude: '46.1765',
    longitude: '21.2620',
    elevation: '352',
    runwayLength: '7218',
    runwaySurface: 'Asphalt',
    phone: '+40 257 280 000',
    email: 'info@aeroportarad.ro',
    website: 'https://www.aeroportarad.ro',
  },
];

async function seedAirfields() {
  try {
    console.log('🌱 Seeding airfields...');

    // Get the first admin user to use as createdBy
    const adminUser = await prisma.user.findFirst({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN']
        }
      }
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin user first.');
      return;
    }

    for (const airfieldData of sampleAirfields) {
      // Check if airfield already exists
      const existingAirfield = await prisma.airfield.findUnique({
        where: { code: airfieldData.code }
      });

      if (existingAirfield) {
        console.log(`⏭️  Airfield ${airfieldData.code} already exists, skipping...`);
        continue;
      }

      // Create airfield
      const airfield = await prisma.airfield.create({
        data: {
          ...airfieldData,
          createdById: adminUser.id,
        }
      });

      console.log(`✅ Created airfield: ${airfield.name} (${airfield.code})`);
    }

    console.log('🎉 Airfields seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding airfields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAirfields(); 