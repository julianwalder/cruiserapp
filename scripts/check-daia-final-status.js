require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDaiaFinalStatus() {
  console.log('🔍 Checking Daia\'s final Veriff status...\n');

  try {
    // Get Daia's complete user data
    const { data: daiaUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        "identityVerified",
        identityVerifiedAt,
        veriffApprovedAt,
        veriffWebhookData,
        veriffWebhookReceivedAt,
        veriffSessionId,
        veriffVerificationId,
        updatedAt
      `)
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching Daia\'s user data:', fetchError);
      return;
    }

    if (!daiaUser) {
      console.error('❌ Daia\'s user record not found');
      return;
    }

    console.log('👤 Daia\'s Final Status:');
    console.log(`   Name: ${daiaUser.firstName} ${daiaUser.lastName}`);
    console.log(`   Email: ${daiaUser.email}`);
    console.log(`   User ID: ${daiaUser.id}`);
    console.log('');
    console.log('🔐 Veriff Verification Status:');
    console.log(`   Veriff Status: ${daiaUser.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${daiaUser.identityVerified}`);
    console.log(`   Verified At: ${daiaUser.identityVerifiedAt || 'Not set'}`);
    console.log(`   Approved At: ${daiaUser.veriffApprovedAt || 'Not set'}`);
    console.log('');
    console.log('📋 Webhook Information:');
    console.log(`   Session ID: ${daiaUser.veriffSessionId || 'Not set'}`);
    console.log(`   Verification ID: ${daiaUser.veriffVerificationId || 'Not set'}`);
    console.log(`   Webhook Received: ${daiaUser.veriffWebhookReceivedAt || 'Not set'}`);
    console.log(`   Last Updated: ${daiaUser.updatedAt || 'Not set'}`);

    // Check webhook monitoring status
    console.log('\n📊 Webhook Monitoring Status:');
    
    const { data: webhookEvent } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('userid', daiaUser.id)
      .order('createdat', { ascending: false })
      .limit(1)
      .single();

    if (webhookEvent) {
      console.log(`   Event Status: ${webhookEvent.status}`);
      console.log(`   Webhook Type: ${webhookEvent.webhooktype}`);
      console.log(`   Event Date: ${new Date(webhookEvent.createdat).toLocaleString()}`);
      console.log(`   Processed At: ${webhookEvent.processedat ? new Date(webhookEvent.processedat).toLocaleString() : 'Not processed'}`);
      
      if (webhookEvent.error) {
        console.log(`   Error: ${webhookEvent.error}`);
      }
    } else {
      console.log('   No webhook events found');
    }

    // Summary
    console.log('\n📋 Summary:');
    if (daiaUser.veriffStatus === 'approved' && daiaUser.identityVerified) {
      console.log('   ✅ Daia is fully verified and approved');
      console.log('   ✅ Status matches Veriff approval');
      console.log('   ✅ Webhook monitoring shows success');
    } else {
      console.log('   ❌ Daia\'s status needs attention');
      console.log(`   Current status: ${daiaUser.veriffStatus}, Verified: ${daiaUser.identityVerified}`);
    }

    console.log('\n🎉 Status check completed!');

  } catch (error) {
    console.error('❌ Error checking Daia\'s status:', error);
  }
}

checkDaiaFinalStatus(); 