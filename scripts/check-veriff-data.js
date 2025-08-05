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

  console.log(`Making ${method} request to: ${url}`);
  console.log('Headers:', headers);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  console.log(`Response status: ${response.status}`);
  console.log(`Response body: ${responseText}`);

  if (!response.ok) {
    throw new Error(`Veriff API error: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : null;
}

// Get all sessions from Veriff
async function getAllSessions() {
  console.log('\n=== Getting All Veriff Sessions ===');
  try {
    const sessions = await makeVeriffRequest('/sessions');
    console.log('Sessions found:', sessions);
    return sessions;
  } catch (error) {
    console.error('Error getting sessions:', error.message);
    return null;
  }
}

// Get specific session by ID
async function getSession(sessionId) {
  console.log(`\n=== Getting Session: ${sessionId} ===`);
  try {
    const session = await makeVeriffRequest(`/sessions/${sessionId}`);
    console.log('Session details:', session);
    return session;
  } catch (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
}

// Get verification details by ID
async function getVerification(verificationId) {
  console.log(`\n=== Getting Verification: ${verificationId} ===`);
  try {
    const verification = await makeVeriffRequest(`/verifications/${verificationId}`);
    console.log('Verification details:', verification);
    return verification;
  } catch (error) {
    console.error('Error getting verification:', error.message);
    return null;
  }
}

// Get users with Veriff data from database
async function getUsersWithVeriffData() {
  console.log('\n=== Getting Users with Veriff Data ===');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, veriffSessionId, veriffStatus, identityVerified, veriffData, updatedAt')
      .not('veriffSessionId', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    console.log('Users with Veriff data:', users);
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return null;
  }
}

// Main function to check all data
async function checkAllVeriffData() {
  console.log('=== Veriff Data Check ===');
  console.log('API Key:', VERIFF_API_KEY ? `${VERIFF_API_KEY.substring(0, 8)}...` : 'Not set');
  console.log('API Secret:', VERIFF_API_SECRET ? `${VERIFF_API_SECRET.substring(0, 8)}...` : 'Not set');
  console.log('Base URL:', VERIFF_BASE_URL);

  // Check database users first
  const users = await getUsersWithVeriffData();
  
  if (users && users.length > 0) {
    console.log(`\nFound ${users.length} users with Veriff data`);
    
    // Get all sessions from Veriff
    const sessions = await getAllSessions();
    
    // For each user with Veriff data, try to get their session details
    for (const user of users) {
      console.log(`\n--- Checking user: ${user.email} ---`);
      console.log('User Veriff data:', user);
      
      if (user.veriffSessionId) {
        const session = await getSession(user.veriffSessionId);
        if (session && session.verification && session.verification.id) {
          const verification = await getVerification(session.verification.id);
        }
      }
    }
  } else {
    console.log('No users found with Veriff data');
    
    // Still try to get all sessions from Veriff
    const sessions = await getAllSessions();
  }
}

// Run the check
checkAllVeriffData().catch(console.error); 