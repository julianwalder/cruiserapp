console.log('🔧 ROBUST FIX FOR CONSTRAINT ISSUE\n');
console.log('The SQL didn\'t execute successfully. Let\'s try a different approach.\n');

console.log('📋 ISSUE: The constraints still have lowercase names:');
console.log('- user_roles_userid_fkey');
console.log('- user_roles_roleid_fkey');
console.log('');
console.log('But the code expects camelCase names:');
console.log('- user_roles_userId_fkey');
console.log('- user_roles_roleId_fkey\n');

console.log('🛠️  ROBUST SOLUTION:\n');
console.log('Run this SQL in your Supabase SQL Editor:\n');
console.log('─'.repeat(80));
console.log(`
-- Robust fix for constraint name issue
-- First, let's see what we're working with
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_roles'
ORDER BY tc.constraint_name;

-- Now let's try to drop and recreate the constraints
-- We'll do this step by step to avoid any issues

-- Step 1: Drop existing constraints (if they exist)
DO $$ 
BEGIN
    -- Drop user constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_userid_fkey'
    ) THEN
        ALTER TABLE user_roles DROP CONSTRAINT user_roles_userid_fkey CASCADE;
        RAISE NOTICE 'Dropped user_roles_userid_fkey';
    ELSE
        RAISE NOTICE 'user_roles_userid_fkey does not exist';
    END IF;
    
    -- Drop role constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_roleid_fkey'
    ) THEN
        ALTER TABLE user_roles DROP CONSTRAINT user_roles_roleid_fkey CASCADE;
        RAISE NOTICE 'Dropped user_roles_roleid_fkey';
    ELSE
        RAISE NOTICE 'user_roles_roleid_fkey does not exist';
    END IF;
END $$;

-- Step 2: Add new constraints with correct names
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

-- Step 3: Verify the new constraints
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
console.log('1. Copy the entire SQL block above');
console.log('2. Paste it in your Supabase SQL Editor');
console.log('3. Click "Run"');
console.log('4. Look for any error messages or NOTICE messages');
console.log('5. Check the final SELECT query results');
console.log('6. You should see: user_roles_userId_fkey and user_roles_roleId_fkey');
console.log('7. Come back and run: node scripts/check-if-fix-applied.js\n');

console.log('🎯 This approach:');
console.log('- Uses DO block for safer constraint dropping');
console.log('- Provides detailed feedback about what\'s happening');
console.log('- Handles cases where constraints might not exist');
console.log('- Verifies the results at the end'); 