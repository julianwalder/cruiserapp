const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Analyze current Veriff state
async function analyzeVeriffState() {
  console.log('=== Veriff State Analysis ===\n');

  // Get all users with Veriff data
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .not('veriffSessionId', 'is', null);

  if (error) {
    console.error('Database error:', error);
    return;
  }

  console.log(`Found ${users.length} users with Veriff data:\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. User: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Veriff Session ID: ${user.veriffSessionId || 'None'}`);
    console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${user.identityVerified ? 'Yes' : 'No'}`);
    console.log(`   Veriff Data:`, user.veriffData);
    console.log(`   Updated At: ${user.updatedAt}`);
    console.log('');
  });

  // Analyze webhook data we received
  console.log('=== Webhook Analysis ===\n');
  
  const webhookData = {
    id: "06e4fe9c-8736-4ad3-a2b3-7605d91094ac",
    code: 7002,
    action: "submitted",
    feature: "selfid",
    attemptId: "b55dec60-321b-4b32-ae44-bff850321bac",
    endUserId: null,
    vendorData: "3688d854-3ee7-404b-a1b1-b60f1d8aba2f"
  };

  console.log('Webhook received:');
  console.log(JSON.stringify(webhookData, null, 2));
  console.log('');

  // Find the user associated with this webhook
  const webhookUser = users.find(user => user.id === webhookData.vendorData);
  
  if (webhookUser) {
    console.log('✅ Found user for webhook:');
    console.log(`   Email: ${webhookUser.email}`);
    console.log(`   ID: ${webhookUser.id}`);
    console.log(`   Current Status: ${webhookUser.veriffStatus}`);
    console.log('');
  } else {
    console.log('❌ No user found for webhook vendorData:', webhookData.vendorData);
    console.log('');
  }

  // Check what we can do with the session ID
  if (webhookData.id) {
    console.log('=== Session Analysis ===\n');
    console.log(`Session ID from webhook: ${webhookData.id}`);
    console.log(`Attempt ID: ${webhookData.attemptId}`);
    console.log(`Feature: ${webhookData.feature}`);
    console.log(`Action: ${webhookData.action}`);
    console.log(`Code: ${webhookData.code}`);
    console.log('');

    // Try to find this session in our database
    const sessionUser = users.find(user => user.veriffSessionId === webhookData.id);
    if (sessionUser) {
      console.log('✅ Found user with matching session ID:');
      console.log(`   Email: ${sessionUser.email}`);
      console.log(`   Status: ${sessionUser.veriffStatus}`);
    } else {
      console.log('❌ No user found with matching session ID');
    }
  }

  // Recommendations
  console.log('\n=== Recommendations ===\n');
  
  if (webhookUser && webhookUser.veriffStatus === 'created') {
    console.log('1. ✅ Update user status to "submitted" based on webhook');
    console.log('2. ✅ Store webhook data in veriffData field');
    console.log('3. ✅ Update updatedAt timestamp');
  }

  if (webhookData.code === 7002) {
    console.log('4. ℹ️  Code 7002 indicates SelfID submission - this is normal');
  }

  console.log('5. ℹ️  The 404 errors from API suggest sessions may be expired or API endpoints changed');
  console.log('6. ℹ️  Focus on webhook processing rather than API queries for now');
}

// Run analysis
analyzeVeriffState().catch(console.error); 