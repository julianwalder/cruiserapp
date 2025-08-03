console.log('🔧 SIMPLE DIRECT FIX\n');
console.log('The SQL is only running the SELECT query, not the ALTER TABLE statements.\n');
console.log('Let\'s try a simpler approach that should definitely work.\n');

console.log('📋 RUN THESE SQL STATEMENTS ONE BY ONE:\n');

console.log('STEP 1: Drop the first constraint');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles DROP CONSTRAINT user_roles_userid_fkey CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('STEP 2: Drop the second constraint');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles DROP CONSTRAINT user_roles_roleid_fkey CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('STEP 3: Add the first constraint with correct name');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('STEP 4: Add the second constraint with correct name');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('STEP 5: Verify the constraints');
console.log('─'.repeat(60));
console.log(`
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
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('🎯 After each step:');
console.log('- You should see "Success" or similar confirmation');
console.log('- If you get an error, let me know what it says');
console.log('- After Step 5, you should see:');
console.log('  * user_roles_userId_fkey');
console.log('  * user_roles_roleId_fkey\n');

console.log('📞 If any step fails, tell me:');
console.log('- Which step failed');
console.log('- What error message you got');
console.log('- What the output was'); 