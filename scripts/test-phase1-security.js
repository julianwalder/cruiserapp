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
  console.log('🧪 Testing Phase 1 Security Fixes...\n');

  try {
    // Test 1: Check if new RLS policies are in place
    console.log('1️⃣ Testing RLS Policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_name', 'users')
      .eq('table_schema', 'public');

    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError);
    } else {
      console.log('✅ Found policies for users table:');
      policies?.forEach(policy => {
        console.log(`   - ${policy.policy_name}: ${policy.permissive ? 'ALLOW' : 'DENY'} ${policy.operation}`);
      });
    }

    // Test 2: Check if new functions exist
    console.log('\n2️⃣ Testing New Functions...');
    
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', ['get_user_info', 'list_users']);

    if (functionsError) {
      console.error('❌ Error fetching functions:', functionsError);
    } else {
      console.log('✅ Found functions:');
      functions?.forEach(func => {
        console.log(`   - ${func.routine_name}`);
      });
    }

    // Test 3: Check if public_user_info view exists
    console.log('\n3️⃣ Testing Public User Info View...');
    
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'public_user_info');

    if (viewsError) {
      console.error('❌ Error fetching views:', viewsError);
    } else {
      console.log('✅ Public user info view exists:', views?.length > 0);
    }

    // Test 4: Test list_users function with service role
    console.log('\n4️⃣ Testing list_users Function...');
    
    const { data: users, error: usersError } = await supabase.rpc('list_users');
    
    if (usersError) {
      console.error('❌ Error calling list_users:', usersError);
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

    // Test 5: Test get_user_info function
    console.log('\n5️⃣ Testing get_user_info Function...');
    
    if (users && users.length > 0) {
      const testUserId = users[0].id;
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

    console.log('\n🎉 Phase 1 Security Tests Completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test user login in the browser');
    console.log('2. Verify JWT tokens contain new claims');
    console.log('3. Test user access restrictions');
    console.log('4. Test admin vs regular user access');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhase1Security().catch(console.error);
