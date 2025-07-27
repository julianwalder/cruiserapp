const fs = require('fs');
const path = require('path');

// Test the user import error display functionality
function testUserImportErrors() {
  console.log('🧪 Testing user import error display functionality...');
  
  // Check if test CSV file exists
  const csvPath = path.join(__dirname, '..', 'test-users-with-errors.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('❌ Test CSV file not found. Please create test-users-with-errors.csv first.');
    return;
  }
  
  console.log('📁 Test CSV file found');
  
  // Read and parse the test CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  console.log(`📊 CSV contains ${lines.length - 1} user records`);
  
  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim());
  console.log('📋 Headers:', headers);
  
  // Analyze potential errors in the test data
  console.log('\n📋 Analyzing test data for potential errors:');
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const values = row.split(',').map(v => v.trim());
    
    if (values.length !== headers.length) {
      console.log(`❌ Row ${i + 1}: Column count mismatch`);
      continue;
    }
    
    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index];
    });
    
    console.log(`\n${i}. ${rowData.email} - ${rowData.firstName} ${rowData.lastName}`);
    
    // Check for potential errors
    const errors = [];
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rowData.email)) {
      errors.push(`Invalid email format: ${rowData.email}`);
    }
    
    // Check required fields
    if (!rowData.email || !rowData.firstName || !rowData.lastName) {
      errors.push('Missing required fields (email, firstName, lastName)');
    }
    
    // Check date format
    if (rowData.dateOfBirth) {
      const date = new Date(rowData.dateOfBirth);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format: ${rowData.dateOfBirth}`);
      }
    }
    
    // Check flight hours format
    if (rowData.totalFlightHours && isNaN(parseFloat(rowData.totalFlightHours))) {
      errors.push(`Invalid flight hours format: ${rowData.totalFlightHours}`);
    }
    
    // Check for invalid roles
    if (rowData.roles && rowData.roles.includes('INVALID_ROLE')) {
      errors.push('Invalid role: INVALID_ROLE');
    }
    
    if (errors.length > 0) {
      console.log(`   ❌ Expected errors:`);
      errors.forEach(error => {
        console.log(`      - ${error}`);
      });
    } else {
      console.log(`   ✅ No validation errors expected`);
    }
  }
  
  console.log('\n✅ User import error test completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Navigate to Settings > Users Import tab');
  console.log('   2. Upload the test-users-with-errors.csv file');
  console.log('   3. Check the import summary for error details');
  console.log('   4. Verify that error messages are displayed correctly');
}

testUserImportErrors(); 