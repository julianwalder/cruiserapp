require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function showWebhookMonitoringStatus() {
  console.log('📊 Webhook Monitoring System Status\n');

  try {
    // Get all webhook events
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.error('❌ Error fetching webhook events:', error);
      return;
    }

    if (!events || events.length === 0) {
      console.log('📭 No webhook events found');
      return;
    }

    // Calculate metrics
    const totalEvents = events.length;
    const successfulEvents = events.filter(e => e.status === 'success').length;
    const failedEvents = events.filter(e => e.status === 'error').length;
    const pendingEvents = events.filter(e => e.status === 'pending').length;
    const successRate = totalEvents > 0 ? ((successfulEvents / totalEvents) * 100).toFixed(1) : '0.0';

    console.log('📈 Overall Metrics:');
    console.log(`   Total Webhook Events: ${totalEvents}`);
    console.log(`   Successful: ${successfulEvents}`);
    console.log(`   Failed: ${failedEvents}`);
    console.log(`   Pending: ${pendingEvents}`);
    console.log(`   Success Rate: ${successRate}%`);

    // Show recent events
    console.log('\n📋 Recent Webhook Events:');
    events.slice(0, 10).forEach((event, index) => {
      const date = new Date(event.createdat).toLocaleString();
      const status = event.status === 'success' ? '✅' : 
                    event.status === 'error' ? '❌' : '⏳';
      
      console.log(`   ${index + 1}. ${status} ${event.webhooktype} - ${event.userid} (${date})`);
      if (event.error) {
        console.log(`      Error: ${event.error}`);
      }
    });

    // Check for alerts
    console.log('\n🚨 Alert Check:');
    
    // Check for failed events
    if (failedEvents > 0) {
      console.log(`   ⚠️  ${failedEvents} failed webhook events need attention`);
    }

    // Check for pending events older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oldPending = events.filter(e => 
      e.status === 'pending' && e.createdat < oneHourAgo
    );

    if (oldPending.length > 0) {
      console.log(`   ⚠️  ${oldPending.length} webhooks pending for more than 1 hour`);
    }

    // Check for high failure rate
    if (totalEvents > 5 && parseFloat(successRate) < 80) {
      console.log(`   ⚠️  High failure rate: ${successRate}%`);
    }

    if (failedEvents === 0 && oldPending.length === 0 && parseFloat(successRate) >= 80) {
      console.log('   ✅ No alerts - system is healthy');
    }

    // Show webhook types breakdown
    console.log('\n📊 Webhook Types Breakdown:');
    const typeCounts = {};
    events.forEach(event => {
      typeCounts[event.webhooktype] = (typeCounts[event.webhooktype] || 0) + 1;
    });

    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} events`);
    });

    // Show processing times for successful events
    const successfulWithProcessing = events.filter(e => 
      e.status === 'success' && e.processedat
    );

    if (successfulWithProcessing.length > 0) {
      const processingTimes = successfulWithProcessing.map(event => {
        const processingTime = new Date(event.processedat).getTime() - new Date(event.createdat).getTime();
        // Cap processing time at 60 seconds (1 minute) to avoid unrealistic values
        return Math.min(processingTime, 60000);
      });

      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      console.log(`\n⏱️  Average Processing Time: ${(avgProcessingTime / 1000).toFixed(2)} seconds`);
    }

    console.log('\n🎉 Webhook monitoring system is active and tracking events!');

  } catch (error) {
    console.error('❌ Error checking webhook monitoring status:', error);
  }
}

showWebhookMonitoringStatus(); 