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

async function fetchDaiaVeriffDataV2() {
  console.log('🔍 Fetching Daia\'s verification data from Veriff (Alternative approach)...\n');

  try {
    // Daia's user ID
    const userId = '9043dc12-13d7-4763-a7ac-4d6d8a300ca5';
    
    console.log(`📋 User ID: ${userId}`);

    // Try to get sessions by vendor data (user ID)
    console.log('\n📄 Trying to get sessions by vendor data...');
    
    // First, let's try to get all sessions and filter by vendor data
    // Note: Veriff API doesn't provide a direct way to search by vendor data
    // So we'll try a different approach
    
    // Try to get recent sessions and check if any match our user ID
    const sessionsUrl = `${VERIFF_BASE_URL}/sessions`;
    const sessionsSignature = generateSignature('');
    
    const sessionsResponse = await fetch(sessionsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': VERIFF_API_KEY,
        'X-SIGNATURE': sessionsSignature,
      },
    });

    if (!sessionsResponse.ok) {
      console.error(`❌ Sessions API Error: ${sessionsResponse.status} ${sessionsResponse.statusText}`);
      const errorText = await sessionsResponse.text();
      console.error('Error details:', errorText);
      
      // If we can't get all sessions, let's try a different approach
      console.log('\n🔄 Trying alternative approach...');
      
      // Try to create a new session for Daia to get his data
      console.log('📝 Creating a new session to fetch Daia\'s data...');
      
      const createSessionPayload = {
        verification: {
          callback: `${process.env.NEXT_PUBLIC_APP_URL || 'https://cruiseraviation.ro'}/api/veriff/callback`,
          person: {
            givenName: 'Alexandru-Ștefan',
            lastName: 'Daia'
          }
        },
        vendorData: userId
      };
      
      const createSessionUrl = `${VERIFF_BASE_URL}/sessions`;
      const createSessionSignature = generateSignature(JSON.stringify(createSessionPayload));
      
      const createResponse = await fetch(createSessionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-SIGNATURE': createSessionSignature,
        },
        body: JSON.stringify(createSessionPayload),
      });

      if (createResponse.ok) {
        const newSession = await createResponse.json();
        console.log('✅ New session created:', newSession.id);
        
        // Now try to get verification data for this session
        if (newSession.verification) {
          const verificationUrl = `${VERIFF_BASE_URL}/verifications/${newSession.verification.id}`;
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
            console.log('✅ Verification data retrieved for new session');
            console.log('📄 Verification data:', JSON.stringify(verificationData, null, 2));
          } else {
            console.error('❌ Could not get verification data for new session');
          }
        }
      } else {
        console.error('❌ Could not create new session');
      }
      
      return;
    }

    const sessionsData = await sessionsResponse.json();
    console.log('✅ Sessions data retrieved');
    
    // Look for sessions with our user ID in vendor data
    if (sessionsData.sessions) {
      const daiaSession = sessionsData.sessions.find(session => 
        session.vendorData === userId || 
        session.endUserId === userId
      );
      
      if (daiaSession) {
        console.log('✅ Found Daia\'s session:', daiaSession.id);
        console.log('Session data:', JSON.stringify(daiaSession, null, 2));
        
        // Get verification data for this session
        if (daiaSession.verification) {
          const verificationUrl = `${VERIFF_BASE_URL}/verifications/${daiaSession.verification.id}`;
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
            }
            
            console.log('\n📄 Full verification data:', JSON.stringify(verificationData, null, 2));
          }
        }
      } else {
        console.log('❌ Could not find Daia\'s session in the sessions list');
      }
    } else {
      console.log('❌ No sessions data available');
    }

  } catch (error) {
    console.error('❌ Error fetching Veriff data:', error);
  }
}

fetchDaiaVeriffDataV2(); 