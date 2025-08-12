const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testListUsersFunction() {
  console.log('🔍 Testing list_users function...\n');

  try {
    const { data: users, error } = await supabase.rpc('list_users');
    
    if (error) {
      console.error('❌ Error calling list_users:', error);
      return;
    }

    console.log(`📊 Users returned by list_users: ${users.length}`);
    
    if (users.length > 0) {
      console.log('✅ Sample user data:');
      console.log(JSON.stringify(users[0], null, 2));
    }

    // Check if the function returns the expected fields
    const expectedFields = ['id', 'email', 'firstName', 'lastName'];
    const sampleUser = users[0];
    
    console.log('\n🔍 Checking field availability:');
    expectedFields.forEach(field => {
      const hasField = sampleUser && sampleUser.hasOwnProperty(field);
      console.log(`   - ${field}: ${hasField ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testListUsersFunction();
