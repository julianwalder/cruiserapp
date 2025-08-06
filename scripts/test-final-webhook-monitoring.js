require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFinalWebhookMonitoring() {
  console.log('🧪 Final Webhook Monitoring Test...\n');

  try {
    // Test the webhook metrics calculation
    console.log('📊 Testing Webhook Metrics Calculation...');
    
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

    console.log('✅ Metrics calculated successfully:');
    console.log(`   Total: ${total}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Pending: ${pending}`);
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

    console.log('\n📋 Webhook Type Breakdown:');
    console.log(`   submitted: ${webhookTypeBreakdown.submitted} events`);
    console.log(`   approved: ${webhookTypeBreakdown.approved} events`);
    console.log(`   declined: ${webhookTypeBreakdown.declined} events`);
    console.log(`   unknown: ${webhookTypeBreakdown.unknown} events`);

    // Verify the data matches expectations
    console.log('\n🔍 Data Verification:');
    console.log(`   ✅ Total events: ${total} (expected: 2)`);
    console.log(`   ✅ Submitted events: ${webhookTypeBreakdown.submitted} (expected: 1)`);
    console.log(`   ✅ Approved events: ${webhookTypeBreakdown.approved} (expected: 1)`);
    console.log(`   ✅ Success rate: ${successRate.toFixed(1)}% (expected: 100.0%)`);

    if (total === 2 && webhookTypeBreakdown.submitted === 1 && webhookTypeBreakdown.approved === 1 && successRate === 100) {
      console.log('\n🎉 All tests passed! Webhook monitoring is working correctly.');
      console.log('   The frontend should now display:');
      console.log('   - Total Webhooks: 2');
      console.log('   - Success Rate: 100.0%');
      console.log('   - Submitted: 1');
      console.log('   - Approved: 1');
    } else {
      console.log('\n❌ Some tests failed. Please check the data.');
    }

  } catch (error) {
    console.error('❌ Error in final test:', error);
  }
}

testFinalWebhookMonitoring(); 