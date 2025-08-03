const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyFix() {
  console.log('🔍 Verifying foreign key constraint fix...\n');

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
    // Test the exact query that was failing
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
      console.error('❌ Query still failing:', error);
      console.log('');
      console.log('🔧 The fix may not have been applied correctly.');
      console.log('Please make sure you ran the SQL script in Supabase SQL Editor.');
      return;
    }

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
    console.log('🎉 The foreign key relationship is now working correctly!');
    console.log('');
    console.log('✅ You should now be able to log in to the application.');
    console.log('');
    console.log('📧 Try logging in with:');
    console.log('   Email: admin@cruiserapp.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyFix(); 