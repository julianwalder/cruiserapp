require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;

function generateSignature(payloadString) {
  return crypto
    .createHmac('sha256', VERIFF_API_SECRET)
    .update(payloadString)
    .digest('hex');
}

async function fetchDaiaVeriffData() {
  console.log('🔍 Fetching Daia\'s complete verification data from Veriff...\n');

  try {
    // Daia's session ID from the webhook data
    const sessionId = '45d2c9e3-4f1a-4d55-998b-fd67f699c1a0';
    
    console.log(`📋 Session ID: ${sessionId}`);

    // 1. Get session details
    console.log('\n📄 Fetching session details...');
    
    const sessionUrl = `${VERIFF_BASE_URL}/sessions/${sessionId}`;
    const sessionSignature = generateSignature('');
    
    const sessionResponse = await fetch(sessionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': VERIFF_API_KEY,
        'X-SIGNATURE': sessionSignature,
      },
    });

    if (!sessionResponse.ok) {
      console.error(`❌ Session API Error: ${sessionResponse.status} ${sessionResponse.statusText}`);
      const errorText = await sessionResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Session data retrieved');
    console.log('Session Status:', sessionData.status);
    console.log('Session Created:', sessionData.createdAt);
    console.log('Session Updated:', sessionData.updatedAt);

    // 2. Get verification details if available
    if (sessionData.verification) {
      console.log('\n🔍 Fetching verification details...');
      
      const verificationId = sessionData.verification.id;
      const verificationUrl = `${VERIFF_BASE_URL}/verifications/${verificationId}`;
      const verificationSignature = generateSignature('');
      
      const verificationResponse = await fetch(verificationUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-SIGNATURE': verificationSignature,
        },
      });

      if (verificationResponse.ok) {
        const verificationData = await verificationResponse.json();
        console.log('✅ Verification data retrieved');
        
        // Display personal information
        console.log('\n👤 Personal Information:');
        if (verificationData.person) {
          console.log(`   Given Name: ${verificationData.person.givenName || 'Not available'}`);
          console.log(`   Last Name: ${verificationData.person.lastName || 'Not available'}`);
          console.log(`   ID Number (CNP): ${verificationData.person.idNumber || 'Not available'}`);
          console.log(`   Date of Birth: ${verificationData.person.dateOfBirth || 'Not available'}`);
          console.log(`   Nationality: ${verificationData.person.nationality || 'Not available'}`);
          console.log(`   Gender: ${verificationData.person.gender || 'Not available'}`);
          console.log(`   Country: ${verificationData.person.country || 'Not available'}`);
        } else {
          console.log('   No person data available');
        }

        // Display document information
        console.log('\n📄 Document Information:');
        if (verificationData.document) {
          console.log(`   Document Type: ${verificationData.document.type || 'Not available'}`);
          console.log(`   Document Number: ${verificationData.document.number || 'Not available'}`);
          console.log(`   Document Country: ${verificationData.document.country || 'Not available'}`);
          console.log(`   Valid From: ${verificationData.document.validFrom || 'Not available'}`);
          console.log(`   Valid Until: ${verificationData.document.validUntil || 'Not available'}`);
          console.log(`   Issued By: ${verificationData.document.issuedBy || 'Not available'}`);
        } else {
          console.log('   No document data available');
        }

        // Display verification results
        console.log('\n🔍 Verification Results:');
        console.log(`   Status: ${verificationData.status || 'Not available'}`);
        console.log(`   Decision Score: ${verificationData.decisionScore || 'Not available'}`);
        
        if (verificationData.additionalVerification?.faceMatch) {
          console.log(`   Face Match Similarity: ${verificationData.additionalVerification.faceMatch.similarity || 'Not available'}`);
          console.log(`   Face Match Status: ${verificationData.additionalVerification.faceMatch.status || 'Not available'}`);
        }

        // Display insights
        if (verificationData.insights) {
          console.log('\n💡 Insights:');
          console.log(`   Quality: ${verificationData.insights.quality || 'Not available'}`);
          if (verificationData.insights.flags) {
            console.log(`   Flags: ${verificationData.insights.flags.join(', ') || 'None'}`);
          }
          console.log(`   Context: ${verificationData.insights.context || 'Not available'}`);
        }

        // Show full verification data
        console.log('\n📄 Full Verification Data:');
        console.log(JSON.stringify(verificationData, null, 2));

      } else {
        console.error(`❌ Verification API Error: ${verificationResponse.status} ${verificationResponse.statusText}`);
        const errorText = await verificationResponse.text();
        console.error('Error details:', errorText);
      }
    } else {
      console.log('⚠️  No verification data available in session');
    }

    // Show full session data
    console.log('\n📄 Full Session Data:');
    console.log(JSON.stringify(sessionData, null, 2));

  } catch (error) {
    console.error('❌ Error fetching Veriff data:', error);
  }
}

fetchDaiaVeriffData(); 