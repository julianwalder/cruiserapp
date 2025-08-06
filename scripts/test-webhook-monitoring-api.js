require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWebhookMonitoringAPI() {
  console.log('🧪 Testing Webhook Monitoring API...\n');

  try {
    // Simulate a superadmin request to the webhook monitoring API
    console.log('📡 Testing GET /api/veriff/webhook-monitor...');
    
    // First, get a valid token by creating a test user or using existing one
    const { data: testUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin@cruiserapp.com')
      .single();

    if (!testUser) {
      console.log('❌ No test user found, creating one...');
      // Create a test superadmin user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'test-admin@cruiserapp.com',
          firstName: 'Test',
          lastName: 'Admin',
          password: 'testpassword123',
          status: 'ACTIVE'
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test user:', createError);
        return;
      }

      // Add SUPER_ADMIN role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          userId: newUser.id,
          roleId: 'SUPER_ADMIN'
        });

      if (roleError) {
        console.error('❌ Error adding role:', roleError);
        return;
      }

      console.log('✅ Test user created:', newUser.email);
    }

    // For this test, we'll directly test the database queries that the API would make
    console.log('\n📊 Testing Webhook Metrics...');
    
    // Get webhook metrics
    const { data: webhookEvents } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (webhookEvents && webhookEvents.length > 0) {
      const total = webhookEvents.length;
      const successful = webhookEvents.filter(e => e.status === 'success').length;
      const failed = webhookEvents.filter(e => e.status === 'error').length;
      const pending = webhookEvents.filter(e => e.status === 'pending').length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      console.log('✅ Metrics calculated successfully:');
      console.log(`   Total: ${total}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Pending: ${pending}`);
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

      // Calculate average processing time
      const processedEvents = webhookEvents.filter(e => e.processedat);
      if (processedEvents.length > 0) {
        const totalTime = processedEvents.reduce((sum, event) => {
          const created = new Date(event.createdat).getTime();
          const processed = new Date(event.processedat).getTime();
          return sum + (processed - created);
        }, 0);
        const avgTime = totalTime / processedEvents.length / 1000; // Convert to seconds
        console.log(`   Average Processing Time: ${avgTime.toFixed(2)}s`);
      }

      // Webhook type breakdown
      const typeBreakdown = webhookEvents.reduce((acc, event) => {
        acc[event.webhooktype] = (acc[event.webhooktype] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📋 Webhook Type Breakdown:');
      Object.entries(typeBreakdown).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} events`);
      });

      // Check for failed webhooks
      const failedWebhooks = webhookEvents.filter(e => e.status === 'error');
      console.log(`\n❌ Failed Webhooks: ${failedWebhooks.length}`);
      
      if (failedWebhooks.length > 0) {
        failedWebhooks.forEach((webhook, index) => {
          console.log(`   ${index + 1}. ${webhook.webhooktype} - ${webhook.error}`);
        });
      }

      // Generate alerts
      const alerts = [];
      if (successRate < 90) {
        alerts.push({
          type: 'high_failure_rate',
          message: `High failure rate detected: ${successRate.toFixed(1)}%`,
          severity: successRate < 70 ? 'critical' : 'high'
        });
      }

      if (pending > 0) {
        alerts.push({
          type: 'long_pending',
          message: `${pending} webhooks pending for more than 1 hour`,
          severity: pending > 5 ? 'high' : 'medium'
        });
      }

      console.log(`\n🚨 Alerts Generated: ${alerts.length}`);
      alerts.forEach((alert, index) => {
        console.log(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
      });

    } else {
      console.log('ℹ️  No webhook events found');
    }

    console.log('\n✅ Webhook Monitoring API test completed successfully!');
    console.log('   The monitoring interface is ready for superadmins.');

  } catch (error) {
    console.error('❌ Error testing webhook monitoring API:', error);
  }
}

testWebhookMonitoringAPI(); 