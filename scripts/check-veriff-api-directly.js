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

async function checkVeriffAPI() {
  console.log('🔍 Checking Veriff API directly...\n');
  
  if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
    console.error('❌ Veriff API credentials not configured');
    console.log('Please check your .env.local file for:');
    console.log('- VERIFF_API_KEY');
    console.log('- VERIFF_API_SECRET');
    return;
  }

  try {
    // 1. Check API connectivity and get sessions
    console.log('📡 Checking Veriff API connectivity...');
    
    const signature = generateSignature('');
    
    const response = await fetch(`${VERIFF_BASE_URL}/sessions`, {
      method: 'GET',
      headers: {
        'X-AUTH-CLIENT': VERIFF_API_KEY,
        'X-HMAC-SIGNATURE': signature,
      },
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const sessionsData = await response.json();
    console.log('✅ API connection successful');
    console.log(`📊 Found ${sessionsData.length || 0} sessions in Veriff\n`);

    // 2. Get detailed information for each session
    if (sessionsData && sessionsData.length > 0) {
      console.log('🔍 Fetching detailed session information...\n');
      
      for (let i = 0; i < Math.min(sessionsData.length, 10); i++) { // Limit to first 10 sessions
        const session = sessionsData[i];
        console.log(`📋 Session ${i + 1}: ${session.id}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Created: ${session.created_at}`);
        
        if (session.person) {
          console.log(`   Person: ${session.person.firstName} ${session.person.lastName}`);
          console.log(`   Email: ${session.person.email}`);
        }
        
        if (session.document) {
          console.log(`   Document Type: ${session.document.type}`);
        }
        
        console.log(''); // Empty line for separation
      }

      // 3. Get verifications for each session
      console.log('🔍 Fetching verification details...\n');
      
      for (let i = 0; i < Math.min(sessionsData.length, 5); i++) { // Limit to first 5 for detailed verification
        const session = sessionsData[i];
        
        try {
          const verificationResponse = await fetch(`${VERIFF_BASE_URL}/verifications/${session.id}`, {
            method: 'GET',
            headers: {
              'X-AUTH-CLIENT': VERIFF_API_KEY,
              'X-HMAC-SIGNATURE': generateSignature(''),
            },
          });

          if (verificationResponse.ok) {
            const verification = await verificationResponse.json();
            console.log(`✅ Verification ${i + 1}: ${verification.id}`);
            console.log(`   Status: ${verification.status}`);
            console.log(`   Created: ${verification.createdAt}`);
            console.log(`   Updated: ${verification.updatedAt}`);
            
            if (verification.person) {
              console.log(`   Person: ${verification.person.givenName} ${verification.person.lastName}`);
              console.log(`   Nationality: ${verification.person.nationality}`);
              console.log(`   Country: ${verification.person.country}`);
            }
            
            if (verification.document) {
              console.log(`   Document: ${verification.document.type} from ${verification.document.country}`);
              console.log(`   Number: ${verification.document.number}`);
            }
            
            if (verification.additionalVerification?.faceMatch) {
              console.log(`   Face Match: ${verification.additionalVerification.faceMatch.status} (${verification.additionalVerification.faceMatch.similarity}%)`);
            }
            
            if (verification.decisionScore) {
              console.log(`   Decision Score: ${verification.decisionScore}`);
            }
            
            console.log(''); // Empty line for separation
          } else {
            console.log(`⚠️  Could not fetch verification for session ${session.id}: ${verificationResponse.status}`);
          }
        } catch (error) {
          console.log(`❌ Error fetching verification for session ${session.id}:`, error.message);
        }
      }
    } else {
      console.log('📭 No sessions found in Veriff API');
    }

    // 4. Check for any recent activity
    console.log('🕒 Checking for recent activity...');
    
    const recentSessions = sessionsData.filter(session => {
      const sessionDate = new Date(session.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return sessionDate > thirtyDaysAgo;
    });

    console.log(`📅 Recent sessions (last 30 days): ${recentSessions.length}`);
    
    if (recentSessions.length > 0) {
      recentSessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.id} - ${session.status} - ${new Date(session.created_at).toLocaleDateString()}`);
      });
    }

    // 5. Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log(`   Total Sessions: ${sessionsData.length || 0}`);
    console.log(`   Recent Sessions (30 days): ${recentSessions.length}`);
    
    if (sessionsData && sessionsData.length > 0) {
      const statusCounts = {};
      sessionsData.forEach(session => {
        const status = session.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('   Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking Veriff API:', error);
  }
}

// Run the script
checkVeriffAPI(); 