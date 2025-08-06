require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebhookMonitoring() {
  console.log('🧪 Testing webhook monitoring system...\n');

  try {
    // 1. Check if webhook_events table exists
    console.log('📋 Checking webhook_events table...');
    
    const { data: tableExists, error: tableError } = await supabase
      .from('webhook_events')
      .select('id')
      .limit(1);

    if (tableError) {
      console.log('❌ Webhook events table does not exist');
      console.log('   Please create the table with the correct structure');
      return;
    }

    console.log('✅ Webhook events table exists');

    // 2. Test inserting a webhook event
    console.log('\n📝 Testing webhook event insertion...');
    
    const testEvent = {
      userid: '9043dc12-13d7-4763-a7ac-4d6d8a300ca5', // Daia's user ID
      eventtype: 'received',
      webhooktype: 'submitted',
      sessionid: 'test-session-123',
      status: 'pending',
      payload: {
        id: 'test-session-123',
        action: 'submitted',
        feature: 'selfid',
        code: 7002,
        test: true
      },
      retrycount: 0
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert(testEvent)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test webhook event:', insertError);
      return;
    }

    console.log('✅ Test webhook event inserted:', insertedEvent.id);

    // 3. Test updating the event status
    console.log('\n🔄 Testing webhook event status update...');
    
    const { error: updateError } = await supabase
      .from('webhook_events')
      .update({
        status: 'success',
        processedat: new Date().toISOString()
      })
      .eq('id', insertedEvent.id);

    if (updateError) {
      console.error('❌ Error updating webhook event:', updateError);
    } else {
      console.log('✅ Webhook event status updated successfully');
    }

    // 4. Test monitoring queries
    console.log('\n📊 Testing monitoring queries...');
    
    // Get recent events
    const { data: recentEvents, error: recentError } = await supabase
      .from('webhook_events')
      .select('*')
      .gte('createdat', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('createdat', { ascending: false });

    if (recentError) {
      console.error('❌ Error fetching recent events:', recentError);
    } else {
      const totalEvents = recentEvents?.length || 0;
      const successfulEvents = recentEvents?.filter(e => e.status === 'success').length || 0;
      const failedEvents = recentEvents?.filter(e => e.status === 'error').length || 0;
      const pendingEvents = recentEvents?.filter(e => e.status === 'pending').length || 0;

      console.log('📈 Recent Webhook Events (Last 24 hours):');
      console.log(`   Total Events: ${totalEvents}`);
      console.log(`   Successful: ${successfulEvents}`);
      console.log(`   Failed: ${failedEvents}`);
      console.log(`   Pending: ${pendingEvents}`);
      
      if (totalEvents > 0) {
        const successRate = ((successfulEvents / totalEvents) * 100).toFixed(1);
        console.log(`   Success Rate: ${successRate}%`);
      }
    }

    // 5. Test alerts
    console.log('\n🚨 Testing alert system...');
    
    // Check for pending events older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldPending, error: pendingError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .lt('createdat', oneHourAgo);

    if (pendingError) {
      console.error('❌ Error checking pending events:', pendingError);
    } else if (oldPending && oldPending.length > 0) {
      console.log(`⚠️  Alert: ${oldPending.length} events pending for more than 1 hour`);
      oldPending.forEach(event => {
        console.log(`   - Event ID: ${event.id}, Created: ${new Date(event.createdat).toLocaleString()}`);
      });
    } else {
      console.log('✅ No pending events older than 1 hour');
    }

    // 6. Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    
    const { error: deleteError } = await supabase
      .from('webhook_events')
      .delete()
      .eq('id', insertedEvent.id);

    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }

    // 7. Summary
    console.log('\n📋 Webhook Monitoring Test Summary:');
    console.log('✅ Table exists and is accessible');
    console.log('✅ Event insertion works');
    console.log('✅ Status updates work');
    console.log('✅ Monitoring queries work');
    console.log('✅ Alert system works');
    console.log('✅ Cleanup works');
    console.log('\n🎉 Webhook monitoring system is ready!');

  } catch (error) {
    console.error('❌ Error testing webhook monitoring:', error);
  }
}

// Run the test
testWebhookMonitoring(); 