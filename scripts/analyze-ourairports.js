const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse CSV line (handle commas within quotes)
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  fields.push(currentField);
  return fields;
}

async function analyzeOurAirports() {
  console.log('🔍 Analyzing OurAirports Database Structure\n');

  try {
    // Fetch a sample of OurAirports data
    console.log('📥 Fetching OurAirports data...');
    const response = await fetch('https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv');
    
    if (!response.ok) {
      throw new Error('Failed to fetch OurAirports data');
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    console.log(`📊 Total lines in CSV: ${lines.length}`);
    console.log(`📊 Data lines (excluding header): ${lines.length - 1}`);

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    console.log('\n📋 OurAirports CSV Headers:');
    console.log('='.repeat(80));
    headers.forEach((header, index) => {
      console.log(`${index.toString().padStart(2)} | ${header}`);
    });

    // Analyze first few data lines
    console.log('\n📝 Sample Data Analysis:');
    console.log('='.repeat(80));
    
    const sampleLines = lines.slice(1, 6); // First 5 data lines
    sampleLines.forEach((line, index) => {
      if (!line.trim()) return;
      
      const fields = parseCSVLine(line);
      console.log(`\n📄 Line ${index + 1}:`);
      
      headers.forEach((header, fieldIndex) => {
        const value = fields[fieldIndex] || '';
        const dataType = getDataType(value);
        console.log(`  ${header.padEnd(20)} | ${value.padEnd(30)} | ${dataType}`);
      });
    });

    // Analyze field types based on sample data
    console.log('\n🔍 Field Type Analysis:');
    console.log('='.repeat(80));
    
    const fieldTypes = {};
    const sampleData = lines.slice(1, 100); // Analyze first 100 lines
    
    sampleData.forEach(line => {
      if (!line.trim()) return;
      
      const fields = parseCSVLine(line);
      headers.forEach((header, index) => {
        const value = fields[index] || '';
        const dataType = getDataType(value);
        
        if (!fieldTypes[header]) {
          fieldTypes[header] = new Set();
        }
        fieldTypes[header].add(dataType);
      });
    });

    Object.entries(fieldTypes).forEach(([field, types]) => {
      const typeList = Array.from(types).join(', ');
      console.log(`${field.padEnd(20)} | ${typeList}`);
    });

    // Check for Romanian airfields specifically
    console.log('\n🇷🇴 Romanian Airfields Analysis:');
    console.log('='.repeat(80));
    
    let romanianAirfields = 0;
    const romanianTypes = {};
    
    sampleData.forEach(line => {
      if (!line.trim()) return;
      
      const fields = parseCSVLine(line);
      const countryIndex = headers.indexOf('iso_country');
      const typeIndex = headers.indexOf('type');
      const nameIndex = headers.indexOf('name');
      
      if (countryIndex >= 0 && fields[countryIndex] === 'RO') {
        romanianAirfields++;
        const type = fields[typeIndex] || 'unknown';
        romanianTypes[type] = (romanianTypes[type] || 0) + 1;
        
        if (romanianAirfields <= 5) {
          const name = fields[nameIndex] || 'Unknown';
          console.log(`  ${name} (${type})`);
        }
      }
    });
    
    console.log(`\nTotal Romanian airfields found: ${romanianAirfields}`);
    console.log('Romanian airfield types:');
    Object.entries(romanianTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Compare with current CruiserApp schema
    console.log('\n🔄 Schema Comparison:');
    console.log('='.repeat(80));
    
    const cruiserAppFields = {
      'name': 'String',
      'code': 'String',
      'type': 'AirfieldType',
      'latitude': 'Float?',
      'longitude': 'Float?',
      'elevation': 'Int?',
      'city': 'String?',
      'state': 'String?',
      'country': 'String?',
      'continent': 'String?',
      'website': 'String?'
    };

    console.log('OurAirports → CruiserApp Mapping:');
    const mapping = {
      'name': 'name',
      'icao_code': 'code',
      'iata_code': 'code (fallback)',
      'local_code': 'code (fallback)',
      'ident': 'code (fallback)',
      'type': 'type (needs conversion)',
      'latitude_deg': 'latitude (needs parseFloat)',
      'longitude_deg': 'longitude (needs parseFloat)',
      'elevation_ft': 'elevation (needs parseInt)',
      'municipality': 'city',
      'iso_region': 'state',
      'iso_country': 'country',
      'continent': 'continent',
      'home_link': 'website'
    };

    Object.entries(mapping).forEach(([ourairports, cruiserapp]) => {
      const headerIndex = headers.indexOf(ourairports);
      if (headerIndex >= 0) {
        console.log(`✅ ${ourairports.padEnd(20)} → ${cruiserapp}`);
      } else {
        console.log(`❌ ${ourairports.padEnd(20)} → ${cruiserapp} (field not found)`);
      }
    });

    // Check current database state
    console.log('\n📊 Current CruiserApp Database State:');
    console.log('='.repeat(80));
    
    try {
      const airfieldCount = await prisma.airfield.count();
      const baseAirfieldCount = await prisma.airfield.count({
        where: { isBase: true }
      });
      
      console.log(`Total airfields in database: ${airfieldCount}`);
      console.log(`Base airfields in database: ${baseAirfieldCount}`);
      
      if (airfieldCount > 0) {
        const sampleAirfield = await prisma.airfield.findFirst();
        console.log('\n📝 Sample Database Airfield:');
        console.log(JSON.stringify(sampleAirfield, null, 2));
      }
    } catch (error) {
      console.log(`❌ Error accessing database: ${error.message}`);
    }

    console.log('\n💡 Key Findings:');
    console.log('='.repeat(80));
    console.log('1. ✅ OurAirports uses string values for all fields (including numbers)');
    console.log('2. ✅ Coordinate fields need parseFloat() conversion');
    console.log('3. ✅ Elevation field needs parseInt() conversion');
    console.log('4. ✅ Type field needs mapping to CruiserApp enum values');
    console.log('5. ✅ Code field should prioritize ICAO > IATA > Local > Ident');
    console.log('6. ⚠️  Some fields like scheduled_service, keywords are not mapped');
    console.log('7. ⚠️  Consider adding runway information if needed');

  } catch (error) {
    console.error('❌ Error analyzing OurAirports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getDataType(value) {
  if (value === '') return 'empty';
  if (value === 'null' || value === 'NULL') return 'null';
  if (!isNaN(value) && value !== '') return 'number';
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') return 'boolean';
  return 'string';
}

// Run the analysis
analyzeOurAirports().catch(console.error); 