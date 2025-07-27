const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// OurAirports CSV header structure (from the actual CSV)
const OUR_AIRPORTS_SCHEMA = {
  id: 'string',
  ident: 'string',
  type: 'string',
  name: 'string',
  latitude_deg: 'number',
  longitude_deg: 'number',
  elevation_ft: 'number',
  continent: 'string',
  iso_country: 'string',
  iso_region: 'string',
  municipality: 'string',
  scheduled_service: 'string',
  icao_code: 'string',
  iata_code: 'string',
  gps_code: 'string',
  local_code: 'string',
  home_link: 'string',
  wikipedia_link: 'string',
  keywords: 'string'
};

// CruiserApp Airfield schema (from Prisma)
const CRUISER_APP_SCHEMA = {
  id: 'String',
  name: 'String',
  code: 'String',
  type: 'AirfieldType',
  status: 'AirfieldStatus',
  latitude: 'Float?',
  longitude: 'Float?',
  elevation: 'Int?',
  city: 'String?',
  state: 'String?',
  country: 'String?',
  continent: 'String?',
  isBase: 'Boolean',
  createdAt: 'DateTime',
  updatedAt: 'DateTime',
  createdById: 'String?'
};

// Field mapping from OurAirports to CruiserApp
const FIELD_MAPPING = {
  'name': 'name',
  'icao_code': 'code', // Primary code
  'iata_code': 'code', // Fallback code
  'local_code': 'code', // Fallback code
  'ident': 'code', // Fallback code
  'type': 'type', // Needs conversion
  'latitude_deg': 'latitude',
  'longitude_deg': 'longitude',
  'elevation_ft': 'elevation',
  'municipality': 'city',
  'iso_region': 'state',
  'iso_country': 'country',
  'continent': 'continent',
  'home_link': 'website'
};

// Type mapping from OurAirports to CruiserApp
const TYPE_MAPPING = {
  'large_airport': 'AIRPORT',
  'medium_airport': 'AIRPORT',
  'small_airport': 'ULTRALIGHT_FIELD',
  'heliport': 'HELIPORT',
  'seaplane_base': 'SEAPLANE_BASE',
  'balloonport': 'BALLOON_PORT',
  'gliderport': 'GLIDER_PORT'
};

async function compareSchemas() {
  console.log('🔍 Comparing OurAirports vs CruiserApp Airfield Schemas\n');

  console.log('📋 OurAirports Schema:');
  console.log('='.repeat(50));
  Object.entries(OUR_AIRPORTS_SCHEMA).forEach(([field, type]) => {
    console.log(`${field.padEnd(20)} | ${type}`);
  });

  console.log('\n📋 CruiserApp Schema:');
  console.log('='.repeat(50));
  Object.entries(CRUISER_APP_SCHEMA).forEach(([field, type]) => {
    console.log(`${field.padEnd(20)} | ${type}`);
  });

  console.log('\n🔄 Field Mapping:');
  console.log('='.repeat(50));
  Object.entries(FIELD_MAPPING).forEach(([ourairports, cruiserapp]) => {
    console.log(`${ourairports.padEnd(20)} → ${cruiserapp}`);
  });

  console.log('\n🎯 Type Mapping:');
  console.log('='.repeat(50));
  Object.entries(TYPE_MAPPING).forEach(([ourairports, cruiserapp]) => {
    console.log(`${ourairports.padEnd(20)} → ${cruiserapp}`);
  });

  // Check for missing fields
  console.log('\n⚠️  Missing Fields in CruiserApp:');
  console.log('='.repeat(50));
  const mappedFields = Object.values(FIELD_MAPPING);
  const cruiserFields = Object.keys(CRUISER_APP_SCHEMA);
  
  const missingFields = Object.keys(OUR_AIRPORTS_SCHEMA).filter(field => 
    !Object.keys(FIELD_MAPPING).includes(field)
  );
  
  missingFields.forEach(field => {
    console.log(`❌ ${field} (${OUR_AIRPORTS_SCHEMA[field]}) - Not mapped`);
  });

  // Check for unused CruiserApp fields
  console.log('\n📝 Unused CruiserApp Fields:');
  console.log('='.repeat(50));
  const usedFields = new Set(mappedFields);
  const unusedFields = cruiserFields.filter(field => 
    !usedFields.has(field) && 
    !['id', 'createdAt', 'updatedAt', 'createdById', 'isBase', 'status'].includes(field)
  );
  
  unusedFields.forEach(field => {
    console.log(`ℹ️  ${field} (${CRUISER_APP_SCHEMA[field]}) - Not used in mapping`);
  });

  // Data type compatibility check
  console.log('\n🔧 Data Type Compatibility Issues:');
  console.log('='.repeat(50));
  Object.entries(FIELD_MAPPING).forEach(([ourairports, cruiserapp]) => {
    const ourairportsType = OUR_AIRPORTS_SCHEMA[ourairports];
    const cruiserappType = CRUISER_APP_SCHEMA[cruiserapp];
    
    if (ourairportsType === 'number' && cruiserappType === 'Float?') {
      console.log(`✅ ${ourairports} (${ourairportsType}) → ${cruiserapp} (${cruiserappType}) - Compatible`);
    } else if (ourairportsType === 'number' && cruiserappType === 'Int?') {
      console.log(`✅ ${ourairports} (${ourairportsType}) → ${cruiserapp} (${cruiserappType}) - Compatible (with conversion)`);
    } else if (ourairportsType === 'string' && cruiserappType && cruiserappType.includes('String')) {
      console.log(`✅ ${ourairports} (${ourairportsType}) → ${cruiserapp} (${cruiserappType}) - Compatible`);
    } else {
      console.log(`⚠️  ${ourairports} (${ourairportsType}) → ${cruiserapp} (${cruiserappType}) - Type mismatch`);
    }
  });

  // Check current database state
  console.log('\n📊 Current Database State:');
  console.log('='.repeat(50));
  try {
    const airfieldCount = await prisma.airfield.count();
    const baseAirfieldCount = await prisma.airfield.count({
      where: { isBase: true }
    });
    
    console.log(`Total airfields: ${airfieldCount}`);
    console.log(`Base airfields: ${baseAirfieldCount}`);
    
    // Sample airfield data
    const sampleAirfield = await prisma.airfield.findFirst();
    if (sampleAirfield) {
      console.log('\n📝 Sample Airfield Data:');
      console.log(JSON.stringify(sampleAirfield, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error accessing database: ${error.message}`);
  }

  console.log('\n💡 Recommendations:');
  console.log('='.repeat(50));
  console.log('1. ✅ Coordinate fields (latitude, longitude) need parseFloat() conversion');
  console.log('2. ✅ Elevation field needs parseInt() conversion');
  console.log('3. ✅ Type field needs mapping from OurAirports types to CruiserApp enum');
  console.log('4. ✅ Code field should prioritize ICAO > IATA > Local > Ident');
  console.log('5. ⚠️  Consider adding missing fields like scheduled_service, keywords');
  console.log('6. ⚠️  Consider adding runway information fields if needed');

  await prisma.$disconnect();
}

// Run the comparison
compareSchemas().catch(console.error); 