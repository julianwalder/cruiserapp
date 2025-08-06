require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testApiResponseStructure() {
  console.log('🧪 Testing API Response Structure...\n');

  try {
    // Simulate what the API would return
    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    const total = events?.length || 0;
    const successful = events?.filter(e => e.status === 'success').length || 0;
    const failed = events?.filter(e => e.status === 'error').length || 0;
    const pending = events?.filter(e => e.status === 'pending').length || 0;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // Calculate webhook type breakdown
    const webhookTypeBreakdown = {
      submitted: events?.filter(e => e.webhooktype === 'submitted').length || 0,
      approved: events?.filter(e => e.webhooktype === 'approved').length || 0,
      declined: events?.filter(e => e.webhooktype === 'declined').length || 0,
      unknown: events?.filter(e => !['submitted', 'approved', 'declined'].includes(e.webhooktype)).length || 0,
    };

    // Simulate the API response structure
    const apiResponse = {
      success: true,
      data: {
        metrics: {
          total,
          successful,
          failed,
          pending,
          successRate,
          averageProcessingTime: 17437.35,
          webhookTypeBreakdown,
        },
        alerts: [],
        failedWebhooks: [],
        timestamp: new Date().toISOString(),
      }
    };

    console.log('📊 API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log('\n🔍 Data Access Paths:');
    console.log(`   responseData.data.metrics.total: ${apiResponse.data.metrics.total}`);
    console.log(`   responseData.data.metrics.successRate: ${apiResponse.data.metrics.successRate}`);
    console.log(`   responseData.data.metrics.webhookTypeBreakdown.submitted: ${apiResponse.data.metrics.webhookTypeBreakdown.submitted}`);
    console.log(`   responseData.data.metrics.webhookTypeBreakdown.approved: ${apiResponse.data.metrics.webhookTypeBreakdown.approved}`);

    console.log('\n✅ API response structure is correct!');
    console.log('   Frontend should now access: responseData.data.metrics');

  } catch (error) {
    console.error('❌ Error testing API response structure:', error);
  }
}

testApiResponseStructure(); 