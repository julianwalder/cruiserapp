const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTimelineData() {
  console.log('🔍 Debugging timeline data for Bogdan Luca...\n');

  // Get Luca's current data
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  console.log('📊 Timeline Data Available:');
  console.log('============================');
  console.log(`createdAt: ${lucaUser.createdAt}`);
  console.log(`updatedAt: ${lucaUser.updatedAt}`);
  console.log(`Has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log();

  if (lucaUser.veriffWebhookData) {
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;
    
    console.log('📋 Webhook Data Timeline Fields:');
    console.log('=================================');
    console.log(`createdAt: ${webhookData.createdAt}`);
    console.log(`updatedAt: ${webhookData.updatedAt}`);
    console.log(`submittedAt: ${webhookData.submittedAt}`);
    console.log(`webhookReceivedAt: ${webhookData.webhookReceivedAt}`);
    console.log(`timestamp: ${webhookData.timestamp}`);
    console.log(`status: ${webhookData.status}`);
    console.log(`feature: ${webhookData.feature}`);
    console.log();

    console.log('🔍 Timeline Component Input:');
    console.log('============================');
    const timelineInput = {
      createdAt: webhookData.createdAt,
      updatedAt: webhookData.updatedAt,
      submittedAt: webhookData.submittedAt,
      webhookReceivedAt: webhookData.webhookReceivedAt,
      status: webhookData.status,
      feature: webhookData.feature,
      sessionId: webhookData.sessionId,
      attemptId: webhookData.attemptId
    };
    console.log(JSON.stringify(timelineInput, null, 2));
    console.log();

    // Test the formatTime function
    const formatTime = (dateString) => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } catch {
        return 'N/A';
      }
    };

    console.log('🕐 Time Formatting Test:');
    console.log('========================');
    console.log(`createdAt: ${webhookData.createdAt} → ${formatTime(webhookData.createdAt)}`);
    console.log(`updatedAt: ${webhookData.updatedAt} → ${formatTime(webhookData.updatedAt)}`);
    console.log(`submittedAt: ${webhookData.submittedAt} → ${formatTime(webhookData.submittedAt)}`);
    console.log(`webhookReceivedAt: ${webhookData.webhookReceivedAt} → ${formatTime(webhookData.webhookReceivedAt)}`);
    console.log();
  }

  console.log('💡 ISSUE IDENTIFIED:');
  console.log('====================');
  console.log('The timeline component is not receiving the timestamp fields properly.');
  console.log('The webhook data has the timestamps, but they\'re not being passed to the timeline component.');
  console.log();
  console.log('🔧 SOLUTION:');
  console.log('============');
  console.log('Need to update the timeline component to use the webhook data structure correctly.');
}

debugTimelineData().catch(console.error);
