#!/usr/bin/env node

/**
 * Check Existing Veriff Data Script
 * 
 * This script checks what verification data already exists in the database
 * and helps identify which verifications we can populate.
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

async function checkExistingVeriffData() {
  console.log('🔍 Checking existing Veriff data in database...\n');

  try {
    // Check users with any Veriff data
    const { data: usersWithVeriff, error: error1 } = await supabase
      .from('users')
      .select(`
        id,
        "firstName",
        "lastName",
        email,
        veriffSessionId,
        veriffVerificationId,
        veriffStatus,
        identityVerified,
        "veriffWebhookReceivedAt",
        "veriffPersonGivenName",
        "veriffPersonLastName",
        "veriffDocumentType",
        "veriffDecisionScore"
      `)
      .or('veriffSessionId.not.is.null,veriffVerificationId.not.is.null,veriffStatus.not.is.null')
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (error1) {
      console.error('Error fetching users with Veriff data:', error1);
      return;
    }

    console.log(`📊 Found ${usersWithVeriff?.length || 0} users with Veriff data:\n`);

    if (usersWithVeriff && usersWithVeriff.length > 0) {
      usersWithVeriff.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Session ID: ${user.veriffSessionId || 'Not set'}`);
        console.log(`   Verification ID: ${user.veriffVerificationId || 'Not set'}`);
        console.log(`   Status: ${user.veriffStatus || 'Not set'}`);
        console.log(`   Verified: ${user.identityVerified ? 'Yes' : 'No'}`);
        console.log(`   Document: ${user.veriffDocumentType || 'Not specified'}`);
        if (user.veriffDecisionScore !== null) {
          console.log(`   Decision Score: ${(user.veriffDecisionScore * 100).toFixed(1)}%`);
        }
        console.log(`   Last Updated: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('❌ No users with Veriff data found in database');
    }

    // Check for users with verification IDs that we can populate
    const { data: usersWithVerificationIds, error: error2 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email, veriffVerificationId')
      .not('veriffVerificationId', 'is', null);

    if (error2) {
      console.error('Error fetching users with verification IDs:', error2);
      return;
    }

    if (usersWithVerificationIds && usersWithVerificationIds.length > 0) {
      console.log(`\n🎯 Users with verification IDs that can be populated (${usersWithVerificationIds.length}):`);
      usersWithVerificationIds.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.veriffVerificationId}`);
      });
    }

    // Check for users with session IDs but no verification data
    const { data: usersWithSessionIds, error: error3 } = await supabase
      .from('users')
      .select('id, "firstName", "lastName", email, veriffSessionId')
      .not('veriffSessionId', 'is', null)
      .is('veriffVerificationId', null);

    if (error3) {
      console.error('Error fetching users with session IDs:', error3);
      return;
    }

    if (usersWithSessionIds && usersWithSessionIds.length > 0) {
      console.log(`\n⚠️  Users with session IDs but no verification data (${usersWithSessionIds.length}):`);
      usersWithSessionIds.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} - ${user.veriffSessionId}`);
      });
    }

    // Summary statistics
    console.log('\n📈 Summary:');
    console.log(`Total users with any Veriff data: ${usersWithVeriff?.length || 0}`);
    console.log(`Users with verification IDs: ${usersWithVerificationIds?.length || 0}`);
    console.log(`Users with session IDs only: ${usersWithSessionIds?.length || 0}`);

    if (usersWithVerificationIds && usersWithVerificationIds.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('You can populate detailed data for these users using:');
      usersWithVerificationIds.slice(0, 3).forEach(user => {
        console.log(`  node scripts/populate-specific-verification.js ${user.veriffVerificationId}`);
      });
      if (usersWithVerificationIds.length > 3) {
        console.log(`  ... and ${usersWithVerificationIds.length - 3} more`);
      }
    }

  } catch (error) {
    console.error('Error checking existing Veriff data:', error);
  }
}

async function main() {
  console.log('🔍 Veriff Data Analysis Tool');
  console.log('============================\n');

  await checkExistingVeriffData();
}

// Run the analysis
main().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
}); 