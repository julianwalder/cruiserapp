const fs = require('fs');

async function fixCsvSimple() {
  try {
    console.log('🔧 Fixing CSV format (simple approach)...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Replace all line breaks with spaces, then split by double spaces to get records
    const normalized = csvContent.replace(/\n/g, ' ').replace(/\r/g, '');
    
    // Split by double spaces to separate records
    const records = normalized.split('  ').filter(record => record.trim());
    
    // Write the fixed CSV
    const fixedContent = records.join('\n');
    fs.writeFileSync('flight_logs_import_fixed.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_fixed.csv');
    console.log('📊 Original content length:', csvContent.length);
    console.log('📊 Fixed content length:', fixedContent.length);
    console.log('📊 Number of records:', records.length);
    
    // Show first few lines
    console.log('\n📋 First 3 lines of fixed CSV:');
    for (let i = 0; i < Math.min(3, records.length); i++) {
      console.log(`${i + 1}: ${records[i]}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvSimple(); 