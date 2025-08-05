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

async function fetchSessionData(sessionId) {
  console.log(`\n=== Fetching Session Data: ${sessionId} ===`);
  
  // Try different endpoints to get session data
  const endpoints = [
    `/sessions/${sessionId}`,
    `/verifications/${sessionId}`,
    `/sessions/${sessionId}/verifications`,
    `/sessions/${sessionId}/decision`,
    `/sessions/${sessionId}/media`,
    `/sessions/${sessionId}/person`,
    `/sessions/${sessionId}/document`
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Trying endpoint: ${endpoint} ---`);
    const result = await makeVeriffRequest(endpoint);
    
    if (result.data) {
      console.log('✅ Success! Data found:');
      console.log(JSON.stringify(result.data, null, 2));
      return result.data;
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }

  // Try alternative authentication methods
  console.log('\n--- Trying alternative authentication ---');
  
  // Try without signature
  const url = `${VERIFF_BASE_URL}/sessions/${sessionId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-AUTH-CLIENT': VERIFF_API_KEY,
    },
  });

  console.log(`Alternative auth response status: ${response.status}`);
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Success with alternative auth:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } else {
    const errorText = await response.text();
    console.log(`❌ Alternative auth failed: ${errorText}`);
  }

  return null;
}

async function updateUserWithVeriffData(userId, sessionId, veriffData) {
  console.log(`\n=== Updating User ${userId} with Veriff Data ===`);
  
  const { error } = await supabase
    .from('users')
    .update({
      veriffData: veriffData,
      veriffStatus: 'submitted',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    return false;
  }

  console.log('✅ User updated successfully');
  return true;
}

async function main() {
  const sessionId = 'b0fc7c45-8527-40f9-9924-f8aed05181ca';
  
  // Fetch the actual session data from Veriff
  const veriffData = await fetchSessionData(sessionId);
  
  if (veriffData) {
    // Find the user with this session ID
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .eq('veriffSessionId', sessionId)
      .single();

    if (user) {
      console.log(`\nFound user: ${user.email} (${user.firstName} ${user.lastName})`);
      
      // Update user with the actual Veriff data
      await updateUserWithVeriffData(user.id, sessionId, veriffData);
    } else {
      console.log('\n❌ No user found with this session ID');
    }
  } else {
    console.log('\n❌ Could not fetch session data from Veriff');
  }
}

main().catch(console.error); 