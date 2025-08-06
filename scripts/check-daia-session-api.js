require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

// Veriff API configuration
const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;

function generateSignature(payloadString) {
  if (!VERIFF_API_SECRET) {
    throw new Error('Veriff API secret not configured');
  }
  
  const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

async function checkDaiaSessionAPI() {
  console.log('🔍 Checking Daia\'s session in Veriff API...\n');

  if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
    console.error('❌ Veriff API credentials not configured');
    return;
  }

  // Session ID from the webhook data
  const sessionId = '45d2c9e3-4f1a-4d55-998b-fd67f699c1a0';
  
  console.log(`📡 Checking session: ${sessionId}`);

  try {
    const sessionResponse = await fetch(`${VERIFF_BASE_URL}/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'X-AUTH-CLIENT': VERIFF_API_KEY,
        'X-HMAC-SIGNATURE': generateSignature(''),
      },
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ Session found in Veriff API:');
      console.log(`   Status: ${sessionData.status}`);
      console.log(`   Created: ${sessionData.created_at}`);
      console.log(`   Updated: ${sessionData.updated_at}`);
      
      if (sessionData.person) {
        console.log(`   Person: ${sessionData.person.firstName} ${sessionData.person.lastName}`);
        console.log(`   Email: ${sessionData.person.email}`);
      }
      
      if (sessionData.document) {
        console.log(`   Document Type: ${sessionData.document.type}`);
      }
      
      if (sessionData.verification) {
        console.log(`   Verification ID: ${sessionData.verification.id}`);
        console.log(`   Verification Status: ${sessionData.verification.status}`);
      }

      console.log('\n📋 Full Session Data:');
      console.log(JSON.stringify(sessionData, null, 2));

      // Check if this is an approved session
      if (sessionData.status === 'approved') {
        console.log('\n🎉 SESSION IS APPROVED!');
        console.log('   - The verification has been approved in Veriff');
        console.log('   - You should receive an approval webhook soon');
        console.log('   - Or you can manually update the user status');
      } else if (sessionData.status === 'submitted') {
        console.log('\n⏳ SESSION IS SUBMITTED');
        console.log('   - The verification is still being processed');
        console.log('   - Waiting for approval/decline decision');
      } else if (sessionData.status === 'declined') {
        console.log('\n❌ SESSION WAS DECLINED');
        console.log('   - The verification was declined');
        console.log('   - Check for decline webhook or manual update needed');
      }

    } else {
      console.log(`❌ Session not found in Veriff API: ${sessionResponse.status}`);
      const errorText = await sessionResponse.text();
      console.log(`   Error: ${errorText}`);
      
      if (sessionResponse.status === 404) {
        console.log('   Session may have expired or been deleted');
      }
    }

  } catch (error) {
    console.log(`❌ Error checking Veriff API: ${error.message}`);
  }
}

// Run the script
checkDaiaSessionAPI(); 