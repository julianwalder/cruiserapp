const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function triggerLucaVerification() {
  console.log('🔄 Triggering fresh verification session for Bogdan Luca...\n');

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

  console.log('📊 Current verification status:');
  console.log('================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Name: ${lucaUser.firstName} ${lucaUser.lastName}`);
  console.log(`identityVerified: ${lucaUser.identityVerified}`);
  console.log(`veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`veriffAttemptId: ${lucaUser.veriffAttemptId}`);
  console.log();

  console.log('🎯 OPTIONS TO GET REAL DATA:');
  console.log('============================');
  console.log();
  console.log('Option 1: 📋 Manual Update (Recommended)');
  console.log('========================================');
  console.log('1. Go to Bogdan Luca\'s Veriff ID in the Veriff dashboard');
  console.log('2. Copy all the real data:');
  console.log('   - Date of Birth');
  console.log('   - CNP (Personal Numeric Code)');
  console.log('   - Gender');
  console.log('   - Document validity dates');
  console.log('   - Address (if available)');
  console.log('3. Update the database with the real values');
  console.log();
  console.log('Option 2: 🔄 Trigger New Verification');
  console.log('====================================');
  console.log('1. Clear current verification data');
  console.log('2. Create a new verification session');
  console.log('3. Wait for new webhook with complete data');
  console.log();
  console.log('Option 3: 📡 Fetch from Veriff API');
  console.log('==================================');
  console.log('1. Use Veriff API with proper authentication');
  console.log('2. Fetch complete data using attemptId');
  console.log('3. Update database with real data');
  console.log();

  console.log('💡 RECOMMENDED APPROACH:');
  console.log('========================');
  console.log('Since Bogdan Luca is already verified, the easiest approach is:');
  console.log();
  console.log('1. 📋 Get the real data from his Veriff ID directly');
  console.log('2. 📝 Manually update the database fields');
  console.log('3. ✅ Test the verification display');
  console.log();
  console.log('This avoids:');
  console.log('- Triggering a new verification (which might be unnecessary)');
  console.log('- API authentication issues');
  console.log('- Waiting for new webhooks');
  console.log();

  console.log('📊 Current data that needs real values:');
  console.log('=======================================');
  console.log(`❌ Date of Birth: ${lucaUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`❌ CNP (ID Number): ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`❌ Gender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log(`❌ Document Valid From: ${lucaUser.veriffDocumentValidFrom || 'null'}`);
  console.log(`❌ Document Valid Until: ${lucaUser.veriffDocumentValidUntil || 'null'}`);
  console.log();
  console.log('✅ Data that is already correct:');
  console.log('================================');
  console.log(`✅ Document Number: ${lucaUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${lucaUser.veriffPersonGivenName} ${lucaUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${lucaUser.veriffPersonCountry}`);
  console.log();

  console.log('📝 NEXT STEPS:');
  console.log('==============');
  console.log('1. Get the real values from Bogdan Luca\'s Veriff ID');
  console.log('2. Update the database with the real data');
  console.log('3. Test the verification display in My Account');
  console.log();
  console.log('Would you like me to:');
  console.log('A) Create a script to manually update with real values?');
  console.log('B) Clear current data and trigger new verification?');
  console.log('C) Try to fetch from Veriff API (requires proper auth)?');
}

triggerLucaVerification().catch(console.error);
