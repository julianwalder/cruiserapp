require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function dropAndRecreateWebhookTable() {
  console.log('🔧 Dropping and recreating webhook_events table...\n');

  try {
    // First, let's try to drop the table using a direct query
    console.log('🗑️  Dropping existing webhook_events table...');
    
    // Try to delete all records first
    const { error: deleteError } = await supabase
      .from('webhook_events')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.log('⚠️  Could not delete records:', deleteError.message);
    } else {
      console.log('✅ All records deleted');
    }

    // Now let's try to create a new table with a different name first
    console.log('\n📋 Creating new webhook_events_new table...');
    
    // We'll create the table by inserting a record with the structure we want
    // This is a workaround since we can't execute DDL directly
    
    // First, let's see what the current table structure looks like
    console.log('🔍 Analyzing current table structure...');
    
    // Try to insert a record with all the fields we need
    const testRecord = {
      id: '00000000-0000-0000-0000-000000000001',
      userId: '9043dc12-13d7-4763-a7ac-4d6d8a300ca5',
      eventType: 'test',
      webhookType: 'test',
      sessionId: 'test-session',
      status: 'pending',
      payload: { test: true },
      error: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      processedAt: null
    };

    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert(testRecord);

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   This shows us exactly what columns are missing');
      
      // Let's try a minimal insert to see what works
      console.log('\n🔍 Trying minimal insert...');
      const minimalRecord = {
        id: '00000000-0000-0000-0000-000000000002',
        payload: { test: true }
      };

      const { error: minimalError } = await supabase
        .from('webhook_events')
        .insert(minimalRecord);

      if (minimalError) {
        console.log('❌ Minimal insert also failed:', minimalError.message);
        console.log('\n💡 The table structure is completely different than expected.');
        console.log('   We need to recreate it manually in the Supabase dashboard.');
        console.log('\n📋 Please run this SQL in your Supabase SQL editor:');
        console.log(`
DROP TABLE IF EXISTS webhook_events CASCADE;

CREATE TABLE webhook_events (
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

CREATE INDEX idx_webhook_events_user_id ON webhook_events(userId);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(createdAt);
CREATE INDEX idx_webhook_events_session_id ON webhook_events(sessionId);
        `);
        return;
      } else {
        console.log('✅ Minimal insert succeeded');
        console.log('   The table has a different structure than expected');
      }
    } else {
      console.log('✅ Full insert succeeded - table structure is correct!');
      
      // Clean up test record
      await supabase
        .from('webhook_events')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000001');
      
      console.log('✅ Test record cleaned up');
      console.log('🎉 Webhook_events table is ready for use!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

dropAndRecreateWebhookTable(); 