const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkExistingConstraints() {
  console.log('🔍 Checking existing foreign key constraints...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test the exact query that's failing to see what constraint name it's looking for
    console.log('📋 Testing the failing query to see what constraint name is expected...');
    
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        password,
        status,
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('email', 'admin@cruiserapp.com')
      .single();

    if (error) {
      console.log('❌ Query failed as expected:', error.message);
      console.log('');
      console.log('🔧 The issue is that the code expects: user_roles_userId_fkey');
      console.log('But the database has a different constraint name.');
      console.log('');
      console.log('📋 SOLUTION: We need to rename the existing constraint.');
      console.log('');
      console.log('Run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('─'.repeat(80));
      console.log(`
-- Fix the constraint name to match what the code expects
-- The code expects 'user_roles_userId_fkey' but we have a different name

-- First, let's see what constraints exist
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

-- Then, drop the existing constraint and recreate with correct name
-- (Replace 'actual_constraint_name' with the name from the query above)

-- ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS actual_constraint_name CASCADE;
-- ALTER TABLE user_roles 
-- ADD CONSTRAINT user_roles_userId_fkey 
-- FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS actual_role_constraint_name CASCADE;
-- ALTER TABLE user_roles 
-- ADD CONSTRAINT user_roles_roleId_fkey 
-- FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;
      `);
      console.log('─'.repeat(80));
      console.log('');
      console.log('📍 Steps:');
      console.log('1. Run the SELECT query first to see existing constraints');
      console.log('2. Note the constraint names from the results');
      console.log('3. Uncomment and modify the ALTER TABLE statements');
      console.log('4. Replace "actual_constraint_name" with the real names');
      console.log('5. Run the ALTER TABLE statements');
      console.log('6. Come back and run: node scripts/verify-fix.js');
    } else {
      console.log('✅ Query succeeded! The constraint is already working.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkExistingConstraints(); 