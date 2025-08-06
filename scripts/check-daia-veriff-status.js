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

async function checkDaiaVeriffStatus() {
  console.log('🔍 Checking Daia\'s current Veriff status...\n');

  try {
    // 1. Get current database status
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        veriffSessionId,
        veriffVerificationId,
        "identityVerified",
        "identityVerifiedAt",
        veriffWebhookReceivedAt,
        veriffWebhookData,
        "updatedAt"
      `)
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (error) {
      console.error('❌ Error fetching user data:', error);
      return;
    }

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Current Status: ${user.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);
    console.log(`   Last Updated: ${new Date(user.updatedAt).toLocaleString()}`);
    console.log(`   Last Webhook: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'None'}`);
    console.log('');

    // 2. Check webhook data
    if (user.veriffWebhookData) {
      console.log('📋 Last Webhook Data:');
      console.log(JSON.stringify(user.veriffWebhookData, null, 2));
      console.log('');
    }

    // 3. Check Veriff API for session status
    if (user.veriffSessionId && VERIFF_API_KEY && VERIFF_API_SECRET) {
      console.log('📡 Checking Veriff API for session status...');
      
      try {
        const sessionResponse = await fetch(`${VERIFF_BASE_URL}/sessions/${user.veriffSessionId}`, {
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
          }
          
          if (sessionData.verification) {
            console.log(`   Verification ID: ${sessionData.verification.id}`);
            console.log(`   Verification Status: ${sessionData.verification.status}`);
          }
          
          // Check if status has changed
          if (sessionData.status !== user.veriffStatus) {
            console.log(`⚠️  STATUS MISMATCH: Database shows "${user.veriffStatus || 'None'}" but Veriff shows "${sessionData.status}"`);
          } else {
            console.log('✅ Status matches between database and Veriff API');
          }
        } else {
          console.log(`❌ Session not found in Veriff API: ${sessionResponse.status}`);
          if (sessionResponse.status === 404) {
            console.log('   Session may have expired or been deleted');
          }
        }
      } catch (error) {
        console.log(`❌ Error checking Veriff API: ${error.message}`);
      }
    } else {
      console.log('⚠️  Cannot check Veriff API - missing session ID or API credentials');
    }

    // 4. Analysis
    console.log('\n📊 Analysis:');
    if (user.veriffStatus === 'None' && user.veriffWebhookReceivedAt) {
      console.log('⚠️  WEBHOOK DATA LOST OR CLEARED');
      console.log('   - A webhook was received but status is now None');
      console.log('   - This could indicate:');
      console.log('     * Webhook processing failed');
      console.log('     * Status was manually cleared');
      console.log('     * Database update failed');
    } else if (user.veriffStatus === 'submitted') {
      console.log('⏳ VERIFICATION PENDING');
      console.log('   - User submitted verification but approval webhook not received');
      console.log('   - Check Veriff dashboard for manual approval requirements');
    } else if (user.identityVerified) {
      console.log('✅ VERIFICATION COMPLETED');
      console.log('   - User is verified and approved');
    } else {
      console.log('📭 NO VERIFICATION DATA');
      console.log('   - No verification process found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkDaiaVeriffStatus(); 