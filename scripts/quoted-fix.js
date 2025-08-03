console.log('🔧 TRYING WITH PROPER QUOTING\n');
console.log('You\'re right - let\'s try with proper quotes and different approaches.\n');

console.log('📋 APPROACH 1: With double quotes around constraint names\n');
console.log('Try this first:\n');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "user_roles_userid_fkey" CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('If that works, try this:\n');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "user_roles_roleid_fkey" CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('Then add the new constraints:\n');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles 
ADD CONSTRAINT "user_roles_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles 
ADD CONSTRAINT "user_roles_roleId_fkey" 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('📋 APPROACH 2: If Approach 1 doesn\'t work, try this\n');
console.log('Check if you have the right permissions:\n');
console.log('─'.repeat(60));
console.log(`
SELECT current_user, session_user;
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('📋 APPROACH 3: Try renaming instead of dropping/recreating\n');
console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles RENAME CONSTRAINT "user_roles_userid_fkey" TO "user_roles_userId_fkey";
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('─'.repeat(60));
console.log(`
ALTER TABLE user_roles RENAME CONSTRAINT "user_roles_roleid_fkey" TO "user_roles_roleId_fkey";
`);
console.log('─'.repeat(60));
console.log('Copy this, paste in SQL Editor, click Run\n');

console.log('📋 VERIFICATION:\n');
console.log('After trying any approach, run this to check:\n');
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

console.log('\n🎯 Try these approaches in order:');
console.log('1. Approach 1 (with quotes)');
console.log('2. If that fails, try Approach 2 (check permissions)');
console.log('3. If that fails, try Approach 3 (rename instead of drop/recreate)');
console.log('');
console.log('📞 Tell me:');
console.log('- Which approach you tried');
console.log('- What error message you got (if any)');
console.log('- What the verification query shows'); 