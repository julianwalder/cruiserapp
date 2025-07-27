const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function showSchemaStatus() {
  console.log('🔍 CruiserApp vs OurAirports Schema Status Report\n');

  // Current Prisma Schema
  console.log('📋 Current CruiserApp Airfield Schema:');
  console.log('='.repeat(60));
  const cruiserAppSchema = {
    'id': 'String (CUID)',
    'name': 'String',
    'code': 'String (unique)',
    'type': 'AirfieldType enum',
    'status': 'AirfieldStatus enum',
    'latitude': 'Float?',
    'longitude': 'Float?',
    'elevation': 'Int?',
    'city': 'String?',
    'state': 'String?',
    'country': 'String?',
    'continent': 'String?',
    'isBase': 'Boolean',
    'createdAt': 'DateTime',
    'updatedAt': 'DateTime',
    'createdById': 'String?'
  };

  Object.entries(cruiserAppSchema).forEach(([field, type]) => {
    console.log(`${field.padEnd(20)} | ${type}`);
  });

  // OurAirports Schema
  console.log('\n📋 OurAirports CSV Schema:');
  console.log('='.repeat(60));
  const ourAirportsSchema = {
    'id': 'string',
    'ident': 'string',
    'type': 'string',
    'name': 'string',
    'latitude_deg': 'string (number)',
    'longitude_deg': 'string (number)',
    'elevation_ft': 'string (number)',
    'continent': 'string',
    'iso_country': 'string',
    'iso_region': 'string',
    'municipality': 'string',
    'scheduled_service': 'string',
    'icao_code': 'string',
    'iata_code': 'string',
    'gps_code': 'string',
    'local_code': 'string',
    'home_link': 'string',
    'wikipedia_link': 'string',
    'keywords': 'string'
  };

  Object.entries(ourAirportsSchema).forEach(([field, type]) => {
    console.log(`${field.padEnd(20)} | ${type}`);
  });

  // Field Mapping Status
  console.log('\n🔄 Field Mapping Status:');
  console.log('='.repeat(60));
  const fieldMapping = {
    'name': { status: '✅', from: 'name', to: 'name', notes: 'Direct mapping' },
    'code': { status: '✅', from: 'icao_code > iata_code > local_code > ident', to: 'code', notes: 'Prioritized mapping' },
    'type': { status: '⚠️', from: 'type', to: 'type', notes: 'Needs enum conversion' },
    'latitude': { status: '⚠️', from: 'latitude_deg', to: 'latitude', notes: 'Needs parseFloat()' },
    'longitude': { status: '⚠️', from: 'longitude_deg', to: 'longitude', notes: 'Needs parseFloat()' },
    'elevation': { status: '⚠️', from: 'elevation_ft', to: 'elevation', notes: 'Needs parseInt()' },
    'city': { status: '✅', from: 'municipality', to: 'city', notes: 'Direct mapping' },
    'state': { status: '✅', from: 'iso_region', to: 'state', notes: 'Direct mapping' },
    'country': { status: '✅', from: 'iso_country', to: 'country', notes: 'Direct mapping' },
    'continent': { status: '✅', from: 'continent', to: 'continent', notes: 'Direct mapping' },
    'website': { status: '✅', from: 'home_link', to: 'website', notes: 'Direct mapping' }
  };

  Object.entries(fieldMapping).forEach(([field, mapping]) => {
    console.log(`${mapping.status} ${field.padEnd(18)} | ${mapping.from.padEnd(25)} → ${mapping.to.padEnd(12)} | ${mapping.notes}`);
  });

  // Type Conversion Status
  console.log('\n🎯 Type Conversion Status:');
  console.log('='.repeat(60));
  const typeMapping = {
    'large_airport': { status: '✅', to: 'AIRPORT', notes: 'Mapped' },
    'medium_airport': { status: '✅', to: 'AIRPORT', notes: 'Mapped' },
    'small_airport': { status: '✅', to: 'ULTRALIGHT_FIELD', notes: 'Mapped' },
    'heliport': { status: '✅', to: 'HELIPORT', notes: 'Mapped' },
    'seaplane_base': { status: '✅', to: 'SEAPLANE_BASE', notes: 'Mapped' },
    'balloonport': { status: '✅', to: 'BALLOON_PORT', notes: 'Mapped' },
    'gliderport': { status: '✅', to: 'GLIDER_PORT', notes: 'Mapped' }
  };

  Object.entries(typeMapping).forEach(([from, mapping]) => {
    console.log(`${mapping.status} ${from.padEnd(20)} → ${mapping.to.padEnd(15)} | ${mapping.notes}`);
  });

  // Missing Fields Analysis
  console.log('\n❌ Missing Fields (Not Mapped):');
  console.log('='.repeat(60));
  const missingFields = [
    { field: 'scheduled_service', type: 'string', notes: 'Could be useful for filtering' },
    { field: 'gps_code', type: 'string', notes: 'Alternative identifier' },
    { field: 'wikipedia_link', type: 'string', notes: 'Additional information' },
    { field: 'keywords', type: 'string', notes: 'Searchable metadata' }
  ];

  missingFields.forEach(field => {
    console.log(`❌ ${field.field.padEnd(20)} | ${field.type.padEnd(10)} | ${field.notes}`);
  });

  // Current Database State
  console.log('\n📊 Current Database State:');
  console.log('='.repeat(60));
  try {
    const airfieldCount = await prisma.airfield.count();
    const baseAirfieldCount = await prisma.airfield.count({
      where: { isBase: true }
    });
    
    console.log(`Total airfields: ${airfieldCount}`);
    console.log(`Base airfields: ${baseAirfieldCount}`);
    
    if (airfieldCount > 0) {
      const sampleAirfield = await prisma.airfield.findFirst();
      console.log('\n📝 Sample Airfield Data:');
      console.log(JSON.stringify(sampleAirfield, null, 2));
    } else {
      console.log('\n📝 No airfields in database yet');
    }
  } catch (error) {
    console.log(`❌ Error accessing database: ${error.message}`);
  }

  // Issues Found
  console.log('\n🚨 Current Issues:');
  console.log('='.repeat(60));
  const issues = [
    { status: '❌', issue: 'Prisma client type errors', notes: 'latitude/longitude/elevation conversion' },
    { status: '❌', issue: 'Import not finding Romanian airfields', notes: 'CSV parsing issue' },
    { status: '❌', issue: 'Missing runway information', notes: 'Not in OurAirports data' },
    { status: '⚠️', issue: 'Some fields not mapped', notes: 'scheduled_service, keywords, etc.' }
  ];

  issues.forEach(issue => {
    console.log(`${issue.status} ${issue.issue.padEnd(35)} | ${issue.notes}`);
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('='.repeat(60));
  const recommendations = [
    '1. ✅ Fix Prisma client regeneration and restart dev server',
    '2. ✅ Ensure proper data type conversion (parseFloat/parseInt)',
    '3. ✅ Implement proper code prioritization (ICAO > IATA > Local > Ident)',
    '4. ✅ Add error handling for invalid coordinate data',
    '5. ⚠️  Consider adding missing fields to schema if needed',
    '6. ⚠️  Add validation for required fields',
    '7. ⚠️  Consider adding runway information from other sources'
  ];

  recommendations.forEach(rec => {
    console.log(rec);
  });

  // Next Steps
  console.log('\n🎯 Next Steps:');
  console.log('='.repeat(60));
  const nextSteps = [
    '1. Restart development server to load regenerated Prisma client',
    '2. Test import with Romanian airfields (RO)',
    '3. Verify coordinate conversion is working',
    '4. Test airfield creation and base airfield assignment',
    '5. Add comprehensive error handling',
    '6. Consider adding missing fields if needed'
  ];

  nextSteps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });

  await prisma.$disconnect();
}

// Run the status report
showSchemaStatus().catch(console.error); 