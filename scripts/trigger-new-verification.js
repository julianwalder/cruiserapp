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

  static async createSelfIDSession(userId, userData) {
    if (!this.API_KEY || !this.API_SECRET) {
      throw new Error('Veriff API credentials not configured');
    }

    const payload = {
      verification: {
        callback: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.cruiseraviation.com'}/api/veriff/callback`,
        person: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email
        },
        document: {
          type: 'PASSPORT'
        },
        vendorData: userId,
        features: ['selfid']
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);
    
    console.log('📡 Creating new SelfID session...');
    console.log(`URL: ${this.BASE_URL}/sessions`);
    console.log(`Payload: ${payloadString}`);
    console.log(`Signature: ${signature.substring(0, 10)}...`);

    try {
      const response = await fetch(`${this.BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': this.API_KEY,
          'X-HMAC-SIGNATURE': signature,
        },
        body: payloadString,
      });

      console.log(`📊 Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error: ${response.status} - ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully created new SelfID session!');
      return data;
    } catch (error) {
      console.error('❌ Error creating session:', error.message);
      throw error;
    }
  }
}

async function triggerNewVerification() {
  console.log('🔄 Triggering new verification session for Bogdan Luca...\n');

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

  console.log('📊 Current Bogdan Luca data:');
  console.log('============================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Name: ${lucaUser.firstName} ${lucaUser.lastName}`);
  console.log(`Current Status: ${lucaUser.veriffStatus}`);
  console.log(`Identity Verified: ${lucaUser.identityVerified}`);
  console.log();

  console.log('⚠️  WARNING: This will create a NEW verification session');
  console.log('=======================================================');
  console.log('1. Bogdan Luca will need to complete verification again');
  console.log('2. The new session will generate fresh webhook data');
  console.log('3. This will contain ALL the real data from his Veriff ID');
  console.log('4. The old session data will be replaced');
  console.log();

  console.log('💡 BENEFITS:');
  console.log('============');
  console.log('✅ Fresh webhook data with complete real information');
  console.log('✅ All fields will be populated with real values');
  console.log('✅ Verification display will match Alexandru-Ștefan Daia');
  console.log('✅ No more fake/placeholder data');
  console.log();

  console.log('🎯 PROCEEDING WITH NEW SESSION CREATION...');
  console.log('==========================================');

  try {
    // Create new SelfID session
    const sessionData = await VeriffAPI.createSelfIDSession(
      lucaUser.id,
      {
        firstName: lucaUser.firstName,
        lastName: lucaUser.lastName,
        email: lucaUser.email
      }
    );

    console.log('🎯 NEW SESSION CREATED SUCCESSFULLY!');
    console.log('====================================');
    console.log(JSON.stringify(sessionData, null, 2));

    // Update user with new session data
    const { error: updateError } = await supabase
      .from('users')
      .update({
        veriffSessionId: sessionData.id,
        veriffStatus: 'created',
        veriffFeature: 'selfid',
        identityVerified: false, // Reset verification status
        updatedAt: new Date().toISOString(),
      })
      .eq('id', lucaUser.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return;
    }

    console.log('✅ User database updated with new session!');
    console.log();
    console.log('🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. 📋 Bogdan Luca needs to complete the new verification');
    console.log('2. 🔗 Send him the verification URL:');
    console.log(`   ${sessionData.verification.url}`);
    console.log('3. 📡 When he completes it, we\'ll receive fresh webhook data');
    console.log('4. ✅ The webhook will contain ALL real data from his Veriff ID');
    console.log('5. 🎉 Verification display will show complete real information');
    console.log();
    console.log('💡 ALTERNATIVE: Manual Data Entry');
    console.log('================================');
    console.log('If you prefer not to trigger a new verification:');
    console.log('1. Go to Veriff dashboard');
    console.log('2. Find Bogdan Luca\'s current verification record');
    console.log('3. Copy the real data manually');
    console.log('4. Use the update script to populate the database');

  } catch (error) {
    console.error('❌ Failed to create new session:', error.message);
    console.log();
    console.log('💡 FALLBACK OPTION:');
    console.log('==================');
    console.log('Since API session creation failed, you can:');
    console.log('1. Get the real data from Veriff dashboard manually');
    console.log('2. Update the database with the real values');
    console.log('3. Test the verification display');
  }
}

triggerNewVerification().catch(console.error);
