require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsersVeriffStatus() {
  console.log('🔍 Checking Users Veriff Status...\n');

  try {
    // Get both users' Veriff data
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        "identityVerified",
        veriffSessionId,
        veriffWebhookReceivedAt,
        veriffApprovedAt,
        veriffSubmittedAt,
        "createdAt",
        "updatedAt"
      `)
      .in('id', [
        '9043dc12-13d7-4763-a7ac-4d6d8a300ca5', // Daia
        '837cd244-17a3-404e-b434-06c60638f5be'  // Walder
      ])
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    console.log(`📊 Found ${users?.length || 0} users with Veriff data:\n`);

    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}):`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
        console.log(`   Identity Verified: ${user.identityVerified ? 'Yes' : 'No'}`);
        console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);
        console.log(`   Webhook Received: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'None'}`);
        console.log(`   Approved At: ${user.veriffApprovedAt ? new Date(user.veriffApprovedAt).toLocaleString() : 'None'}`);
        console.log(`   Submitted At: ${user.veriffSubmittedAt ? new Date(user.veriffSubmittedAt).toLocaleString() : 'None'}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
        console.log(`   Updated: ${new Date(user.updatedAt).toLocaleString()}`);
        console.log('');
      });

      // Analyze the webhook pattern
      console.log('📋 Webhook Pattern Analysis:');
      
      const daia = users.find(u => u.id === '9043dc12-13d7-4763-a7ac-4d6d8a300ca5');
      const walder = users.find(u => u.id === '837cd244-17a3-404e-b434-06c60638f5be');

      if (daia) {
        console.log('\n👤 Daia:');
        console.log(`   Status: ${daia.veriffStatus}`);
        console.log(`   Verified: ${daia.identityVerified ? 'Yes' : 'No'}`);
        console.log(`   Has Session ID: ${daia.veriffSessionId ? 'Yes' : 'No'}`);
        console.log(`   Webhook Events: 1 submitted (captured in monitoring)`);
        console.log(`   Missing: approved webhook (if he was approved)`);
      }

      if (walder) {
        console.log('\n👤 Walder:');
        console.log(`   Status: ${walder.veriffStatus}`);
        console.log(`   Verified: ${walder.identityVerified ? 'Yes' : 'No'}`);
        console.log(`   Has Session ID: ${walder.veriffSessionId ? 'Yes' : 'No'}`);
        console.log(`   Webhook Events: 1 approved (captured in monitoring)`);
        console.log(`   Missing: submitted webhook (when he first submitted)`);
      }

      console.log('\n💡 Explanation:');
      console.log('   The webhook monitoring system was likely set up after some webhooks were processed.');
      console.log('   Only webhooks processed after the monitoring system was active are captured.');
      console.log('   This is why we see incomplete webhook patterns for both users.');

    } else {
      console.log('ℹ️  No users found with the specified IDs');
    }

  } catch (error) {
    console.error('❌ Error checking users Veriff status:', error);
  }
}

checkUsersVeriffStatus(); 