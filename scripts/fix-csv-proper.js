const fs = require('fs');

async function fixCsvProper() {
  try {
    console.log('🔧 Fixing CSV format (proper approach)...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Split by spaces to get all fields
    const allFields = csvContent.split(/\s+/).filter(field => field.trim());
    
    // Expected number of fields per record (based on the header)
    const expectedFields = 18; // date,pilot_email,aircraft_callsign,departure_airfield_code,arrival_airfield_code,departure_time,arrival_time,instructor_email,flight_type,purpose,remarks,departure_hobbs,arrival_hobbs,day_landings,night_landings,route,conditions,oil_added,fuel_added
    
    // Reconstruct records
    const records = [];
    for (let i = 0; i < allFields.length; i += expectedFields) {
      const record = allFields.slice(i, i + expectedFields);
      if (record.length === expectedFields) {
        records.push(record.join(','));
      }
    }
    
    // Write the fixed CSV
    const fixedContent = records.join('\n');
    fs.writeFileSync('flight_logs_import_proper.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_proper.csv');
    console.log('📊 Total fields found:', allFields.length);
    console.log('📊 Expected fields per record:', expectedFields);
    console.log('📊 Number of complete records:', records.length);
    
    // Show first few lines of the fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    const firstLines = records.slice(0, 3);
    firstLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvProper(); 