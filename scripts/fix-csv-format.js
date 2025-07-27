const fs = require('fs');

async function fixCsvFormat() {
  try {
    console.log('🔧 Fixing CSV format...');
    
    // Read the original CSV file
    const csvContent = fs.readFileSync('flight_logs_import.csv', 'utf-8');
    
    // Split by actual line breaks, but be careful with quoted fields
    const lines = csvContent.split('\n');
    
    // Reconstruct the CSV properly
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
      
      if (currentLine === '') {
        currentLine = line;
      } else {
        currentLine += '\n' + line;
      }
      
      // If we're not in quotes, this is a complete line
      if (!inQuotes) {
        // Clean up the line - remove any extra whitespace and normalize
        const cleanedLine = currentLine.trim().replace(/\n/g, ' ');
        fixedLines.push(cleanedLine);
        currentLine = '';
      }
    }
    
    // Handle any remaining line
    if (currentLine.trim()) {
      const cleanedLine = currentLine.trim().replace(/\n/g, ' ');
      fixedLines.push(cleanedLine);
    }
    
    // Write the fixed CSV
    const fixedContent = fixedLines.join('\n');
    fs.writeFileSync('flight_logs_import_fixed.csv', fixedContent);
    
    console.log('✅ Fixed CSV saved as: flight_logs_import_fixed.csv');
    console.log('📊 Original lines:', lines.length);
    console.log('📊 Fixed lines:', fixedLines.length);
    
    // Show first few lines of fixed file
    console.log('\n📋 First 3 lines of fixed CSV:');
    for (let i = 0; i < Math.min(3, fixedLines.length); i++) {
      console.log(`${i + 1}: ${fixedLines[i]}`);
    }
    
    // Also create a simple version without line breaks in fields
    console.log('\n🔧 Creating simplified version...');
    const simpleLines = [];
    for (const line of fixedLines) {
      // Replace any remaining line breaks with spaces
      const simpleLine = line.replace(/\n/g, ' ').replace(/\r/g, '');
      simpleLines.push(simpleLine);
    }
    
    const simpleContent = simpleLines.join('\n');
    fs.writeFileSync('flight_logs_import_simple.csv', simpleContent);
    
    console.log('✅ Simple CSV saved as: flight_logs_import_simple.csv');
    console.log('📊 Simple lines:', simpleLines.length);
    
    // Show first few lines of simple file
    console.log('\n📋 First 3 lines of simple CSV:');
    for (let i = 0; i < Math.min(3, simpleLines.length); i++) {
      console.log(`${i + 1}: ${simpleLines[i]}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing CSV:', error);
  }
}

fixCsvFormat(); 