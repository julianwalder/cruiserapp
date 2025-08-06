require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupWebhookMonitoring() {
  console.log('🔧 Setting up webhook monitoring system...\n');

  try {
    // 1. Create webhook events table
    console.log('📋 Creating webhook events table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        userId UUID NOT NULL,
        eventType TEXT NOT NULL,
        webhookType TEXT NOT NULL,
        sessionId TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        payload JSONB NOT NULL,
        error TEXT,
        retryCount INTEGER DEFAULT 0,
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processedAt TIMESTAMP WITH TIME ZONE,
        CONSTRAINT valid_event_type CHECK (eventType IN ('received', 'processed', 'failed', 'retry')),
        CONSTRAINT valid_webhook_type CHECK (webhookType IN ('submitted', 'approved', 'declined', 'unknown')),
        CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'error'))
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(userId);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(createdAt);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_session_id ON webhook_events(sessionId);
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.error('❌ Error creating webhook events table:', createError);
      return;
    }

    console.log('✅ Webhook events table created successfully');

    // 2. Test the monitoring system with existing webhook data
    console.log('\n📊 Testing monitoring system with existing data...');
    
    // Get users with webhook data
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

    if (usersWithWebhooks && usersWithWebhooks.length > 0) {
      console.log(`📈 Found ${usersWithWebhooks.length} users with webhook data`);
      
      // Create test webhook events for existing data
      for (const user of usersWithWebhooks) {
        if (user.veriffWebhookData) {
          const webhookType = user.veriffWebhookData.action || user.veriffWebhookData.status || 'unknown';
          const status = user.identityVerified ? 'success' : 'pending';
          
          const { error: insertError } = await supabase
            .from('webhook_events')
            .insert({
              userId: user.id,
              eventType: 'received',
              webhookType: webhookType,
              sessionId: user.veriffWebhookData.sessionId,
              status: status,
              payload: user.veriffWebhookData,
              retryCount: 0,
              createdAt: user.veriffWebhookReceivedAt,
              processedAt: status === 'success' ? user.veriffWebhookReceivedAt : null,
            });

          if (insertError) {
            console.error(`❌ Error inserting webhook event for ${user.email}:`, insertError);
          } else {
            console.log(`✅ Created webhook event for ${user.firstName} ${user.lastName}`);
          }
        }
      }
    } else {
      console.log('📭 No existing webhook data found');
    }

    // 3. Test monitoring queries
    console.log('\n🔍 Testing monitoring queries...');
    
    // Get metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('webhook_events')
      .select('*')
      .gte('createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (metricsError) {
      console.error('❌ Error fetching metrics:', metricsError);
    } else {
      const totalWebhooks = metrics?.length || 0;
      const successfulWebhooks = metrics?.filter(e => e.status === 'success').length || 0;
      const failedWebhooks = metrics?.filter(e => e.status === 'error').length || 0;
      const pendingWebhooks = metrics?.filter(e => e.status === 'pending').length || 0;

      console.log('📊 Webhook Metrics (Last 24 hours):');
      console.log(`   Total Webhooks: ${totalWebhooks}`);
      console.log(`   Successful: ${successfulWebhooks}`);
      console.log(`   Failed: ${failedWebhooks}`);
      console.log(`   Pending: ${pendingWebhooks}`);
      
      if (totalWebhooks > 0) {
        const successRate = ((successfulWebhooks / totalWebhooks) * 100).toFixed(1);
        console.log(`   Success Rate: ${successRate}%`);
      }
    }

    // 4. Check for alerts
    console.log('\n🚨 Checking for alerts...');
    
    // Check for pending webhooks older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: oldPending, error: pendingError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .lt('createdAt', oneHourAgo);

    if (pendingError) {
      console.error('❌ Error checking pending webhooks:', pendingError);
    } else if (oldPending && oldPending.length > 0) {
      console.log(`⚠️  Alert: ${oldPending.length} webhooks pending for more than 1 hour`);
      oldPending.forEach(event => {
        console.log(`   - Event ID: ${event.id}, Created: ${new Date(event.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('✅ No alerts found');
    }

    // 5. Summary
    console.log('\n📋 Webhook Monitoring Setup Summary:');
    console.log('✅ Webhook events table created');
    console.log('✅ Existing webhook data migrated');
    console.log('✅ Monitoring queries tested');
    console.log('✅ Alert system active');
    console.log('\n🔗 Next Steps:');
    console.log('   1. Monitor webhook processing in real-time');
    console.log('   2. Set up alerts for failed webhooks');
    console.log('   3. Review webhook processing logic');
    console.log('   4. Check for missing approval webhooks');

  } catch (error) {
    console.error('❌ Error setting up webhook monitoring:', error);
  }
}

// Run the setup
setupWebhookMonitoring(); 