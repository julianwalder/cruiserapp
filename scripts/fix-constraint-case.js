console.log('🔧 FIX FOR CONSTRAINT NAME CASE SENSITIVITY ISSUE\n');
console.log('The error shows that constraint "user_roles_userid_fkey" already exists.');
console.log('But your code expects "user_roles_userId_fkey" (with camelCase).\n');

console.log('📋 SOLUTION: Drop the existing constraint and recreate with correct case\n');

console.log('Run this SQL in your Supabase SQL Editor:\n');
console.log('─'.repeat(80));
console.log(`
-- Fix the constraint name case sensitivity issue
-- Drop the existing constraint with wrong case
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_userid_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_roleid_fkey CASCADE;

-- Add constraints with correct case that the code expects
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

-- Verify the constraints were created with correct names
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_roles'
ORDER BY tc.constraint_name;
`);
console.log('─'.repeat(80));

console.log('\n📍 Steps:');
console.log('1. Copy the SQL above');
console.log('2. Paste it in your Supabase SQL Editor');
console.log('3. Click "Run"');
console.log('4. You should see the new constraints:');
console.log('   - user_roles_userId_fkey');
console.log('   - user_roles_roleId_fkey');
console.log('5. Come back and run: node scripts/verify-fix.js\n');

console.log('🎯 This will fix the case sensitivity issue and allow your login to work!'); 