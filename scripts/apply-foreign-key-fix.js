const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function applyForeignKeyFix() {
  console.log('🔧 Applying foreign key constraint fix...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    console.log('Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('📋 Step 1: Dropping existing constraints...');
    
    // Drop existing constraints with wrong names
    const dropConstraintsSQL = `
      ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey CASCADE;
      ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey CASCADE;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropConstraintsSQL });
    
    if (dropError) {
      console.log('⚠️  Could not drop constraints via RPC, this is expected if they don\'t exist');
    } else {
      console.log('✅ Dropped existing constraints');
    }

    console.log('📋 Step 2: Adding new constraints with correct names...');
    
    // Add constraints with correct names
    const addConstraintsSQL = `
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_userId_fkey 
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE user_roles 
      ADD CONSTRAINT user_roles_roleId_fkey 
      FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;
    `;
    
    const { error: addError } = await supabase.rpc('exec_sql', { sql: addConstraintsSQL });
    
    if (addError) {
      console.log('❌ Could not add constraints via RPC');
      console.log('Error:', addError);
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('The RPC method failed. Please run this SQL manually in your Supabase SQL Editor:');
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
      console.log('7. Come back and run: node scripts/verify-fix.js');
      return;
    }

    console.log('✅ Added new constraints');
    console.log('');
    console.log('📋 Step 3: Testing the fix...');
    
    // Test the fix
    const { data: user, error: testError } = await supabase
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

    if (testError) {
      console.error('❌ Test failed:', testError);
      console.log('');
      console.log('🔧 The constraints may not have been created correctly.');
      console.log('Please try the manual SQL approach above.');
      return;
    }

    console.log('✅ Test succeeded!');
    console.log('User data:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: user.user_roles?.map(ur => ur.roles.name) || []
    });
    console.log('');
    console.log('🎉 Foreign key constraint fix applied successfully!');
    console.log('');
    console.log('✅ You should now be able to log in to the application.');
    console.log('');
    console.log('📧 Try logging in with:');
    console.log('   Email: admin@cruiserapp.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('🔧 Please use the manual SQL approach instead.');
  }
}

applyForeignKeyFix(); 