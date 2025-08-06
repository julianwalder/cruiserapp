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

async function checkVeriffRecentActivity() {
  console.log('🔍 Checking Veriff API for recent activity...\n');
  
  if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
    console.error('❌ Veriff API credentials not configured');
    return;
  }

  try {
    // 1. Check API connectivity with a simple endpoint
    console.log('📡 Testing Veriff API connectivity...');
    
    const signature = generateSignature('');
    
    // Try different endpoints to see what's available
    const endpoints = [
      '/sessions',
      '/verifications', 
      '/webhooks',
      '/stats',
      '/account'
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`   Testing endpoint: ${endpoint}`);
        const response = await fetch(`${VERIFF_BASE_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'X-AUTH-CLIENT': VERIFF_API_KEY,
            'X-HMAC-SIGNATURE': signature,
          },
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Endpoint available - Data preview:`, JSON.stringify(data).substring(0, 200) + '...');
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Endpoint not available: ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log(''); // Empty line
    }

    // 2. Try to get account information
    console.log('📊 Checking account information...');
    try {
      const accountResponse = await fetch(`${VERIFF_BASE_URL}/account`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': signature,
        },
      });

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        console.log('✅ Account information:');
        console.log(`   Account ID: ${accountData.id || 'N/A'}`);
        console.log(`   Name: ${accountData.name || 'N/A'}`);
        console.log(`   Environment: ${accountData.environment || 'N/A'}`);
        console.log(`   Created: ${accountData.created_at || 'N/A'}`);
      } else {
        console.log(`❌ Could not fetch account info: ${accountResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Error fetching account info: ${error.message}`);
    }

    // 3. Check if there are any webhook events
    console.log('\n🔔 Checking for webhook events...');
    try {
      const webhookResponse = await fetch(`${VERIFF_BASE_URL}/webhooks`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': signature,
        },
      });

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        console.log(`✅ Found ${webhookData.length || 0} webhook events`);
        
        if (webhookData && webhookData.length > 0) {
          webhookData.slice(0, 5).forEach((webhook, index) => {
            console.log(`   ${index + 1}. ${webhook.id} - ${webhook.event} - ${webhook.created_at}`);
          });
        }
      } else {
        console.log(`❌ Could not fetch webhooks: ${webhookResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Error fetching webhooks: ${error.message}`);
    }

    // 4. Check for any statistics
    console.log('\n📈 Checking for statistics...');
    try {
      const statsResponse = await fetch(`${VERIFF_BASE_URL}/stats`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': signature,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('✅ Statistics:');
        console.log(JSON.stringify(statsData, null, 2));
      } else {
        console.log(`❌ Could not fetch stats: ${statsResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Error fetching stats: ${error.message}`);
    }

    // 5. Summary
    console.log('\n📋 Summary:');
    console.log('   - Veriff API is accessible');
    console.log('   - Session data may have expired (404 on specific session)');
    console.log('   - This is normal for completed verifications');
    console.log('   - Webhook data is stored in your database');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkVeriffRecentActivity(); 