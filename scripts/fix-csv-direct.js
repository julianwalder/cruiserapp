const fs = require('fs');

async function fixCsvDirect() {
  try {
    console.log('🔧 Fixing CSV format (direct approach)...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Replace all line breaks with spaces first
    const normalized = csvContent.replace(/\n/g, ' ').replace(/\r/g, '');
    
    // Split by double spaces to separate records
    const records = normalized.split('  ').filter(record => record.trim());
    
    // Clean up each record
    const cleanedRecords = records.map(record => {
      // Remove extra spaces and normalize
      return record.trim().replace(/\s+/g, ' ');
    });
    
    // Write the fixed CSV
    const fixedContent = cleanedRecords.join('\n');
    fs.writeFileSync('flight_logs_import_direct.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_direct.csv');
    console.log('📊 Original content length:', csvContent.length);
    console.log('📊 Fixed content length:', fixedContent.length);
    console.log('📊 Number of records:', cleanedRecords.length);
    
    // Show first few lines of the fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    const firstLines = cleanedRecords.slice(0, 3);
    firstLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvDirect(); 