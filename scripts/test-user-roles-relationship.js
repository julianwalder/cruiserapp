const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testUserRolesRelationship() {
  console.log('🔧 Testing user_roles foreign key relationship...\n');

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
    // Test the exact query that's failing in the login
    console.log('📋 Testing the failing query from auth.ts...');
    
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
      console.error('❌ Query failed with error:', error);
      console.log('');
      console.log('🔧 This confirms the foreign key constraint issue!');
      console.log('');
      console.log('The error shows that Supabase cannot find the relationship:');
      console.log('user_roles_userId_fkey');
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
      console.log('7. Come back and run: node scripts/test-user-roles-relationship.js');
      console.log('');
      console.log('🎯 This will fix the foreign key constraint name mismatch that is causing the login error.');
    } else {
      console.log('✅ Query succeeded!');
      console.log('User data:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.user_roles?.map(ur => ur.roles.name) || []
      });
      console.log('');
      console.log('🎉 The foreign key relationship is working correctly!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUserRolesRelationship(); 