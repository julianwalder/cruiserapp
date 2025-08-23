const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLucaWebhookData() {
  console.log('🔍 Checking Bogdan Luca\'s webhook data...\n');

  // Get Luca's data (email: bogdan.luca@gmail.com)
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  console.log('📊 Bogdan Luca\'s Verification Data:');
  console.log('=====================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`identityVerified: ${lucaUser.identityVerified}`);
  console.log(`veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log(`has veriffData: ${!!lucaUser.veriffData}`);
  console.log();

  if (lucaUser.veriffWebhookData) {
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;
    
    console.log('📋 Webhook Data Structure:');
    console.log('==========================');
    console.log('Keys:', Object.keys(webhookData));
    console.log();

    if (webhookData.person) {
      console.log('👤 Person Data:');
      console.log('===============');
      console.log('firstName:', webhookData.person.firstName);
      console.log('lastName:', webhookData.person.lastName);
      console.log('dateOfBirth:', webhookData.person.dateOfBirth);
      console.log('nationality:', webhookData.person.nationality);
      console.log('idNumber:', webhookData.person.idNumber);
      console.log('gender:', webhookData.person.gender);
      console.log('country:', webhookData.person.country);
      console.log();
    }

    if (webhookData.document) {
      console.log('📄 Document Data:');
      console.log('=================');
      console.log('type:', webhookData.document.type);
      console.log('number:', webhookData.document.number);
      console.log('country:', webhookData.document.country);
      console.log('validFrom:', webhookData.document.validFrom);
      console.log('validUntil:', webhookData.document.validUntil);
      console.log('issuedBy:', webhookData.document.issuedBy);
      console.log();
    }

    if (webhookData.additionalVerification) {
      console.log('🔐 Additional Verification:');
      console.log('===========================');
      console.log('faceMatch:', webhookData.additionalVerification.faceMatch);
      console.log();
    }

    if (webhookData.insights) {
      console.log('💡 Insights:');
      console.log('=============');
      console.log('quality:', webhookData.insights.quality);
      console.log('flags:', webhookData.insights.flags);
      console.log('context:', webhookData.insights.context);
      console.log();
    }

    // Check if this looks like real data or fake data
    console.log('🔍 DATA AUTHENTICITY CHECK:');
    console.log('===========================');
    const isFakeData = webhookData.person?.idNumber === '1234567890' || 
                      webhookData.person?.dateOfBirth === '1990-01-01' ||
                      webhookData.person?.dateOfBirth === '1/1/1990';
    
    if (isFakeData) {
      console.log('❌ This appears to be FAKE/SIMULATED data!');
      console.log('   - ID Number "1234567890" is a placeholder');
      console.log('   - Date of Birth "1/1/1990" is a placeholder');
      console.log('   - This data was manually injected for testing');
    } else {
      console.log('✅ This appears to be REAL verification data');
    }
  } else {
    console.log('❌ No webhook data found for Luca');
  }
}

checkLucaWebhookData().catch(console.error);
