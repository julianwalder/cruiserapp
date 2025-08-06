require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function checkSpecificVeriffSession() {
  console.log('🔍 Checking specific Veriff session from database...\n');
  
  if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
    console.error('❌ Veriff API credentials not configured');
    console.log('Please check your .env.local file for:');
    console.log('- VERIFF_API_KEY');
    console.log('- VERIFF_API_SECRET');
    return;
  }

  try {
    // 1. Get the session ID from our database
    const { data: users, error } = await supabase
      .from('users')
      .select('veriffSessionId, veriffVerificationId, "firstName", "lastName", email')
      .not('veriffSessionId', 'is', null)
      .limit(5);

    if (error) {
      console.error('❌ Error fetching users with Veriff sessions:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📭 No users with Veriff session IDs found in database');
      return;
    }

    console.log(`📊 Found ${users.length} users with Veriff session IDs:\n`);

    // 2. Check each session in Veriff API
    for (const user of users) {
      console.log(`👤 Checking session for: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Session ID: ${user.veriffSessionId}`);
      
      if (user.veriffVerificationId) {
        console.log(`   Verification ID: ${user.veriffVerificationId}`);
      }

      // Check session status
      try {
        console.log('   📡 Checking session status...');
        const sessionResponse = await fetch(`${VERIFF_BASE_URL}/sessions/${user.veriffSessionId}`, {
          method: 'GET',
          headers: {
            'X-AUTH-CLIENT': VERIFF_API_KEY,
            'X-HMAC-SIGNATURE': generateSignature(''),
          },
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log('   ✅ Session found in Veriff API:');
          console.log(`      Status: ${sessionData.status}`);
          console.log(`      Created: ${sessionData.created_at}`);
          console.log(`      Updated: ${sessionData.updated_at}`);
          
          if (sessionData.person) {
            console.log(`      Person: ${sessionData.person.firstName} ${sessionData.person.lastName}`);
            console.log(`      Email: ${sessionData.person.email}`);
          }
          
          if (sessionData.document) {
            console.log(`      Document Type: ${sessionData.document.type}`);
          }
          
          if (sessionData.verification) {
            console.log(`      Verification ID: ${sessionData.verification.id}`);
            console.log(`      Verification Status: ${sessionData.verification.status}`);
          }
          
          // Check verification details if available
          if (user.veriffVerificationId) {
            console.log('   📡 Checking verification details...');
            const verificationResponse = await fetch(`${VERIFF_BASE_URL}/verifications/${user.veriffVerificationId}`, {
              method: 'GET',
              headers: {
                'X-AUTH-CLIENT': VERIFF_API_KEY,
                'X-HMAC-SIGNATURE': generateSignature(''),
              },
            });

            if (verificationResponse.ok) {
              const verificationData = await verificationResponse.json();
              console.log('   ✅ Verification details:');
              console.log(`      Status: ${verificationData.status}`);
              console.log(`      Created: ${verificationData.createdAt}`);
              console.log(`      Updated: ${verificationData.updatedAt}`);
              
              if (verificationData.person) {
                console.log(`      Person: ${verificationData.person.givenName} ${verificationData.person.lastName}`);
                console.log(`      Nationality: ${verificationData.person.nationality}`);
                console.log(`      Country: ${verificationData.person.country}`);
              }
              
              if (verificationData.document) {
                console.log(`      Document: ${verificationData.document.type} from ${verificationData.document.country}`);
                console.log(`      Number: ${verificationData.document.number}`);
              }
              
              if (verificationData.additionalVerification?.faceMatch) {
                console.log(`      Face Match: ${verificationData.additionalVerification.faceMatch.status} (${verificationData.additionalVerification.faceMatch.similarity}%)`);
              }
              
              if (verificationData.decisionScore) {
                console.log(`      Decision Score: ${verificationData.decisionScore}`);
              }
              
              if (verificationData.insights) {
                console.log(`      Quality: ${verificationData.insights.quality}`);
                if (verificationData.insights.flags) {
                  console.log(`      Flags: ${verificationData.insights.flags.join(', ')}`);
                }
                if (verificationData.insights.context) {
                  console.log(`      Context: ${verificationData.insights.context}`);
                }
              }
            } else {
              console.log(`   ⚠️  Could not fetch verification details: ${verificationResponse.status}`);
            }
          }
        } else {
          console.log(`   ❌ Session not found in Veriff API: ${sessionResponse.status}`);
          if (sessionResponse.status === 404) {
            console.log('   📝 Session may have expired or been deleted');
          }
        }
      } catch (error) {
        console.log(`   ❌ Error checking session: ${error.message}`);
      }

      console.log(''); // Empty line for separation
    }

    // 3. Summary
    console.log('📈 Summary:');
    console.log(`   Total users with session IDs: ${users.length}`);
    console.log(`   Sessions checked in Veriff API: ${users.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkSpecificVeriffSession(); 