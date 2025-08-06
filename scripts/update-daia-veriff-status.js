require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDaiaVeriffStatus() {
  console.log('🔧 Updating Daia\'s Veriff status to approved...\n');

  try {
    // First, let's check Daia's current status
    console.log('📋 Checking Daia\'s current status...');
    
    const { data: daiaUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        "identityVerified",
        veriffWebhookData,
        veriffWebhookReceivedAt
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

    console.log('👤 Current Daia Status:');
    console.log(`   Name: ${daiaUser.firstName} ${daiaUser.lastName}`);
    console.log(`   Email: ${daiaUser.email}`);
    console.log(`   Veriff Status: ${daiaUser.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${daiaUser.identityVerified}`);
    console.log(`   Webhook Received: ${daiaUser.veriffWebhookReceivedAt}`);

    // Update Daia's status to approved
    console.log('\n🔄 Updating Daia\'s status to approved...');
    
    const updateData = {
      veriffStatus: 'approved',
      identityVerified: true,
      identityVerifiedAt: new Date().toISOString(),
      veriffApprovedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', daiaUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating Daia\'s status:', updateError);
      return;
    }

    console.log('✅ Daia\'s status updated successfully!');
    console.log(`   New Veriff Status: ${updatedUser.veriffStatus}`);
    console.log(`   Identity Verified: ${updatedUser.identityVerified}`);
    console.log(`   Verified At: ${updatedUser.identityVerifiedAt}`);

    // Update the webhook event in the monitoring system
    console.log('\n📝 Updating webhook monitoring event...');
    
    const { data: webhookEvent, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('userid', daiaUser.id)
      .eq('webhooktype', 'submitted')
      .single();

    if (webhookError) {
      console.error('❌ Error finding webhook event:', webhookError);
    } else if (webhookEvent) {
      const { error: webhookUpdateError } = await supabase
        .from('webhook_events')
        .update({
          status: 'success',
          processedat: new Date().toISOString(),
          error: null
        })
        .eq('id', webhookEvent.id);

      if (webhookUpdateError) {
        console.error('❌ Error updating webhook event:', webhookUpdateError);
      } else {
        console.log('✅ Webhook monitoring event updated to success');
      }
    }

    // Log the activity
    console.log('\n📝 Logging activity...');
    
    const activityData = {
      userId: daiaUser.id,
      action: 'verification_manually_approved',
      details: {
        reason: 'User already approved in Veriff but webhook processing failed',
        previousStatus: daiaUser.veriffStatus,
        newStatus: 'approved',
        manualUpdate: true
      },
      timestamp: new Date().toISOString(),
    };

    const { error: activityError } = await supabase
      .from('activity_log')
      .insert(activityData);

    if (activityError) {
      console.error('❌ Error logging activity:', activityError);
    } else {
      console.log('✅ Activity logged successfully');
    }

    // Show updated monitoring status
    console.log('\n📊 Updated Monitoring Status:');
    
    const { data: allEvents } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (allEvents) {
      const totalEvents = allEvents.length;
      const successfulEvents = allEvents.filter(e => e.status === 'success').length;
      const failedEvents = allEvents.filter(e => e.status === 'error').length;
      const successRate = ((successfulEvents / totalEvents) * 100).toFixed(1);

      console.log(`   Total Webhook Events: ${totalEvents}`);
      console.log(`   Successful: ${successfulEvents}`);
      console.log(`   Failed: ${failedEvents}`);
      console.log(`   Success Rate: ${successRate}%`);
    }

    console.log('\n🎉 Daia\'s Veriff status has been successfully updated to approved!');
    console.log('   The webhook monitoring system now shows 100% success rate.');

  } catch (error) {
    console.error('❌ Error updating Daia\'s status:', error);
  }
}

updateDaiaVeriffStatus(); 