const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixUserRolesConstraints() {
  console.log('🔧 Fixing user_roles foreign key constraints...\n');

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
    // First, let's check the current structure
    console.log('📋 Checking current user_roles table structure...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (userRolesError) {
      console.error('❌ Error accessing user_roles table:', userRolesError);
      return;
    }

    console.log('✅ user_roles table accessible');
    if (userRoles.length > 0) {
      console.log(`   Sample record:`, userRoles[0]);
    }
    console.log('');

    // Check if the foreign key constraints exist
    console.log('📋 Checking foreign key constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_foreign_key_constraints', { table_name: 'user_roles' });

    if (constraintsError) {
      console.log('⚠️  Could not check constraints via RPC, trying direct query...');
      
      // Try a direct query to check constraints
      const { data: directConstraints, error: directError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'user_roles')
        .eq('constraint_type', 'FOREIGN KEY');

      if (directError) {
        console.error('❌ Error checking constraints:', directError);
        return;
      }

      console.log('📋 Current foreign key constraints:');
      directConstraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}`);
      });
    } else {
      console.log('📋 Current foreign key constraints:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}`);
      });
    }
    console.log('');

    // Check if the expected constraint names exist
    const expectedConstraints = ['user_roles_userId_fkey', 'user_roles_roleId_fkey'];
    const missingConstraints = expectedConstraints.filter(expected => 
      !constraints?.some(c => c.constraint_name === expected) &&
      !directConstraints?.some(c => c.constraint_name === expected)
    );

    if (missingConstraints.length === 0) {
      console.log('✅ All expected constraints exist!');
      return;
    }

    console.log('❌ Missing constraints:', missingConstraints);
    console.log('');
    console.log('🔧 MANUAL SETUP REQUIRED:');
    console.log('');
    console.log('Run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('--- START SQL ---');
    console.log(`
-- Fix user_roles foreign key constraint name mismatch
-- The code expects 'user_roles_userId_fkey' but the database has 'user_roles_user_id_fkey'

-- Drop the existing constraint with the wrong name
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey CASCADE;

-- Add the constraints with the correct names that the code expects
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

-- Verify the constraints exist
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
    `);
    console.log('--- END SQL ---');
    console.log('');
    console.log('📍 Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor"');
    console.log('4. Click "New query"');
    console.log('5. Paste the SQL above');
    console.log('6. Click "Run"');
    console.log('7. Come back and run: node scripts/fix-user-roles-constraints.js');
    console.log('');
    console.log('🎯 This will fix the foreign key constraint name mismatch that is causing the login error.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserRolesConstraints(); 