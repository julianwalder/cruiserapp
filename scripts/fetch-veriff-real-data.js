// Import the VeriffService and other required modules
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock the VeriffService for Node.js environment
class VeriffService {
  static get BASE_URL() { return process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1'; }
  static get API_KEY() { return process.env.VERIFF_API_KEY; }
  static get API_SECRET() { return process.env.VERIFF_API_SECRET; }
  static get ENVIRONMENT() { return process.env.VERIFF_ENVIRONMENT || 'production'; }

  static generateSignature(payload) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.API_SECRET).update(payload).digest('hex');
  }

  static async getVerification(verificationId) {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials not configured');
    }

    console.log('🔑 Using Veriff API credentials:');
    console.log(`  Base URL: ${this.BASE_URL}`);
    console.log(`  API Key: ${this.API_KEY ? this.API_KEY.substring(0, 8) + '...' : 'Not set'}`);
    console.log(`  Environment: ${this.ENVIRONMENT}`);
    console.log();

    try {
      const response = await fetch(`${this.BASE_URL}/verifications/${verificationId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': this.API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      console.log(`📡 API Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.warn(`❌ Verification API returned ${response.status} for ID: ${verificationId}`);
        if (response.status === 404) {
          throw new Error(`Session not found (404): ${verificationId}`);
        }
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched verification data from Veriff API!');
      return data;
    } catch (error) {
      console.error('❌ Error getting verification from API:', error.message);
      throw error;
    }
  }

  static async getAttempt(attemptId) {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials not configured');
    }

    console.log('🔑 Using Veriff API credentials for attempt:');
    console.log(`  Base URL: ${this.BASE_URL}`);
    console.log(`  API Key: ${this.API_KEY ? this.API_KEY.substring(0, 8) + '...' : 'Not set'}`);
    console.log(`  Environment: ${this.ENVIRONMENT}`);
    console.log();

    try {
      const response = await fetch(`${this.BASE_URL}/attempts/${attemptId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': this.API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      console.log(`📡 API Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.warn(`❌ Attempt API returned ${response.status} for ID: ${attemptId}`);
        if (response.status === 404) {
          throw new Error(`Attempt not found (404): ${attemptId}`);
        }
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched attempt data from Veriff API!');
      return data;
    } catch (error) {
      console.error('❌ Error getting attempt from API:', error.message);
      throw error;
    }
  }
}

async function fetchVeriffRealData() {
  console.log('🔍 Fetching REAL data from Veriff API using VeriffService...\n');

  // Get Luca's current data
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  console.log('📊 Bogdan Luca\'s Veriff Information:');
  console.log('=====================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Attempt ID: ${lucaUser.veriffAttemptId}`);
  console.log(`Verification ID: ${lucaUser.veriffVerificationId}`);
  console.log(`Session ID: ${lucaUser.veriffSessionId}`);
  console.log(`Feature: ${lucaUser.veriffFeature}`);
  console.log(`Status: ${lucaUser.veriffStatus}`);
  console.log(`Identity Verified: ${lucaUser.identityVerified}`);
  console.log();

  // Try to fetch data using different IDs
  const idsToTry = [
    { type: 'Attempt ID', id: lucaUser.veriffAttemptId },
    { type: 'Verification ID', id: lucaUser.veriffVerificationId },
    { type: 'Session ID', id: lucaUser.veriffSessionId }
  ].filter(item => item.id);

  console.log('🔍 Attempting to fetch data from Veriff API...');
  console.log('==============================================');

  for (const { type, id } of idsToTry) {
    console.log(`\n📡 Trying ${type}: ${id}`);
    console.log('================================');
    
    try {
      let data;
      
      if (type === 'Attempt ID') {
        data = await VeriffService.getAttempt(id);
      } else {
        data = await VeriffService.getVerification(id);
      }
      
      console.log('🎯 SUCCESS! Real data from Veriff API:');
      console.log('=====================================');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract the important fields
      console.log('\n📋 EXTRACTED REAL DATA:');
      console.log('========================');
      
      if (data.person) {
        console.log('👤 PERSONAL INFORMATION:');
        console.log(`  Given Name: ${data.person.givenName || 'N/A'}`);
        console.log(`  Last Name: ${data.person.lastName || 'N/A'}`);
        console.log(`  Date of Birth: ${data.person.dateOfBirth || 'N/A'}`);
        console.log(`  ID Number: ${data.person.idNumber || 'N/A'}`);
        console.log(`  Gender: ${data.person.gender || 'N/A'}`);
        console.log(`  Nationality: ${data.person.nationality || 'N/A'}`);
        console.log(`  Country: ${data.person.country || 'N/A'}`);
      }
      
      if (data.document) {
        console.log('📄 DOCUMENT INFORMATION:');
        console.log(`  Type: ${data.document.type || 'N/A'}`);
        console.log(`  Number: ${data.document.number || 'N/A'}`);
        console.log(`  Country: ${data.document.country || 'N/A'}`);
        console.log(`  Valid From: ${data.document.validFrom || 'N/A'}`);
        console.log(`  Valid Until: ${data.document.validUntil || 'N/A'}`);
        console.log(`  Issued By: ${data.document.issuedBy || 'N/A'}`);
      }
      
      if (data.additionalVerification) {
        console.log('🔍 ADDITIONAL VERIFICATION:');
        console.log(`  Face Match Similarity: ${data.additionalVerification.faceMatch?.similarity || 'N/A'}`);
        console.log(`  Face Match Status: ${data.additionalVerification.faceMatch?.status || 'N/A'}`);
      }
      
      console.log('\n🎯 VERIFICATION STATUS:');
      console.log(`  Status: ${data.status || 'N/A'}`);
      console.log(`  Decision Score: ${data.decisionScore || 'N/A'}`);
      
      console.log('\n💡 NEXT STEPS:');
      console.log('==============');
      console.log('1. Copy the real values from above');
      console.log('2. Update the database with these real values');
      console.log('3. Test the verification display');
      
      return; // Success, exit
      
    } catch (error) {
      console.log(`❌ Failed with ${type}: ${error.message}`);
      continue;
    }
  }
  
  console.log('\n❌ All attempts failed to fetch data from Veriff API');
  console.log('This could be due to:');
  console.log('1. API credentials not configured properly');
  console.log('2. Session/attempt has expired');
  console.log('3. Different API endpoint structure for SelfID');
  console.log();
  console.log('💡 FALLBACK: Manual data entry required');
  console.log('=====================================');
  console.log('Please get the real data from the Veriff dashboard manually.');
}

fetchVeriffRealData().catch(console.error);
