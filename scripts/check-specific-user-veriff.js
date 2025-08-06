require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSpecificUserVeriff() {
  console.log('🔍 Checking detailed Veriff data for Alexandru-Ștefan Daia...\n');

  try {
    // Get detailed Veriff data for the specific user
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        veriffSessionId,
        veriffVerificationId,
        "identityVerified",
        "identityVerifiedAt",
        veriffPersonGivenName,
        veriffPersonLastName,
        veriffPersonIdNumber,
        veriffPersonDateOfBirth,
        veriffPersonNationality,
        veriffPersonGender,
        veriffPersonCountry,
        veriffDocumentType,
        veriffDocumentNumber,
        veriffDocumentCountry,
        veriffDocumentValidFrom,
        veriffDocumentValidUntil,
        veriffDocumentIssuedBy,
        veriffFaceMatchSimilarity,
        veriffFaceMatchStatus,
        veriffDecisionScore,
        veriffQualityScore,
        veriffFlags,
        veriffContext,
        veriffAttemptId,
        veriffFeature,
        veriffCode,
        veriffReason,
        veriffCreatedAt,
        veriffUpdatedAt,
        veriffSubmittedAt,
        veriffApprovedAt,
        veriffDeclinedAt,
        veriffWebhookReceivedAt,
        veriffWebhookData,
        "updatedAt"
      `)
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (error) {
      console.error('❌ Error fetching user data:', error);
      return;
    }

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 User: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Last Updated: ${new Date(user.updatedAt).toLocaleString()}`);
    console.log(`   Webhook Received: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'None'}`);
    console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);
    console.log(`   Verification ID: ${user.veriffVerificationId || 'None'}`);
    console.log('');

    // Check if there's webhook data
    if (user.veriffWebhookData) {
      console.log('📋 Webhook Data:');
      console.log(JSON.stringify(user.veriffWebhookData, null, 2));
      console.log('');
    }

    // Check individual Veriff fields
    console.log('🔍 Individual Veriff Fields:');
    
    if (user.veriffPersonGivenName || user.veriffPersonLastName) {
      console.log(`   Person: ${user.veriffPersonGivenName || 'N/A'} ${user.veriffPersonLastName || 'N/A'}`);
    }
    
    if (user.veriffPersonIdNumber) {
      console.log(`   ID Number: ${user.veriffPersonIdNumber}`);
    }
    
    if (user.veriffPersonDateOfBirth) {
      console.log(`   Date of Birth: ${user.veriffPersonDateOfBirth}`);
    }
    
    if (user.veriffPersonNationality) {
      console.log(`   Nationality: ${user.veriffPersonNationality}`);
    }
    
    if (user.veriffPersonCountry) {
      console.log(`   Country: ${user.veriffPersonCountry}`);
    }

    if (user.veriffDocumentType) {
      console.log(`   Document Type: ${user.veriffDocumentType}`);
    }
    
    if (user.veriffDocumentNumber) {
      console.log(`   Document Number: ${user.veriffDocumentNumber}`);
    }
    
    if (user.veriffDocumentCountry) {
      console.log(`   Document Country: ${user.veriffDocumentCountry}`);
    }

    if (user.veriffFaceMatchSimilarity) {
      console.log(`   Face Match Similarity: ${user.veriffFaceMatchSimilarity}%`);
    }
    
    if (user.veriffFaceMatchStatus) {
      console.log(`   Face Match Status: ${user.veriffFaceMatchStatus}`);
    }
    
    if (user.veriffDecisionScore) {
      console.log(`   Decision Score: ${user.veriffDecisionScore}`);
    }
    
    if (user.veriffQualityScore) {
      console.log(`   Quality Score: ${user.veriffQualityScore}`);
    }

    if (user.veriffFeature) {
      console.log(`   Feature: ${user.veriffFeature}`);
    }
    
    if (user.veriffCode) {
      console.log(`   Code: ${user.veriffCode}`);
    }
    
    if (user.veriffReason) {
      console.log(`   Reason: ${user.veriffReason}`);
    }

    // Check timestamps
    console.log('\n🕒 Timestamps:');
    if (user.veriffCreatedAt) {
      console.log(`   Created: ${new Date(user.veriffCreatedAt).toLocaleString()}`);
    }
    if (user.veriffSubmittedAt) {
      console.log(`   Submitted: ${new Date(user.veriffSubmittedAt).toLocaleString()}`);
    }
    if (user.veriffApprovedAt) {
      console.log(`   Approved: ${new Date(user.veriffApprovedAt).toLocaleString()}`);
    }
    if (user.veriffDeclinedAt) {
      console.log(`   Declined: ${new Date(user.veriffDeclinedAt).toLocaleString()}`);
    }
    if (user.veriffWebhookReceivedAt) {
      console.log(`   Webhook Received: ${new Date(user.veriffWebhookReceivedAt).toLocaleString()}`);
    }

    // Analysis
    console.log('\n📊 Analysis:');
    if (user.veriffWebhookReceivedAt && !user.identityVerified) {
      console.log('⚠️  WEBHOOK RECEIVED BUT VERIFICATION NOT PROCESSED!');
      console.log('   - A webhook was received on:', new Date(user.veriffWebhookReceivedAt).toLocaleString());
      console.log('   - But the user is not marked as verified');
      console.log('   - This suggests the webhook processing failed or was incomplete');
    } else if (user.veriffWebhookReceivedAt && user.identityVerified) {
      console.log('✅ Webhook received and verification processed successfully');
    } else if (!user.veriffWebhookReceivedAt) {
      console.log('📭 No webhook data found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkSpecificUserVeriff(); 