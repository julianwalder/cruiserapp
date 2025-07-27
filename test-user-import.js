const fs = require('fs');
const path = require('path');

// Create a test CSV file
const testCsvContent = `email,firstName,lastName,personalNumber,phone,dateOfBirth,address,city,state,zipCode,country,status,totalFlightHours,licenseNumber,medicalClass,instructorRating,roles
john.doe@example.com,John,Doe,1234567890123,+1234567890,1990-01-01,123 Main St,New York,NY,10001,USA,ACTIVE,150.5,PPL-123456,Class 2,CFI,PILOT,STUDENT
jane.smith@example.com,Jane,Smith,9876543210987,+1987654321,1985-05-15,456 Oak Ave,Los Angeles,CA,90210,USA,ACTIVE,75.0,STU-789012,Class 3,,STUDENT
bob.wilson@example.com,Bob,Wilson,5556667778889,+1555666777,1978-12-20,789 Pine Rd,Chicago,IL,60601,USA,ACTIVE,300.0,CPL-345678,Class 1,CFII,INSTRUCTOR,PILOT`;

// Write the test CSV file
fs.writeFileSync('test-users-import.csv', testCsvContent);

console.log('✅ Test CSV file created: test-users-import.csv');
console.log('📋 CSV contains 3 test users with different roles and data');
console.log('');
console.log('To test the import functionality:');
console.log('1. Log in as Super Admin (admin@cruiseraviation.com / admin123)');
console.log('2. Go to User Management tab');
console.log('3. Click "Download Template" to get the official template');
console.log('4. Click "Import Users" and upload the test CSV file');
console.log('5. Check the import results');
console.log('');
console.log('Expected results:');
console.log('- 3 users should be created successfully');
console.log('- Each user should have the specified roles assigned');
console.log('- Passwords will be auto-generated if not provided'); 