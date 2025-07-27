const fs = require('fs');

async function fixCsvQuoted() {
  try {
    console.log('🔧 Fixing quoted CSV format...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Remove UTF-8 BOM if present
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    
    // Split by actual line breaks
    const lines = cleanContent.split('\n');
    
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
        currentLine += (currentLine ? ' ' : '') + line;
      } else {
        // We're not in a quoted field, this is a complete line
        if (currentLine) {
          currentLine += (currentLine ? ' ' : '') + line;
          fixedLines.push(currentLine);
          currentLine = '';
        } else {
          fixedLines.push(line);
        }
      }
    }
    
    // Write the fixed CSV
    const fixedContent = fixedLines.join('\n');
    fs.writeFileSync('flight_logs_import_quoted_fixed.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_quoted_fixed.csv');
    console.log('📊 Original lines:', lines.length);
    console.log('📊 Fixed lines:', fixedLines.length);
    
    // Show first few lines of the fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    const firstLines = fixedLines.slice(0, 3);
    firstLines.forEach((line, index) => {
      console.log(`${index + 1}: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvQuoted(); 