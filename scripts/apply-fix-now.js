console.log('🔧 APPLY THE FIX NOW\n');
console.log('Current constraints (lowercase):');
console.log('- user_roles_userid_fkey');
console.log('- user_roles_roleid_fkey');
console.log('');
console.log('Code expects (camelCase):');
console.log('- user_roles_userId_fkey');
console.log('- user_roles_roleId_fkey\n');

console.log('📋 COPY AND PASTE THIS EXACT SQL IN YOUR SUPABASE SQL EDITOR:\n');
console.log('─'.repeat(80));
console.log(`
-- Fix the constraint name case sensitivity issue
-- Drop the existing constraints with wrong case
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

console.log('\n📍 STEPS:');
console.log('1. Go to https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Click "SQL Editor" in the left sidebar');
console.log('4. Click "New query"');
console.log('5. Copy and paste the SQL above');
console.log('6. Click "Run"');
console.log('7. You should see new constraints: user_roles_userId_fkey and user_roles_roleId_fkey');
console.log('8. Come back and run: node scripts/verify-fix.js\n');

console.log('🎯 This will fix your login issue!'); 