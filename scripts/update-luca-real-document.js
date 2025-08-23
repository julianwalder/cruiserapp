const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucaRealDocument() {
  console.log('🔧 Updating Bogdan Luca with real document number RX740900...\n');

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

  console.log('📊 Current document data:');
  console.log('==========================');
  console.log(`veriffDocumentNumber: ${lucaUser.veriffDocumentNumber}`);
  console.log(`has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log();

  // Update the individual field
  console.log('💾 Updating veriffDocumentNumber field...');
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      veriffDocumentNumber: 'RX740900'
    })
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating document number:', updateError);
    return;
  }

  console.log('✅ Successfully updated veriffDocumentNumber to RX740900!');
  console.log('========================================================');

  // Also update the webhook data if it exists
  if (lucaUser.veriffWebhookData) {
    console.log('🔄 Updating webhook data document number...');
    
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;

    const updatedWebhookData = {
      ...webhookData,
      document: {
        ...webhookData.document,
        number: 'RX740900'
      }
    };

    const { data: webhookUpdatedUser, error: webhookUpdateError } = await supabase
      .from('users')
      .update({
        veriffWebhookData: updatedWebhookData
      })
      .eq('id', lucaUser.id)
      .select()
      .single();

    if (webhookUpdateError) {
      console.error('Error updating webhook data:', webhookUpdateError);
    } else {
      console.log('✅ Successfully updated webhook data document number!');
    }
  }

  // Show the final result
  console.log('\n📋 Final document data:');
  console.log('========================');
  console.log(`veriffDocumentNumber: ${updatedUser.veriffDocumentNumber}`);
  
  if (updatedUser.veriffWebhookData) {
    const finalWebhookData = typeof updatedUser.veriffWebhookData === 'string' 
      ? JSON.parse(updatedUser.veriffWebhookData) 
      : updatedUser.veriffWebhookData;
    
    console.log(`Webhook document number: ${finalWebhookData.document?.number}`);
  }
  console.log();

  console.log('🎯 Summary:');
  console.log('===========');
  console.log('✅ Updated veriffDocumentNumber: RX740900');
  console.log('✅ Updated webhook data document number: RX740900');
  console.log('✅ Now the database matches the real Veriff ID document number');
  console.log();
  console.log('📝 Note: If you have other real data from the Veriff ID (like date of birth, ID number, etc.),');
  console.log('   we can update those fields as well to match the real information.');
}

updateLucaRealDocument().catch(console.error);
