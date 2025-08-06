require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableColumns() {
  console.log('🔍 Checking webhook_events table columns...\n');

  try {
    // Try to get information about the table by attempting different column names
    const possibleColumns = [
      'id', 'user_id', 'userId', 'userid',
      'event_type', 'eventType', 'eventtype',
      'webhook_type', 'webhookType', 'webhooktype',
      'session_id', 'sessionId', 'sessionid',
      'status', 'payload', 'error', 'retry_count', 'retryCount', 'retrycount',
      'created_at', 'createdAt', 'createdat',
      'processed_at', 'processedAt', 'processedat'
    ];

    console.log('📋 Testing column names...');
    
    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('webhook_events')
          .select(column)
          .limit(1);
        
        if (!error) {
          console.log(`✅ Column exists: ${column}`);
        }
      } catch (e) {
        // Column doesn't exist
      }
    }

    // Try to get a sample record to see the actual structure
    console.log('\n📊 Trying to get table structure...');
    
    // Try different approaches to get table info
    const { data: sample1, error: error1 } = await supabase
      .from('webhook_events')
      .select('*')
      .limit(1);

    if (error1) {
      console.log('❌ Cannot select all columns:', error1.message);
      
      // Try to select just id
      const { data: sample2, error: error2 } = await supabase
        .from('webhook_events')
        .select('id')
        .limit(1);
      
      if (error2) {
        console.log('❌ Cannot even select id column:', error2.message);
        console.log('\n💡 The table might not exist or have a completely different structure.');
        console.log('   Please check the table name and structure in your Supabase dashboard.');
      } else {
        console.log('✅ At least id column exists');
      }
    } else {
      console.log('✅ Can select all columns');
      if (sample1 && sample1.length > 0) {
        console.log('📋 Actual table structure:');
        Object.keys(sample1[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof sample1[0][key]}`);
        });
      } else {
        console.log('📭 Table is empty but structure is accessible');
      }
    }

  } catch (error) {
    console.error('❌ Error checking table columns:', error);
  }
}

checkTableColumns(); 