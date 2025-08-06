require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixWebhookTable() {
  console.log('🔧 Fixing webhook_events table structure...\n');

  try {
    // Read the SQL script
    const sqlPath = path.join(__dirname, 'recreate-webhook-events-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Executing SQL to recreate webhook_events table...');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error executing statement:`, error);
          console.log('   Statement:', statement);
          return;
        }
      }
    }

    console.log('✅ Webhook_events table recreated successfully');

    // Test the new table structure
    console.log('\n🧪 Testing new table structure...');
    
    const testEvent = {
      userId: '9043dc12-13d7-4763-a7ac-4d6d8a300ca5',
      eventType: 'received',
      webhookType: 'submitted',
      sessionId: 'test-session-123',
      status: 'pending',
      payload: {
        id: 'test-session-123',
        action: 'submitted',
        feature: 'selfid',
        code: 7002,
        test: true
      },
      retryCount: 0
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert(testEvent)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test event:', insertError);
      return;
    }

    console.log('✅ Test event inserted successfully:', insertedEvent.id);

    // Clean up test data
    await supabase
      .from('webhook_events')
      .delete()
      .eq('id', insertedEvent.id);

    console.log('✅ Test data cleaned up');

    // Verify table structure
    console.log('\n📊 Verifying table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('webhook_events')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.error('❌ Error verifying table structure:', columnsError);
    } else {
      console.log('✅ Table structure verified successfully');
    }

    console.log('\n🎉 Webhook_events table fixed and ready for use!');

  } catch (error) {
    console.error('❌ Error fixing webhook table:', error);
  }
}

fixWebhookTable(); 