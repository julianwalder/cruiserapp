const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVerificationStatus() {
  console.log('🧪 Testing verification status for Bogdan Luca...\n');

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

  console.log('📊 Bogdan Luca\'s Database Status:');
  console.log('==================================');
  console.log(`ID: ${lucaUser.id}`);
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Name: ${lucaUser.firstName} ${lucaUser.lastName}`);
  console.log(`identityVerified: ${lucaUser.identityVerified}`);
  console.log(`veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`veriffSessionId: ${lucaUser.veriffSessionId}`);
  console.log(`veriffAttemptId: ${lucaUser.veriffAttemptId}`);
  console.log(`veriffFeature: ${lucaUser.veriffFeature}`);
  console.log(`Has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log();

  // Check what the VeriffService would return
  console.log('🔍 Simulating VeriffService.getUserVeriffStatus response:');
  console.log('========================================================');
  
  // Simulate the logic from VeriffService.getUserVeriffStatus
  let isVerified = lucaUser.identityVerified || false;
  let veriffStatus = lucaUser.veriffStatus || 'unknown';
  let veriffData = lucaUser.veriffWebhookData || lucaUser.veriffData;
  
  console.log('Expected API Response:');
  console.log('=====================');
  console.log(JSON.stringify({
    success: true,
    status: {
      isVerified: isVerified,
      sessionId: lucaUser.veriffSessionId,
      veriffStatus: veriffStatus,
      veriffData: veriffData ? 'Present' : 'Not present'
    },
    needsVerification: !isVerified
  }, null, 2));
  console.log();

  // Check if the webhook data has the right structure
  if (lucaUser.veriffWebhookData) {
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;
    
    console.log('📋 Webhook Data Structure:');
    console.log('==========================');
    console.log(`Status: ${webhookData.status}`);
    console.log(`Has person data: ${!!webhookData.person}`);
    console.log(`Has document data: ${!!webhookData.document}`);
    console.log(`Has additionalVerification: ${!!webhookData.additionalVerification}`);
    console.log(`Decision Score: ${webhookData.decisionScore}`);
    console.log();

    if (webhookData.person) {
      console.log('👤 Person Data:');
      console.log('==============');
      console.log(`Given Name: ${webhookData.person.givenName}`);
      console.log(`Last Name: ${webhookData.person.lastName}`);
      console.log(`Date of Birth: ${webhookData.person.dateOfBirth}`);
      console.log(`ID Number: ${webhookData.person.idNumber}`);
      console.log(`Gender: ${webhookData.person.gender}`);
      console.log();
    }

    if (webhookData.document) {
      console.log('📄 Document Data:');
      console.log('=================');
      console.log(`Type: ${webhookData.document.type}`);
      console.log(`Number: ${webhookData.document.number}`);
      console.log(`Country: ${webhookData.document.country}`);
      console.log(`Valid From: ${webhookData.document.validFrom}`);
      console.log(`Valid Until: ${webhookData.document.validUntil}`);
      console.log();
    }
  }

  console.log('🎯 CONCLUSION:');
  console.log('==============');
  console.log(`✅ identityVerified: ${lucaUser.identityVerified}`);
  console.log(`✅ veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`✅ Has webhook data: ${!!lucaUser.veriffWebhookData}`);
  console.log();
  
  if (lucaUser.identityVerified && lucaUser.veriffStatus === 'approved') {
    console.log('🎉 Bogdan Luca should show as VERIFIED!');
    console.log('The information alert should NOT appear.');
    console.log('He should see the complete verification cards.');
  } else {
    console.log('❌ Bogdan Luca is NOT showing as verified.');
    console.log('This explains why the information alert is appearing.');
  }
}

testVerificationStatus().catch(console.error);
