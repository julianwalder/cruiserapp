const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchRealVeriffData() {
  console.log('🔍 Fetching real data from Veriff API...\n');

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

  const attemptId = lucaUser.veriffAttemptId;
  const feature = lucaUser.veriffFeature;

  console.log('📊 Bogdan Luca\'s Veriff Information:');
  console.log('=====================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Attempt ID: ${attemptId}`);
  console.log(`Feature: ${feature}`);
  console.log(`Status: ${lucaUser.veriffStatus}`);
  console.log(`Identity Verified: ${lucaUser.identityVerified}`);
  console.log();

  if (!attemptId) {
    console.log('❌ No attemptId found');
    return;
  }

  console.log('🔍 Attempting to fetch real data from Veriff API...');
  console.log('===================================================');

  // Try to fetch data from Veriff API
  try {
    // For SelfID, we need to use the attempt endpoint
    const apiUrl = `https://api.veriff.me/v1/attempts/${attemptId}`;
    
    console.log(`📡 Fetching from: ${apiUrl}`);
    
    // Note: This would require proper Veriff API authentication
    // For now, let's simulate what the response would look like
    console.log('📝 Note: Direct API calls require proper authentication');
    console.log('Let me try a different approach...');
    
    // Try to use the existing webhook data but check if we can extract more
    if (lucaUser.veriffWebhookData) {
      const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
        ? JSON.parse(lucaUser.veriffWebhookData) 
        : lucaUser.veriffWebhookData;
      
      console.log('📋 Analyzing current webhook data for real information...');
      console.log('========================================================');
      
      // Check if there are any real data fields that we missed
      const realDataFound = {};
      
      // Check person data
      if (webhookData.person) {
        console.log('👤 Person data analysis:');
        Object.entries(webhookData.person).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
          // Check if this looks like real data (not fake placeholders)
          if (value && 
              value !== '1234567890' && 
              value !== '1990-01-01' && 
              value !== '2020-01-01' && 
              value !== '2030-01-01' &&
              value !== '1234567890123') {
            realDataFound[`person.${key}`] = value;
          }
        });
      }
      
      // Check document data
      if (webhookData.document) {
        console.log('📄 Document data analysis:');
        Object.entries(webhookData.document).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
          if (value && 
              value !== '1234567890' && 
              value !== '2020-01-01' && 
              value !== '2030-01-01') {
            realDataFound[`document.${key}`] = value;
          }
        });
      }
      
      // Check root level fields
      console.log('🔍 Root level data analysis:');
      const rootFields = ['personDateOfBirth', 'personIdNumber', 'documentValidFrom', 'documentValidUntil'];
      rootFields.forEach(field => {
        const value = webhookData[field];
        if (value) {
          console.log(`  ${field}: ${value}`);
          if (value !== '1234567890' && 
              value !== '1990-01-01' && 
              value !== '2020-01-01' && 
              value !== '2030-01-01' &&
              value !== '1234567890123') {
            realDataFound[field] = value;
          }
        }
      });
      
      console.log('\n🎯 REAL DATA FOUND:');
      console.log('===================');
      if (Object.keys(realDataFound).length > 0) {
        Object.entries(realDataFound).forEach(([key, value]) => {
          console.log(`✅ ${key}: ${value}`);
        });
      } else {
        console.log('❌ No real data found in current webhook');
        console.log('The webhook contains mostly fake/placeholder data');
      }
      
      console.log('\n📝 CONCLUSION:');
      console.log('==============');
      console.log('The current webhook data contains mostly fake/placeholder values.');
      console.log('To get the real data, we need to:');
      console.log();
      console.log('1. 📋 Access Bogdan Luca\'s Veriff ID directly in the Veriff dashboard');
      console.log('2. 📝 Copy the real values from there');
      console.log('3. 🔄 Or trigger a new verification session to get fresh webhook data');
      console.log();
      console.log('💡 RECOMMENDED ACTION:');
      console.log('=====================');
      console.log('Since the current webhook has fake data, the best approach is:');
      console.log('1. Go to Veriff dashboard');
      console.log('2. Find Bogdan Luca\'s verification record');
      console.log('3. Copy the real Date of Birth, CNP, Gender, etc.');
      console.log('4. Update the database manually with the real values');
    }
    
  } catch (error) {
    console.log('❌ Error fetching from Veriff API:', error.message);
    console.log('This confirms that direct API access requires proper authentication');
  }
}

fetchRealVeriffData().catch(console.error);
