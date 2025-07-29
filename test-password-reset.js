const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testPasswordReset() {
  console.log('🧪 Testing Password Reset Functionality...\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment Variables:');
  console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    return;
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test 1: Check if password_reset_tokens table exists
    console.log('🔍 Test 1: Checking password_reset_tokens table...');
    const { data: tableTest, error: tableError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table error:', tableError);
      console.log('💡 Try running: npm run setup-password-reset');
      return;
    }
    console.log('✅ password_reset_tokens table exists\n');

    // Test 2: Check if users table exists and has data
    console.log('🔍 Test 2: Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .limit(5);

    if (usersError) {
      console.error('❌ Users table error:', usersError);
      return;
    }
    console.log(`✅ Users table exists with ${users.length} users`);
    if (users.length > 0) {
      console.log('   Sample user:', users[0].email);
    }
    console.log('');

    // Test 3: Try to insert a test token
    if (users.length > 0) {
      console.log('🔍 Test 3: Testing token insertion...');
      const testToken = 'test-token-' + Date.now();
      const { error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: users[0].id,
          token: testToken,
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          used: false,
        });

      if (insertError) {
        console.error('❌ Token insertion error:', insertError);
        return;
      }
      console.log('✅ Token insertion successful');

      // Clean up test token
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', testToken);
      console.log('✅ Test token cleaned up\n');
    }

    console.log('🎉 All tests passed! The password reset service should work correctly.');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Test the forgot password page in your browser');
    console.log('   2. Check the browser console for any errors');
    console.log('   3. Verify email configuration if emails are not sending');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPasswordReset(); 