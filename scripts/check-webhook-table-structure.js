require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebhookTableStructure() {
  console.log('🔍 Checking webhook_events table structure...\n');

  try {
    // Try to get table information by attempting to select all columns
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .limit(0);

    if (error) {
      console.log('❌ Error accessing webhook_events table:', error.message);
      
      // Try to get basic table info
      const { data: tableInfo, error: tableError } = await supabase
        .from('webhook_events')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('❌ Cannot access webhook_events table at all');
        console.log('   The table might not exist or have different structure');
        return;
      }
    }

    // Try to insert a minimal record to see what columns are missing
    console.log('📝 Testing minimal insert to identify missing columns...');
    
    const minimalEvent = {
      id: 'test-id-123',
      userId: '9043dc12-13d7-4763-a7ac-4d6d8a300ca5',
      payload: { test: true }
    };

    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert(minimalEvent);

    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   This shows what columns are missing or incorrect');
    } else {
      console.log('✅ Minimal insert succeeded');
      
      // Clean up
      await supabase
        .from('webhook_events')
        .delete()
        .eq('id', 'test-id-123');
    }

    // Try to get a sample record to see current structure
    console.log('\n📊 Checking existing records...');
    const { data: sampleRecords, error: sampleError } = await supabase
      .from('webhook_events')
      .select('*')
      .limit(5);

    if (sampleError) {
      console.log('❌ Error fetching sample records:', sampleError.message);
    } else if (sampleRecords && sampleRecords.length > 0) {
      console.log('📋 Current table structure (from sample record):');
      const sampleRecord = sampleRecords[0];
      Object.keys(sampleRecord).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleRecord[key]}`);
      });
    } else {
      console.log('📭 No records found in table');
    }

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  }
}

checkWebhookTableStructure(); 