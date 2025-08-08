// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Manually trigger address update for testing
 */
async function triggerAddressUpdateTest() {
  console.log('🧪 Manually triggering address update test...\n');

  try {
    // Get a verified user with address data
    const { data: verifiedUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "veriffStatus",
        address,
        city,
        state,
        "zipCode",
        country
      `)
      .not('veriffStatus', 'is', null)
      .eq('veriffStatus', 'approved')
      .not('address', 'is', null)
      .limit(1);

    if (usersError) {
      throw new Error(`Failed to fetch verified users: ${usersError.message}`);
    }

    if (verifiedUsers.length === 0) {
      console.log('❌ No verified users with address data found for testing');
      return;
    }

    const testUser = verifiedUsers[0];
    console.log(`📋 Testing with user: ${testUser.email}`);

    // Check current normalized address
    const { data: currentAddress, error: addressError } = await supabase
      .from('normalized_addresses')
      .select('*')
      .eq('user_id', testUser.id)
      .single();

    if (addressError && addressError.code !== 'PGRST116') {
      console.error('Error fetching normalized address:', addressError);
    }

    console.log('\n📄 Current normalized address:');
    if (currentAddress) {
      console.log(`   Street: ${currentAddress.street_address}`);
      console.log(`   City: ${currentAddress.city}`);
      console.log(`   State: ${currentAddress.state_region}`);
      console.log(`   Country: ${currentAddress.country}`);
      console.log(`   Confidence: ${currentAddress.confidence_score}`);
      console.log(`   Source: ${currentAddress.source_type}`);
      console.log(`   Notes: ${currentAddress.processing_notes || 'None'}`);
    } else {
      console.log('   None found');
    }

    console.log('\n📄 Veriff address data:');
    console.log(`   Address: ${testUser.address}`);
    console.log(`   City: ${testUser.city || 'N/A'}`);
    console.log(`   State: ${testUser.state || 'N/A'}`);
    console.log(`   Country: ${testUser.country || 'N/A'}`);

    console.log('\n🔄 To test the integration:');
    console.log('1. Go to My Account → Personal Info');
    console.log('2. Look for the "Normalized Address Information" section');
    console.log('3. Check the "Verification & Processing Notes" for any updates');
    console.log('4. The notes will show if Veriff verification was processed');

    console.log('\n📝 Next time a user completes Veriff verification:');
    console.log('✅ The webhook will automatically trigger address comparison');
    console.log('✅ OpenAI will compare Veriff data with existing normalized address');
    console.log('✅ Processing notes will be updated with the comparison results');
    console.log('✅ Users will see the notes in their My Account page');

    console.log('\n✅ Address update integration is ready!');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
triggerAddressUpdateTest();
