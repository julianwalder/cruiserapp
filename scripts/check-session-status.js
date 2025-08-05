const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function generateSignature(payloadString) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', VERIFF_API_SECRET).update(payloadString).digest('hex');
}

async function makeVeriffRequest(endpoint, method = 'GET', body = null) {
  const url = `${VERIFF_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-AUTH-CLIENT': VERIFF_API_KEY,
  };

  if (method === 'GET') {
    headers['X-HMAC-SIGNATURE'] = generateSignature('');
  } else if (body) {
    const bodyString = JSON.stringify(body);
    headers['X-HMAC-SIGNATURE'] = generateSignature(bodyString);
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`Making ${method} request to: ${url}`);
  console.log('Headers:', headers);

  try {
    const response = await fetch(url, options);
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      return { error: errorText, status: response.status };
    }

    const data = await response.json();
    return { data, status: response.status };
  } catch (error) {
    console.error('Request failed:', error);
    return { error: error.message };
  }
}

async function checkSessionStatus(sessionId) {
  console.log(`\n=== Checking Session Status: ${sessionId} ===`);
  
  // Check session details
  const sessionResult = await makeVeriffRequest(`/sessions/${sessionId}`);
  console.log('Session API Response:', JSON.stringify(sessionResult, null, 2));

  // Check if there are any verifications for this session
  const verificationsResult = await makeVeriffRequest(`/sessions/${sessionId}/verifications`);
  console.log('Verifications API Response:', JSON.stringify(verificationsResult, null, 2));

  return { sessionResult, verificationsResult };
}

async function checkUserSession(userId) {
  console.log(`\n=== Checking User Session for: ${userId} ===`);
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, veriffSessionId, veriffStatus, veriffData, updatedAt')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return;
  }

  console.log('User data:', JSON.stringify(user, null, 2));

  if (user.veriffSessionId) {
    await checkSessionStatus(user.veriffSessionId);
  } else {
    console.log('No Veriff session ID found for user');
  }
}

async function main() {
  const sessionId = 'b0fc7c45-8527-40f9-9924-f8aed05181ca';
  
  // Check the specific session
  await checkSessionStatus(sessionId);
  
  // Check all users with Veriff sessions
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, veriffSessionId, veriffStatus, updatedAt')
    .not('veriffSessionId', 'is', null);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  console.log('\n=== All Users with Veriff Sessions ===');
  users.forEach(user => {
    console.log(`${user.email}: ${user.veriffSessionId} (${user.veriffStatus}) - ${user.updatedAt}`);
  });
}

main().catch(console.error); 