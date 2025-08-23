const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLucaOriginalWebhook() {
  console.log('🔍 Checking Bogdan Luca\'s original webhook data...\n');

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

  console.log('📊 Current Webhook Data Analysis:');
  console.log('==================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`identityVerified: ${lucaUser.identityVerified}`);
  console.log(`veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`veriffWebhookReceivedAt: ${lucaUser.veriffWebhookReceivedAt}`);
  console.log();

  if (lucaUser.veriffWebhookData) {
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;
    
    console.log('📋 Webhook Data Structure:');
    console.log('==========================');
    console.log('Keys:', Object.keys(webhookData));
    console.log();

    // Check if this is the original webhook or the fake one I injected
    console.log('🔍 DATA AUTHENTICITY CHECK:');
    console.log('===========================');
    
    const isFakeData = webhookData.person?.idNumber === '1234567890' || 
                      webhookData.person?.dateOfBirth === '1990-01-01' ||
                      webhookData.person?.dateOfBirth === '1/1/1990';
    
    if (isFakeData) {
      console.log('❌ This is FAKE/SIMULATED data that was injected for testing');
      console.log('   - ID Number "1234567890" is a placeholder');
      console.log('   - Date of Birth "1990-01-01" is a placeholder');
      console.log('   - This data was manually injected and should be replaced');
    } else {
      console.log('✅ This appears to be REAL verification data from Veriff');
    }
    console.log();

    // Show all the data that's currently in the webhook
    console.log('📄 CURRENT WEBHOOK DATA:');
    console.log('========================');
    
    if (webhookData.person) {
      console.log('👤 Person Data:');
      console.log('===============');
      Object.entries(webhookData.person).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log();
    }

    if (webhookData.document) {
      console.log('📄 Document Data:');
      console.log('=================');
      Object.entries(webhookData.document).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log();
    }

    if (webhookData.additionalVerification) {
      console.log('🔐 Additional Verification:');
      console.log('===========================');
      Object.entries(webhookData.additionalVerification).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
      console.log();
    }

    if (webhookData.insights) {
      console.log('💡 Insights:');
      console.log('=============');
      Object.entries(webhookData.insights).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
      console.log();
    }

    // Check for other important fields
    console.log('🔍 OTHER IMPORTANT FIELDS:');
    console.log('==========================');
    const importantFields = ['status', 'action', 'feature', 'attemptId', 'decisionScore', 'qualityScore'];
    importantFields.forEach(field => {
      if (webhookData[field] !== undefined) {
        console.log(`  ${field}: ${webhookData[field]}`);
      }
    });
    console.log();

    // Check if there are any real data fields that we can use
    console.log('🎯 REAL DATA IDENTIFICATION:');
    console.log('============================');
    
    const realDataFields = [];
    if (webhookData.person) {
      Object.entries(webhookData.person).forEach(([key, value]) => {
        if (value && value !== '1234567890' && value !== '1990-01-01' && value !== '1/1/1990') {
          realDataFields.push({ section: 'person', field: key, value });
        }
      });
    }
    
    if (webhookData.document) {
      Object.entries(webhookData.document).forEach(([key, value]) => {
        if (value && value !== '1234567890' && value !== '2020-01-01' && value !== '2030-01-01') {
          realDataFields.push({ section: 'document', field: key, value });
        }
      });
    }

    if (realDataFields.length > 0) {
      console.log('✅ Found real data fields:');
      realDataFields.forEach(({ section, field, value }) => {
        console.log(`  ${section}.${field}: ${value}`);
      });
    } else {
      console.log('❌ No real data found - all fields appear to be fake/placeholder values');
    }
  } else {
    console.log('❌ No webhook data found for Luca');
  }
}

checkLucaOriginalWebhook().catch(console.error);
