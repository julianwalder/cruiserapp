#!/usr/bin/env node

/**
 * Check Julian's Verification Data Script
 * 
 * This script checks Julian's verification data in the database to see what's available.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkJulianVerificationData() {
  console.log('🔍 Checking Julian Walder Verification Data');
  console.log('==========================================\n');

  try {
    // Find Julian by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'julian@cruiseraviation.ro')
      .single();

    if (findError || !user) {
      console.error('❌ Could not find Julian Walder in database');
      return;
    }

    console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Identity Verified: ${user.identityVerified ? 'Yes' : 'No'}`);

    // Check all verification-related fields
    const verificationFields = [
      'veriffSessionId',
      'veriffVerificationId', 
      'veriffStatus',
      'veriffPersonGivenName',
      'veriffPersonLastName',
      'veriffPersonIdNumber',
      'veriffPersonDateOfBirth',
      'veriffPersonNationality',
      'veriffPersonGender',
      'veriffPersonCountry',
      'veriffDocumentType',
      'veriffDocumentNumber',
      'veriffDocumentCountry',
      'veriffDocumentValidFrom',
      'veriffDocumentValidUntil',
      'veriffDocumentIssuedBy',
      'veriffFaceMatchSimilarity',
      'veriffFaceMatchStatus',
      'veriffDecisionScore',
      'veriffQualityScore',
      'veriffFlags',
      'veriffContext',
      'veriffAttemptId',
      'veriffFeature',
      'veriffCode',
      'veriffReason',
      'veriffCreatedAt',
      'veriffUpdatedAt',
      'veriffSubmittedAt',
      'veriffApprovedAt',
      'veriffDeclinedAt',
      'veriffWebhookReceivedAt',
      'veriffWebhookData'
    ];

    console.log('\n📊 Verification Data Summary:');
    console.log('=============================');

    let hasData = false;
    verificationFields.forEach(field => {
      const value = user[field];
      if (value !== null && value !== undefined) {
        hasData = true;
        console.log(`✅ ${field}: ${JSON.stringify(value)}`);
      }
    });

    if (!hasData) {
      console.log('❌ No verification data found in database fields');
    }

    // Check webhook data specifically
    if (user.veriffWebhookData) {
      console.log('\n🔗 Webhook Data:');
      console.log('================');
      console.log(JSON.stringify(user.veriffWebhookData, null, 2));
    }

    // Summary
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log(`Identity Verified: ${user.identityVerified ? 'Yes' : 'No'}`);
    console.log(`Veriff Status: ${user.veriffStatus || 'Not set'}`);
    console.log(`Session ID: ${user.veriffSessionId || 'Not set'}`);
    console.log(`Verification ID: ${user.veriffVerificationId || 'Not set'}`);
    console.log(`Decision Score: ${user.veriffDecisionScore || 'Not set'}`);
    console.log(`Face Match Status: ${user.veriffFaceMatchStatus || 'Not set'}`);

  } catch (error) {
    console.error('❌ Error checking Julian\'s verification data:', error);
  }
}

// Run the check
checkJulianVerificationData().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 