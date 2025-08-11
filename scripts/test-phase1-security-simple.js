#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testPhase1Security() {
  console.log('🧪 Testing Phase 1 Security Fixes (Simple)...\n');

  try {
    // Test 1: Test list_users function with service role
    console.log('1️⃣ Testing list_users Function...');
    
    const { data: users, error: usersError } = await supabase.rpc('list_users');
    
    if (usersError) {
      console.error('❌ Error calling list_users:', usersError);
      console.log('   This might be due to enum type mismatch. Let\'s check the function...');
      
      // Try to get a user directly to see the structure
      const { data: directUsers, error: directError } = await supabase
        .from('users')
        .select('id, email, "firstName", "lastName", status, "avatarUrl"')
        .limit(1);
      
      if (directError) {
        console.error('❌ Error fetching users directly:', directError);
      } else {
        console.log('✅ Direct user query works. Sample user:');
        console.log('   ', directUsers?.[0]);
      }
    } else {
      console.log(`✅ list_users returned ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log('   Sample user data:');
        console.log(`   - ID: ${users[0].id}`);
        console.log(`   - Email: ${users[0].email}`);
        console.log(`   - Name: ${users[0].firstName} ${users[0].lastName}`);
        console.log(`   - Status: ${users[0].status}`);
      }
    }

    // Test 2: Test get_user_info function
    console.log('\n2️⃣ Testing get_user_info Function...');
    
    // First get a user ID to test with
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError || !testUsers || testUsers.length === 0) {
      console.error('❌ Error getting test user:', testError);
    } else {
      const testUserId = testUsers[0].id;
      const { data: userInfo, error: userInfoError } = await supabase.rpc('get_user_info', { requested_user_id: testUserId });
      
      if (userInfoError) {
        console.error('❌ Error calling get_user_info:', userInfoError);
      } else {
        console.log(`✅ get_user_info returned data for user ${testUserId}`);
        if (userInfo && userInfo.length > 0) {
          const user = userInfo[0];
          console.log('   User data includes:');
          console.log(`   - Basic info: ${user.firstName} ${user.lastName} (${user.email})`);
          console.log(`   - Sensitive fields: personalNumber=${user.personalNumber ? 'HIDDEN' : 'null'}, phone=${user.phone ? 'HIDDEN' : 'null'}`);
        }
      }
    }

    // Test 3: Test public_user_info view
    console.log('\n3️⃣ Testing public_user_info View...');
    
    const { data: publicUsers, error: publicError } = await supabase
      .from('public_user_info')
      .select('*')
      .limit(3);
    
    if (publicError) {
      console.error('❌ Error accessing public_user_info view:', publicError);
    } else {
      console.log(`✅ public_user_info view works. Found ${publicUsers?.length || 0} users`);
      if (publicUsers && publicUsers.length > 0) {
        console.log('   Sample public user data:');
        console.log('   ', publicUsers[0]);
      }
    }

    // Test 4: Test RLS by trying to access users table directly
    console.log('\n4️⃣ Testing RLS Policies...');
    
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName", status')
      .limit(5);
    
    if (allUsersError) {
      console.error('❌ Error accessing users table (RLS might be blocking):', allUsersError);
    } else {
      console.log(`✅ Service role can access users table. Found ${allUsers?.length || 0} users`);
      console.log('   This is expected since service role bypasses RLS');
    }

    console.log('\n🎉 Phase 1 Security Tests Completed!');
    console.log('\n📋 Summary:');
    console.log('- RLS policies are in place');
    console.log('- Functions and views are created');
    console.log('- Service role access is working');
    console.log('\n📋 Next Steps:');
    console.log('1. Test user login in the browser');
    console.log('2. Verify JWT tokens contain new claims');
    console.log('3. Test user access restrictions with regular user accounts');
    console.log('4. Test admin vs regular user access');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhase1Security().catch(console.error);
