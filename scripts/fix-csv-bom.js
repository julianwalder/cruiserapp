const fs = require('fs');

async function fixCsvBom() {
  try {
    console.log('🔧 Fixing UTF-8 BOM CSV format...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Remove UTF-8 BOM if present
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    
    // Split by line breaks
    const lines = cleanContent.split('\n').filter(line => line.trim());
    
    // Write the fixed CSV without BOM
    const fixedContent = lines.join('\n');
    fs.writeFileSync('flight_logs_import_bom_fixed.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_bom_fixed.csv');
    console.log('📊 Total lines:', lines.length);
    console.log('📊 Content length:', fixedContent.length);
    
    // Show first few lines of the fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    const firstLines = lines.slice(0, 3);
    firstLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
    });
    
    // Also create a version without quotes for testing
    const unquotedLines = lines.map(line => {
      // Remove quotes from each field
      return line.replace(/"/g, '');
    });
    
    const unquotedContent = unquotedLines.join('\n');
    fs.writeFileSync('flight_logs_import_unquoted.csv', unquotedContent);
    
    console.log('\n✅ Unquoted CSV saved as: flight_logs_import_unquoted.csv');
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvBom(); 