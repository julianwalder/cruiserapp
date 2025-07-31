const fs = require('fs');
const path = require('path');

console.log('🚀 PPL Course Setup - Corrected Version');
console.log('');
console.log('The previous SQL had a data type mismatch. The users table uses TEXT IDs, not UUID.');
console.log('Here is the corrected SQL that you need to run in your Supabase SQL editor:');
console.log('');

// Read the corrected SQL file
const sqlPath = path.join(__dirname, 'setup-ppl-courses-corrected.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

console.log(sqlContent);
console.log('');
console.log('📋 Key changes made:');
console.log('   - Changed user_id from UUID to TEXT to match users table');
console.log('   - Updated RLS policies to use auth.uid()::text for proper comparison');
console.log('   - Maintained company_id as UUID (companies table uses UUID)');
console.log('');
console.log('After running this SQL, you can test the setup with:');
console.log('node scripts/test-ppl-setup.js');
console.log('');
console.log('Then process PPL courses for stefanmladinradu@gmail.com with:');
console.log('node scripts/debug-ppl-course.js stefanmladinradu@gmail.com'); 