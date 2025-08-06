require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkVeriffApprovalWebhook() {
  console.log('🔍 Checking for Daia\'s approval webhook...\n');

  try {
    // Check webhook events for Daia
    console.log('📋 Checking webhook events for Daia...');
    
    const { data: webhookEvents, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('userid', '9043dc12-13d7-4763-a7ac-4d6d8a300ca5')
      .order('createdat', { ascending: false });

    if (webhookError) {
      console.error('❌ Error fetching webhook events:', webhookError);
      return;
    }

    if (!webhookEvents || webhookEvents.length === 0) {
      console.log('📭 No webhook events found for Daia');
      return;
    }

    console.log(`📊 Found ${webhookEvents.length} webhook events for Daia:`);
    
    webhookEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.webhooktype} - ${event.status} (${new Date(event.createdat).toLocaleString()})`);
      if (event.error) {
        console.log(`      Error: ${event.error}`);
      }
    });

    // Check if there's an approval webhook
    const approvalWebhook = webhookEvents.find(event => event.webhooktype === 'approved');
    
    if (approvalWebhook) {
      console.log('\n✅ Found approval webhook!');
      console.log('📄 Approval webhook data:');
      console.log(JSON.stringify(approvalWebhook.payload, null, 2));
      
      // Check if this approval webhook has personal data
      if (approvalWebhook.payload.person) {
        console.log('\n👤 Personal data found in approval webhook:');
        console.log(`   Given Name: ${approvalWebhook.payload.person.givenName || 'Not available'}`);
        console.log(`   Last Name: ${approvalWebhook.payload.person.lastName || 'Not available'}`);
        console.log(`   ID Number (CNP): ${approvalWebhook.payload.person.idNumber || 'Not available'}`);
        console.log(`   Date of Birth: ${approvalWebhook.payload.person.dateOfBirth || 'Not available'}`);
        console.log(`   Nationality: ${approvalWebhook.payload.person.nationality || 'Not available'}`);
        console.log(`   Gender: ${approvalWebhook.payload.person.gender || 'Not available'}`);
        console.log(`   Country: ${approvalWebhook.payload.person.country || 'Not available'}`);
      }
      
      if (approvalWebhook.payload.document) {
        console.log('\n📄 Document data found in approval webhook:');
        console.log(`   Document Type: ${approvalWebhook.payload.document.type || 'Not available'}`);
        console.log(`   Document Number: ${approvalWebhook.payload.document.number || 'Not available'}`);
        console.log(`   Document Country: ${approvalWebhook.payload.document.country || 'Not available'}`);
        console.log(`   Valid From: ${approvalWebhook.payload.document.validFrom || 'Not available'}`);
        console.log(`   Valid Until: ${approvalWebhook.payload.document.validUntil || 'Not available'}`);
        console.log(`   Issued By: ${approvalWebhook.payload.document.issuedBy || 'Not available'}`);
      }
    } else {
      console.log('\n⚠️  No approval webhook found for Daia');
      console.log('   This means either:');
      console.log('   1. The approval webhook hasn\'t been sent yet');
      console.log('   2. The approval webhook was sent but not received');
      console.log('   3. The approval webhook was sent to a different endpoint');
    }

    // Check activity logs for any Veriff-related activity
    console.log('\n📝 Checking activity logs for Veriff activity...');
    
    const { data: activities, error: activityError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('userId', '9043dc12-13d7-4763-a7ac-4d6d8a300ca5')
      .ilike('action', '%veriff%')
      .order('timestamp', { ascending: false });

    if (activityError) {
      console.error('❌ Error fetching activity logs:', activityError);
    } else if (activities && activities.length > 0) {
      console.log(`📊 Found ${activities.length} Veriff-related activities:`);
      activities.forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.action} - ${new Date(activity.timestamp).toLocaleString()}`);
        if (activity.details) {
          console.log(`      Details: ${JSON.stringify(activity.details)}`);
        }
      });
    } else {
      console.log('📭 No Veriff-related activities found');
    }

    // Check if we need to manually trigger a webhook check
    console.log('\n🔧 Next Steps:');
    console.log('   1. Check Veriff dashboard for Daia\'s session status');
    console.log('   2. Verify webhook endpoint is correctly configured');
    console.log('   3. Check if approval webhook was sent to a different URL');
    console.log('   4. Consider manually fetching verification data from Veriff API');

  } catch (error) {
    console.error('❌ Error checking approval webhook:', error);
  }
}

checkVeriffApprovalWebhook(); 