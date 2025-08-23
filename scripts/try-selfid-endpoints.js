const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

class VeriffAPI {
  static get BASE_URL() { return process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1'; }
  static get API_KEY() { return process.env.VERIFF_API_KEY; }
  static get API_SECRET() { return process.env.VERIFF_API_SECRET; }

  static generateSignature(payload) {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', this.API_SECRET).update(payload).digest('hex');
  }

  static async makeRequest(endpoint, method = 'GET') {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials not configured');
    }

    const url = `${this.BASE_URL}${endpoint}`;
    console.log(`📡 ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'X-AUTH-CLIENT': this.API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      console.log(`📊 Response Status: ${response.status}`);
      
      if (!response.ok) {
        console.log(`❌ Error: ${response.status} - ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log('✅ Success!');
      return data;
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      return null;
    }
  }
}

async function trySelfIDEndpoints() {
  console.log('🔍 Trying different Veriff API endpoints for SelfID data...\n');

  // Get Luca's data
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  const attemptId = lucaUser.veriffAttemptId;
  console.log(`📋 Attempt ID: ${attemptId}`);
  console.log(`📋 Feature: ${lucaUser.veriffFeature}`);
  console.log();

  // Try different endpoints that might work for SelfID
  const endpoints = [
    `/attempts/${attemptId}`,
    `/sessions/${attemptId}`,
    `/verifications/${attemptId}`,
    `/selfid/attempts/${attemptId}`,
    `/selfid/sessions/${attemptId}`,
    `/selfid/verifications/${attemptId}`,
    `/identity-verification/${attemptId}`,
    `/identity-verifications/${attemptId}`,
    `/documents/${attemptId}`,
    `/persons/${attemptId}`,
  ];

  console.log('🔍 Testing different API endpoints...');
  console.log('=====================================');

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    console.log('================================');
    
    const data = await VeriffAPI.makeRequest(endpoint);
    
    if (data) {
      console.log('🎯 SUCCESS! Found data:');
      console.log('========================');
      console.log(JSON.stringify(data, null, 2));
      
      // Extract useful information
      console.log('\n📋 EXTRACTED DATA:');
      console.log('==================');
      
      if (data.person) {
        console.log('👤 PERSON:');
        Object.entries(data.person).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
      
      if (data.document) {
        console.log('📄 DOCUMENT:');
        Object.entries(data.document).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
      
      if (data.verification) {
        console.log('🔍 VERIFICATION:');
        Object.entries(data.verification).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
      
      // Check for any other useful fields
      const usefulFields = ['status', 'decisionScore', 'insights', 'additionalVerification'];
      usefulFields.forEach(field => {
        if (data[field]) {
          console.log(`${field.toUpperCase()}:`);
          console.log(`  ${JSON.stringify(data[field])}`);
        }
      });
      
      console.log('\n💡 This endpoint works! We can use this to get real data.');
      return;
    }
  }
  
  console.log('\n❌ None of the tested endpoints returned data');
  console.log('This suggests:');
  console.log('1. The session/attempt has expired');
  console.log('2. SelfID uses a different API structure');
  console.log('3. The data is only available through webhooks');
  console.log();
  console.log('💡 RECOMMENDATION:');
  console.log('==================');
  console.log('Since direct API access isn\'t working, we need to:');
  console.log('1. Get the real data from the Veriff dashboard manually');
  console.log('2. Or trigger a new verification session to get fresh webhook data');
  console.log('3. Or check if there are other API endpoints in Veriff documentation');
}

trySelfIDEndpoints().catch(console.error);
