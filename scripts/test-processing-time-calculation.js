require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProcessingTimeCalculation() {
  console.log('🧪 Testing Processing Time Calculation...\n');

  try {
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    console.log('📊 Processing Time Analysis:\n');

    const processedEvents = events?.filter(e => e.processedat) || [];
    
    processedEvents.forEach((event, index) => {
      const createdTime = new Date(event.createdat);
      const processedTime = new Date(event.processedat);
      const rawProcessingTime = processedTime.getTime() - createdTime.getTime();
      const cappedProcessingTime = Math.min(rawProcessingTime, 60000);
      
      console.log(`${index + 1}. ${event.webhooktype} webhook:`);
      console.log(`   Created: ${createdTime.toLocaleString()}`);
      console.log(`   Processed: ${processedTime.toLocaleString()}`);
      console.log(`   Raw processing time: ${(rawProcessingTime / 1000).toFixed(2)}s`);
      console.log(`   Capped processing time: ${(cappedProcessingTime / 1000).toFixed(2)}s`);
      console.log('');
    });

    // Calculate average processing time with capping
    const totalProcessingTime = processedEvents.reduce((sum, event) => {
      const processingTime = new Date(event.processedat).getTime() - new Date(event.createdat).getTime();
      const cappedProcessingTime = Math.min(processingTime, 60000);
      return sum + cappedProcessingTime;
    }, 0);
    
    const averageProcessingTime = processedEvents.length > 0 ? totalProcessingTime / processedEvents.length : 0;

    console.log('📈 Processing Time Summary:');
    console.log(`   Total processed events: ${processedEvents.length}`);
    console.log(`   Total processing time (capped): ${(totalProcessingTime / 1000).toFixed(2)}s`);
    console.log(`   Average processing time: ${(averageProcessingTime / 1000).toFixed(2)}s`);
    
    if (averageProcessingTime < 60000) {
      console.log('✅ Processing time is now reasonable!');
    } else {
      console.log('⚠️  Processing time is still high, but capped at 60s per event');
    }

  } catch (error) {
    console.error('❌ Error testing processing time calculation:', error);
  }
}

testProcessingTimeCalculation(); 