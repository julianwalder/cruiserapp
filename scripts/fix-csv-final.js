const fs = require('fs');

async function fixCsvFinal() {
  try {
    console.log('🔧 Fixing CSV format (final approach)...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Split by actual line breaks
    const lines = csvContent.split('\n');
    
    // Reconstruct the CSV properly by handling quoted fields
    const fixedLines = [];
    let currentLine = '';
    let inQuotes = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count quotes in this line
      const quoteCount = (line.match(/"/g) || []).length;
      
      if (quoteCount % 2 === 1) {
        // Odd number of quotes means we're in a quoted field
        inQuotes = !inQuotes;
      }
      
      if (inQuotes) {
        // We're inside a quoted field, append to current line
        currentLine += ' ' + line;
      } else {
        // We're not in a quoted field, this is a complete line
        if (currentLine) {
          currentLine += ' ' + line;
          fixedLines.push(currentLine);
          currentLine = '';
        } else {
          fixedLines.push(line);
        }
      }
    }
    
    // Write the fixed CSV
    const fixedContent = fixedLines.join('\n');
    fs.writeFileSync('flight_logs_import_final.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_final.csv');
    console.log('📊 Original lines:', lines.length);
    console.log('📊 Fixed lines:', fixedLines.length);
    
    // Show first few lines of the fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    const firstLines = fixedLines.slice(0, 3);
    firstLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvFinal(); 