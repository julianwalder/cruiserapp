const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkIfFixApplied() {
  console.log('🔍 CHECKING IF THE FIX HAS BEEN APPLIED...\n');

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
    // Test the exact query that's failing
    console.log('📋 Testing the login query...');
    
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
      console.log('❌ The fix has NOT been applied yet.');
      console.log('Error:', error.message);
      console.log('');
      console.log('🔧 YOU STILL NEED TO APPLY THE FIX:');
      console.log('');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Click "SQL Editor"');
      console.log('3. Click "New query"');
      console.log('4. Copy and paste this SQL:');
      console.log('');
      console.log('─'.repeat(60));
      console.log(`
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_userid_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_roleid_fkey CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;
      `);
      console.log('─'.repeat(60));
      console.log('');
      console.log('5. Click "Run"');
      console.log('6. Come back and run this script again');
      console.log('');
      console.log('⚠️  The constraints still have lowercase names, which means the SQL hasn\'t been executed yet.');
    } else {
      console.log('✅ GREAT! The fix has been applied successfully!');
      console.log('User data:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.user_roles?.map(ur => ur.roles.name) || []
      });
      console.log('');
      console.log('🎉 Your login should now work!');
      console.log('');
      console.log('🔑 Try logging in with:');
      console.log('   Email: admin@cruiserapp.com');
      console.log('   Password: admin123');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkIfFixApplied(); 