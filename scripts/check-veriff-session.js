const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.log('Error decoding JWT:', error.message);
    return null;
  }
}

async function checkVeriffSession() {
  console.log('🔍 Analyzing Veriff session URL...\n');

  const sessionUrl = 'https://alchemy.veriff.com/v/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTU1MTc4MjEsInNlc3Npb25faWQiOiI4MmRkZGEwZi02MjUxLTRjOGMtODZmOS1kMTY4MWQ3NDQ0ODkiLCJpaWQiOiIyY2U5MmVhNi0wODlhLTRlNjUtYmVkNC1lNTMyMDEwZjNiYTAiLCJ2aWQiOiIwNTAwZmY4YS0wZmY3LTQ1N2EtOTZlMy01NGMwYjVlNGUxOTEiLCJjaWQiOiJmYWxjb24tMSIsImV4cCI6MTc1NjEyMjYyMX0.9Of5MgPVVNuz-rTjJx84iyyIeCi9B7xG4MXqzWgysUM';
  
  // Extract the JWT token from the URL
  const jwtToken = sessionUrl.split('/v/')[1];
  
  console.log('📋 Session URL Analysis:');
  console.log('========================');
  console.log(`Host: alchemy.veriff.com`);
  console.log(`JWT Token: ${jwtToken.substring(0, 50)}...`);
  console.log();

  // Decode the JWT token
  const decodedToken = decodeJWT(jwtToken);
  
  if (decodedToken) {
    console.log('🔓 Decoded JWT Token:');
    console.log('=====================');
    console.log(JSON.stringify(decodedToken, null, 2));
    console.log();

    // Extract key information
    const sessionId = decodedToken.session_id;
    const issuedAt = new Date(decodedToken.iat * 1000);
    const expiresAt = new Date(decodedToken.exp * 1000);
    const isExpired = new Date() > expiresAt;

    console.log('📊 Session Information:');
    console.log('========================');
    console.log(`Session ID: ${sessionId}`);
    console.log(`Issued At: ${issuedAt.toISOString()}`);
    console.log(`Expires At: ${expiresAt.toISOString()}`);
    console.log(`Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
    console.log();

    // Check if this session exists in our database
    console.log('🔍 Checking database for this session...');
    console.log('========================================');

    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, firstName, lastName, veriffSessionId, veriffStatus, veriffFeature')
      .or(`veriffSessionId.eq.${sessionId},veriffAttemptId.eq.${sessionId}`);

    if (error) {
      console.error('Error querying database:', error);
      return;
    }

    if (users && users.length > 0) {
      console.log('✅ Found matching session in database:');
      console.log('=====================================');
      users.forEach(user => {
        console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`Session ID: ${user.veriffSessionId}`);
        console.log(`Status: ${user.veriffStatus}`);
        console.log(`Feature: ${user.veriffFeature}`);
        console.log();
      });
    } else {
      console.log('❌ No matching session found in database');
      console.log('This could be:');
      console.log('1. A session from a different user');
      console.log('2. A session that was never stored in our database');
      console.log('3. A test session from Veriff');
      console.log();
    }

    // Try to fetch data from Veriff API using this session ID
    console.log('🔍 Attempting to fetch data from Veriff API...');
    console.log('=============================================');

    const VeriffAPI = {
      get BASE_URL() { return process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1'; },
      get API_KEY() { return process.env.VERIFF_API_KEY; },
      get API_SECRET() { return process.env.VERIFF_API_SECRET; },

      generateSignature(payload) {
        const crypto = require('crypto');
        return crypto.createHmac('sha256', this.API_SECRET).update(payload).digest('hex');
      },

      async makeRequest(endpoint) {
        if (!this.API_KEY || !this.API_SECRET) {
          console.log('❌ Veriff API credentials not configured');
          return null;
        }

        try {
          const response = await fetch(`${this.BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'X-AUTH-CLIENT': this.API_KEY,
              'X-HMAC-SIGNATURE': this.generateSignature(''),
            },
          });

          console.log(`📡 API Response: ${response.status}`);
          
          if (!response.ok) {
            console.log(`❌ API Error: ${response.status} - ${response.statusText}`);
            return null;
          }

          const data = await response.json();
          console.log('✅ Successfully fetched data from Veriff API!');
          return data;
        } catch (error) {
          console.log(`❌ Request failed: ${error.message}`);
          return null;
        }
      }
    };

    // Try different endpoints with this session ID
    const endpoints = [
      `/sessions/${sessionId}`,
      `/verifications/${sessionId}`,
      `/attempts/${sessionId}`
    ];

    for (const endpoint of endpoints) {
      console.log(`\n📡 Trying endpoint: ${endpoint}`);
      const data = await VeriffAPI.makeRequest(endpoint);
      
      if (data) {
        console.log('🎯 SUCCESS! Found data:');
        console.log('========================');
        console.log(JSON.stringify(data, null, 2));
        return;
      }
    }

    console.log('\n❌ Could not fetch data from Veriff API');
    console.log('This session might be expired or use a different API structure');
  } else {
    console.log('❌ Could not decode JWT token');
  }

  console.log('\n💡 SUMMARY:');
  console.log('============');
  console.log('This appears to be a Veriff session URL, but:');
  console.log('1. It\'s not in our database');
  console.log('2. We can\'t fetch data from the API');
  console.log('3. It might be expired or from a different user');
  console.log();
  console.log('🎯 RECOMMENDATION:');
  console.log('==================');
  console.log('Continue with the new session we created for Bogdan Luca');
  console.log('or get the real data manually from the Veriff dashboard');
}

checkVeriffSession().catch(console.error);
