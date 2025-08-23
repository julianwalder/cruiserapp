const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchLucaVeriffData() {
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

  console.log('📊 Bogdan Luca\'s Veriff IDs:');
  console.log('==============================');
  console.log(`veriffSessionId: ${lucaUser.veriffSessionId || 'null'}`);
  console.log(`veriffVerificationId: ${lucaUser.veriffVerificationId || 'null'}`);
  console.log(`veriffAttemptId: ${lucaUser.veriffAttemptId || 'null'}`);
  console.log(`veriffFeature: ${lucaUser.veriffFeature || 'null'}`);
  console.log();

  // Check if we have any Veriff IDs to work with
  const sessionId = lucaUser.veriffSessionId;
  const verificationId = lucaUser.veriffVerificationId;
  const attemptId = lucaUser.veriffAttemptId;

  if (!sessionId && !verificationId && !attemptId) {
    console.log('❌ No Veriff IDs found to fetch data from');
    console.log('This means we cannot retrieve data directly from Veriff API');
    console.log('The data would need to be manually entered based on the Veriff ID');
    return;
  }

  console.log('🔍 Attempting to fetch data from Veriff API...');
  console.log('==============================================');

  // Try to fetch session data if we have a session ID
  if (sessionId) {
    console.log(`📡 Fetching session data for session ID: ${sessionId}`);
    try {
      const sessionResponse = await fetch(`https://api.veriff.me/v1/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': process.env.VERIFF_API_KEY || '',
          'X-HMAC-SIGNATURE': '', // Would need proper signature
        },
      });

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('✅ Session data retrieved from Veriff:');
        console.log(JSON.stringify(sessionData, null, 2));
      } else {
        console.log(`❌ Failed to fetch session data: ${sessionResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Error fetching session data:', error.message);
    }
  }

  // Try to fetch verification data if we have a verification ID
  if (verificationId) {
    console.log(`📡 Fetching verification data for verification ID: ${verificationId}`);
    try {
      const verificationResponse = await fetch(`https://api.veriff.me/v1/verifications/${verificationId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': process.env.VERIFF_API_KEY || '',
          'X-HMAC-SIGNATURE': '', // Would need proper signature
        },
      });

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        console.log('✅ Verification data retrieved from Veriff:');
        console.log(JSON.stringify(verificationData, null, 2));
      } else {
        console.log(`❌ Failed to fetch verification data: ${verificationResponse.status}`);
      }
    } catch (error) {
      console.log('❌ Error fetching verification data:', error.message);
    }
  }

  console.log('\n📝 ALTERNATIVE APPROACH:');
  console.log('========================');
  console.log('Since direct API calls require proper authentication and signatures,');
  console.log('the best approach would be to:');
  console.log();
  console.log('1. 📋 Get the complete data from Bogdan Luca\'s Veriff ID directly');
  console.log('2. 📝 Manually update the database with the real values');
  console.log('3. 🔄 Or trigger a new verification session to get fresh data');
  console.log();
  console.log('📊 Current missing data:');
  console.log('========================');
  console.log(`❌ Date of Birth: ${lucaUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`❌ CNP (ID Number): ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`❌ Gender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log(`❌ Address: Not stored in current fields`);
  console.log();
  console.log('✅ Available data:');
  console.log('==================');
  console.log(`✅ Document Number: ${lucaUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${lucaUser.veriffPersonGivenName} ${lucaUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${lucaUser.veriffPersonCountry}`);
}

fetchLucaVeriffData().catch(console.error);
