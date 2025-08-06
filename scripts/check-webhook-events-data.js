require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebhookEventsData() {
  console.log('🔍 Checking Webhook Events Data...\n');

  try {
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.error('❌ Error fetching webhook events:', error);
      return;
    }

    console.log(`📊 Found ${events?.length || 0} webhook events:\n`);

    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`${index + 1}. Event Details:`);
        console.log(`   ID: ${event.id}`);
        console.log(`   User ID: ${event.userid}`);
        console.log(`   Event Type: ${event.eventtype}`);
        console.log(`   Webhook Type: ${event.webhooktype}`);
        console.log(`   Session ID: ${event.sessionid}`);
        console.log(`   Status: ${event.status}`);
        console.log(`   Retry Count: ${event.retrycount}`);
        console.log(`   Created: ${new Date(event.createdat).toLocaleString()}`);
        if (event.processedat) {
          console.log(`   Processed: ${new Date(event.processedat).toLocaleString()}`);
        }
        if (event.error) {
          console.log(`   Error: ${event.error}`);
        }
        console.log('');
      });

      // Calculate breakdown
      const submitted = events.filter(e => e.webhooktype === 'submitted').length;
      const approved = events.filter(e => e.webhooktype === 'approved').length;
      const declined = events.filter(e => e.webhooktype === 'declined').length;
      const unknown = events.filter(e => !['submitted', 'approved', 'declined'].includes(e.webhooktype)).length;

      console.log('📋 Webhook Type Breakdown:');
      console.log(`   submitted: ${submitted} events`);
      console.log(`   approved: ${approved} events`);
      console.log(`   declined: ${declined} events`);
      console.log(`   unknown: ${unknown} events`);

      // Check for any issues
      const successCount = events.filter(e => e.status === 'success').length;
      const errorCount = events.filter(e => e.status === 'error').length;
      const pendingCount = events.filter(e => e.status === 'pending').length;

      console.log('\n📊 Status Breakdown:');
      console.log(`   success: ${successCount} events`);
      console.log(`   error: ${errorCount} events`);
      console.log(`   pending: ${pendingCount} events`);

    } else {
      console.log('ℹ️  No webhook events found in the database');
    }

  } catch (error) {
    console.error('❌ Error checking webhook events data:', error);
  }
}

checkWebhookEventsData(); 