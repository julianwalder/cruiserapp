const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLucaVeriffComplete() {
  console.log('🔍 Fetching complete verification data from Veriff API...\n');

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

  console.log('📊 Bogdan Luca\'s Veriff Information:');
  console.log('=====================================');
  console.log(`veriffAttemptId: ${lucaUser.veriffAttemptId}`);
  console.log(`veriffFeature: ${lucaUser.veriffFeature}`);
  console.log(`veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`identityVerified: ${lucaUser.identityVerified}`);
  console.log();

  const attemptId = lucaUser.veriffAttemptId;
  const feature = lucaUser.veriffFeature;

  if (!attemptId) {
    console.log('❌ No attemptId found to fetch data from Veriff');
    return;
  }

  console.log('🔍 Attempting to fetch data from Veriff API...');
  console.log('==============================================');

  // For SelfID, we might need to use a different endpoint
  if (feature === 'selfid') {
    console.log('📡 SelfID feature detected - trying SelfID specific endpoints...');
    
    try {
      // Try to fetch attempt data
      console.log(`📡 Fetching attempt data for attemptId: ${attemptId}`);
      
      // Note: This would require proper Veriff API authentication
      // For now, let's check what we can do with the existing data
      
      console.log('📝 Since direct API calls require proper authentication,');
      console.log('let\'s check if we can extract more data from the existing webhook...');
      
      if (lucaUser.veriffWebhookData) {
        const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
          ? JSON.parse(lucaUser.veriffWebhookData) 
          : lucaUser.veriffWebhookData;
        
        console.log('📋 Current webhook data structure:');
        console.log('==================================');
        console.log('Keys:', Object.keys(webhookData));
        console.log();
        
        // Check if there are any additional fields we missed
        console.log('🔍 Checking for additional data fields:');
        console.log('=======================================');
        
        const allFields = Object.keys(webhookData);
        allFields.forEach(field => {
          const value = webhookData[field];
          if (value && typeof value === 'object') {
            console.log(`${field}:`, Object.keys(value));
          } else {
            console.log(`${field}: ${value}`);
          }
        });
        console.log();
        
        // Check if there are any nested objects with additional data
        console.log('🔍 Checking nested objects for additional data:');
        console.log('===============================================');
        
        Object.entries(webhookData).forEach(([key, value]) => {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            console.log(`${key} object:`, value);
          }
        });
      }
      
    } catch (error) {
      console.log('❌ Error attempting to fetch from Veriff API:', error.message);
    }
  }

  console.log('\n📝 ALTERNATIVE APPROACH:');
  console.log('========================');
  console.log('Since direct API calls require proper authentication,');
  console.log('the best approach would be to:');
  console.log();
  console.log('1. 🔄 Trigger a new verification session for Bogdan Luca');
  console.log('2. 📋 Get the complete webhook data with all details');
  console.log('3. 📝 Or manually update with the real data from Veriff ID');
  console.log();
  console.log('🎯 RECOMMENDED SOLUTION:');
  console.log('=======================');
  console.log('1. Go to Bogdan Luca\'s Veriff ID in the Veriff dashboard');
  console.log('2. Copy all the real data (Date of Birth, CNP, Gender, etc.)');
  console.log('3. Update the database with the real values');
  console.log('4. Or trigger a new verification to get fresh webhook data');
  console.log();
  console.log('📊 Current missing data:');
  console.log('========================');
  console.log(`❌ Date of Birth: ${lucaUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`❌ CNP (ID Number): ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`❌ Gender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log(`❌ Document Valid From: ${lucaUser.veriffDocumentValidFrom || 'null'}`);
  console.log(`❌ Document Valid Until: ${lucaUser.veriffDocumentValidUntil || 'null'}`);
  console.log();
  console.log('✅ Available data:');
  console.log('==================');
  console.log(`✅ Document Number: ${lucaUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${lucaUser.veriffPersonGivenName} ${lucaUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${lucaUser.veriffPersonCountry}`);
  console.log(`✅ Attempt ID: ${lucaUser.veriffAttemptId}`);
  console.log(`✅ Feature: ${lucaUser.veriffFeature}`);
}

fetchLucaVeriffComplete().catch(console.error);
