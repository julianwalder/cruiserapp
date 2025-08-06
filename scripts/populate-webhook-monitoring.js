require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateWebhookMonitoring() {
  console.log('📊 Populating webhook monitoring with existing data...\n');

  try {
    // Get users with webhook data
    console.log('🔍 Fetching users with webhook data...');
    
    const { data: usersWithWebhooks, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffWebhookReceivedAt,
        veriffWebhookData,
        veriffStatus,
        "identityVerified"
      `)
      .not('veriffWebhookReceivedAt', 'is', null)
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users with webhooks:', usersError);
      return;
    }

    if (!usersWithWebhooks || usersWithWebhooks.length === 0) {
      console.log('📭 No users with webhook data found');
      return;
    }

    console.log(`📈 Found ${usersWithWebhooks.length} users with webhook data`);

    // Process each user's webhook data
    let processedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithWebhooks) {
      if (!user.veriffWebhookData) {
        skippedCount++;
        continue;
      }

      try {
        // Determine webhook type and status
        const webhookType = user.veriffWebhookData.action || 
                           user.veriffWebhookData.status || 
                           'unknown';
        
        const status = user.identityVerified ? 'success' : 
                      (user.veriffStatus === 'submitted' ? 'pending' : 'error');

        // Create webhook event record
        const webhookEvent = {
          userid: user.id,
          eventtype: 'received',
          webhooktype: webhookType,
          sessionid: user.veriffWebhookData.sessionId || user.veriffWebhookData.id,
          status: status,
          payload: user.veriffWebhookData,
          error: status === 'error' ? 'Processing failed' : null,
          retrycount: 0,
          createdat: user.veriffWebhookReceivedAt,
          processedat: status === 'success' ? user.veriffWebhookReceivedAt : null
        };

        // Check if this webhook event already exists
        const { data: existingEvent } = await supabase
          .from('webhook_events')
          .select('id')
          .eq('userid', user.id)
          .eq('createdat', user.veriffWebhookReceivedAt)
          .single();

        if (existingEvent) {
          console.log(`⏭️  Skipping ${user.firstName} ${user.lastName} - event already exists`);
          skippedCount++;
          continue;
        }

        // Insert webhook event
        const { error: insertError } = await supabase
          .from('webhook_events')
          .insert(webhookEvent);

        if (insertError) {
          console.error(`❌ Error inserting webhook event for ${user.email}:`, insertError);
          skippedCount++;
        } else {
          console.log(`✅ Created webhook event for ${user.firstName} ${user.lastName} (${webhookType})`);
          processedCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing ${user.email}:`, error);
        skippedCount++;
      }
    }

    // Summary
    console.log('\n📋 Population Summary:');
    console.log(`   Total users with webhooks: ${usersWithWebhooks.length}`);
    console.log(`   Successfully processed: ${processedCount}`);
    console.log(`   Skipped: ${skippedCount}`);

    // Show current monitoring metrics
    console.log('\n📊 Current Monitoring Metrics:');
    
    const { data: allEvents } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (allEvents) {
      const totalEvents = allEvents.length;
      const successfulEvents = allEvents.filter(e => e.status === 'success').length;
      const failedEvents = allEvents.filter(e => e.status === 'error').length;
      const pendingEvents = allEvents.filter(e => e.status === 'pending').length;

      console.log(`   Total webhook events: ${totalEvents}`);
      console.log(`   Successful: ${successfulEvents}`);
      console.log(`   Failed: ${failedEvents}`);
      console.log(`   Pending: ${pendingEvents}`);
      
      if (totalEvents > 0) {
        const successRate = ((successfulEvents / totalEvents) * 100).toFixed(1);
        console.log(`   Success Rate: ${successRate}%`);
      }
    }

    console.log('\n🎉 Webhook monitoring population completed!');

  } catch (error) {
    console.error('❌ Error populating webhook monitoring:', error);
  }
}

populateWebhookMonitoring(); 