const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Veriff API configuration
const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generate Veriff signature
function generateSignature(payloadString) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
  hmac.update(payloadString);
  return hmac.digest('hex');
}

// Make authenticated request to Veriff API
async function makeVeriffRequest(endpoint, method = 'GET', body = null) {
  const url = `${VERIFF_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-AUTH-CLIENT': VERIFF_API_KEY,
  };

  if (body) {
    const payloadString = JSON.stringify(body);
    const signature = generateSignature(payloadString);
    headers['X-HMAC-SIGNATURE'] = signature;
  }

  console.log(`\nMaking ${method} request to: ${url}`);
  console.log('Headers:', JSON.stringify(headers, null, 2));

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${responseText}`);

    if (response.ok) {
      return responseText ? JSON.parse(responseText) : null;
    } else {
      console.log(`❌ Failed: ${response.status} - ${responseText}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

// Test different endpoints
async function testEndpoints() {
  console.log('=== Testing Veriff API Endpoints ===');
  console.log('API Key:', VERIFF_API_KEY ? `${VERIFF_API_KEY.substring(0, 8)}...` : 'Not set');
  console.log('API Secret:', VERIFF_API_SECRET ? `${VERIFF_API_SECRET.substring(0, 8)}...` : 'Not set');
  console.log('Base URL:', VERIFF_BASE_URL);

  // Test different endpoints
  const endpoints = [
    '/sessions',
    '/verifications',
    '/sessions/',
    '/verifications/',
    '/',
    '/health',
    '/status'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Testing endpoint: ${endpoint} ---`);
    await makeVeriffRequest(endpoint);
  }

  // Test with a specific session ID from our database
  const { data: users } = await supabase
    .from('users')
    .select('veriffSessionId')
    .not('veriffSessionId', 'is', null)
    .limit(1);

  if (users && users.length > 0 && users[0].veriffSessionId) {
    const sessionId = users[0].veriffSessionId;
    console.log(`\n--- Testing with specific session ID: ${sessionId} ---`);
    
    const specificEndpoints = [
      `/sessions/${sessionId}`,
      `/verifications/${sessionId}`,
      `/session/${sessionId}`,
      `/verification/${sessionId}`
    ];

    for (const endpoint of specificEndpoints) {
      await makeVeriffRequest(endpoint);
    }
  }
}

// Test webhook verification
async function testWebhookVerification() {
  console.log('\n=== Testing Webhook Verification ===');
  
  // Test payload similar to what we received
  const testPayload = {
    id: "06e4fe9c-8736-4ad3-a2b3-7605d91094ac",
    code: 7002,
    action: "submitted",
    feature: "selfid",
    attemptId: "b55dec60-321b-4b32-ae44-bff850321bac",
    endUserId: null,
    vendorData: "3688d854-3ee7-404b-a1b1-b60f1d8aba2f"
  };

  console.log('Test payload:', JSON.stringify(testPayload, null, 2));
  
  // Try to get verification details for this ID
  await makeVeriffRequest(`/verifications/${testPayload.id}`);
}

// Run tests
async function runTests() {
  await testEndpoints();
  await testWebhookVerification();
}

runTests().catch(console.error); 