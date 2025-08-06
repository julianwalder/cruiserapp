require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testTimePeriodFiltering() {
  console.log('🧪 Testing Time Period Filtering...\n');

  try {
    const timePeriods = [0, 1, 24, 168, 720]; // All time, 1 hour, 24 hours, 7 days, 30 days
    const periodNames = ['All Time', '1 Hour', '24 Hours', '7 Days', '30 Days'];

    for (let i = 0; i < timePeriods.length; i++) {
      const hours = timePeriods[i];
      const periodName = periodNames[i];
      
      console.log(`📊 Testing ${periodName} (${hours} hours):`);
      
      // Build query based on time period
      let query = supabase
        .from('webhook_events')
        .select('*')
        .order('createdat', { ascending: false });

      // If hours > 0, filter by time period, otherwise get all events
      if (hours > 0) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        query = query.gte('createdat', since);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error(`❌ Error fetching ${periodName} data:`, error);
        continue;
      }

      const total = events?.length || 0;
      const successful = events?.filter(e => e.status === 'success').length || 0;
      const failed = events?.filter(e => e.status === 'error').length || 0;
      const pending = events?.filter(e => e.status === 'pending').length || 0;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      console.log(`   Total Events: ${total}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Pending: ${pending}`);
      console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

      if (events && events.length > 0) {
        console.log(`   Date Range: ${new Date(events[events.length - 1].createdat).toLocaleString()} to ${new Date(events[0].createdat).toLocaleString()}`);
      }

      console.log('');
    }

    console.log('✅ Time period filtering test completed!');
    console.log('   The webhook monitoring interface now supports:');
    console.log('   - All-time statistics (default)');
    console.log('   - Last hour statistics');
    console.log('   - Last 24 hours statistics');
    console.log('   - Last 7 days statistics');
    console.log('   - Last 30 days statistics');

  } catch (error) {
    console.error('❌ Error testing time period filtering:', error);
  }
}

testTimePeriodFiltering(); 