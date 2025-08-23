require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualVeriffUpdate() {
  console.log('🔧 Manual Veriff Status Update for glavan.catalinalexandru@gmail.com\n');

  try {
    // First, let's check the user's current status
    console.log('📋 Checking current user status...');
    
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'glavan.catalinalexandru@gmail.com')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user data:', fetchError);
      return;
    }

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('👤 Current User Status:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${user.identityVerified}`);
    console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);

    // Create a comprehensive verification data object
    const verificationData = {
      // Session and metadata
      sessionId: 'manual-update-' + Date.now(),
      status: 'approved',
      action: 'approved',
      feature: 'selfid',
      code: 200,
      attemptId: 'manual-attempt-' + Date.now(),
      
      // Person data (you can update these with actual data from Veriff)
      person: {
        givenName: user.firstName || 'Cătălin-Alexandru',
        lastName: user.lastName || 'Glăvan',
        idNumber: 'MANUAL-123456', // Update with actual ID number
        dateOfBirth: '1990-01-01', // Update with actual date
        nationality: 'Romanian',
        gender: 'male',
        country: 'Romania',
      },
      
      // Document data (you can update these with actual data from Veriff)
      document: {
        type: 'PASSPORT', // or 'DRIVERS_LICENSE', 'ID_CARD'
        number: 'MANUAL-DOC-123', // Update with actual document number
        country: 'Romania',
        validFrom: '2020-01-01', // Update with actual date
        validUntil: '2030-01-01', // Update with actual date
        issuedBy: 'Romanian Government',
      },
      
      // Verification results
      additionalVerification: {
        faceMatch: {
          similarity: 0.95,
          status: 'approved',
        },
      },
      
      // Decision and insights
      decisionScore: 0.92,
      insights: {
        quality: 'high',
        flags: [],
        context: 'manual_verification_update',
      },
      
      // Timestamps
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      
      // Raw webhook data
      webhookReceivedAt: new Date().toISOString(),
      rawPayload: {
        id: 'manual-session-' + Date.now(),
        status: 'approved',
        action: 'approved',
        feature: 'selfid',
        vendorData: user.id,
        person: {
          givenName: user.firstName || 'Cătălin-Alexandru',
          lastName: user.lastName || 'Glăvan',
        },
        document: {
          type: 'PASSPORT',
          number: 'MANUAL-DOC-123',
          country: 'Romania',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Update user with comprehensive verification data
    console.log('\n🔄 Updating user verification status...');
    
    const updateData = {
      // Session and metadata
      veriffSessionId: verificationData.sessionId,
      veriffStatus: verificationData.status,
      identityVerified: true,
      
      // Store comprehensive webhook data
      veriffWebhookData: verificationData,
      
      // Store individual person fields for easy access
      veriffPersonGivenName: verificationData.person.givenName,
      veriffPersonLastName: verificationData.person.lastName,
      veriffPersonIdNumber: verificationData.person.idNumber,
      veriffPersonDateOfBirth: verificationData.person.dateOfBirth,
      veriffPersonNationality: verificationData.person.nationality,
      veriffPersonGender: verificationData.person.gender,
      veriffPersonCountry: verificationData.person.country,
      
      // Store document fields
      veriffDocumentType: verificationData.document.type,
      veriffDocumentNumber: verificationData.document.number,
      veriffDocumentCountry: verificationData.document.country,
      veriffDocumentValidFrom: verificationData.document.validFrom,
      veriffDocumentValidUntil: verificationData.document.validUntil,
      veriffDocumentIssuedBy: verificationData.document.issuedBy,
      
      // Store verification results
      veriffFaceMatchSimilarity: verificationData.additionalVerification.faceMatch.similarity,
      veriffFaceMatchStatus: verificationData.additionalVerification.faceMatch.status,
      veriffDecisionScore: verificationData.decisionScore,
      veriffQualityScore: verificationData.insights.quality,
      veriffFlags: verificationData.insights.flags,
      veriffContext: verificationData.insights.context,
      
      // Metadata
      veriffAttemptId: verificationData.attemptId,
      veriffFeature: verificationData.feature,
      veriffCode: verificationData.code,
      veriffReason: verificationData.status,
      
      // Timestamps
      veriffCreatedAt: verificationData.createdAt,
      veriffUpdatedAt: verificationData.updatedAt,
      veriffSubmittedAt: verificationData.submittedAt,
      veriffApprovedAt: verificationData.approvedAt,
      veriffDeclinedAt: null,
      veriffWebhookReceivedAt: verificationData.webhookReceivedAt,
      
      // Set identity verification timestamps
      identityVerifiedAt: new Date().toISOString(),
      
      updatedAt: new Date().toISOString(),
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating user status:', updateError);
      return;
    }

    console.log('✅ User verification status updated successfully!');
    console.log('\n📊 Updated User Status:');
    console.log(`   Veriff Status: ${updatedUser.veriffStatus}`);
    console.log(`   Identity Verified: ${updatedUser.identityVerified}`);
    console.log(`   Session ID: ${updatedUser.veriffSessionId}`);
    console.log(`   Document Type: ${updatedUser.veriffDocumentType}`);
    console.log(`   Document Number: ${updatedUser.veriffDocumentNumber}`);
    console.log(`   Person Name: ${updatedUser.veriffPersonGivenName} ${updatedUser.veriffPersonLastName}`);
    console.log(`   Decision Score: ${updatedUser.veriffDecisionScore}`);
    console.log(`   Face Match Similarity: ${updatedUser.veriffFaceMatchSimilarity}`);
    console.log(`   Updated At: ${updatedUser.updatedAt}`);

    console.log('\n🎉 Manual verification update completed successfully!');
    console.log('\n📝 Note: This is a manual update. For future verifications, ensure:');
    console.log('1. The webhook URL is correctly configured in Veriff dashboard');
    console.log('2. The webhook secret is properly set');
    console.log('3. The webhook endpoint is accessible from Veriff servers');
    console.log('4. Monitor webhook processing in your application logs');

  } catch (error) {
    console.error('❌ Error in manual verification update:', error);
  }
}

// Run the manual update
manualVeriffUpdate();
