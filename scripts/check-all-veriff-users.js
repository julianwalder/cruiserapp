require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllVeriffUsers() {
  console.log('🔍 Checking all users with any Veriff data...\n');

  try {
    // Get all users with any Veriff-related data
    const { data: users, error } = await supabase
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
        "createdAt",
        "updatedAt"
      `)
      .or('veriffStatus.not.is.null,veriffSessionId.not.is.null,veriffVerificationId.not.is.null,identityVerified.eq.true')
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users with Veriff data:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📭 No users with any Veriff data found');
      return;
    }

    console.log(`📊 Found ${users.length} users with any Veriff data:\n`);

    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Status: ${user.veriffStatus || 'No status'}`);
      console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
      
      if (user.veriffSessionId) {
        console.log(`   Session ID: ${user.veriffSessionId}`);
      }
      
      if (user.veriffVerificationId) {
        console.log(`   Verification ID: ${user.veriffVerificationId}`);
      }

      // Person data
      if (user.veriffPersonGivenName || user.veriffPersonLastName) {
        console.log(`   Verified Name: ${user.veriffPersonGivenName || 'N/A'} ${user.veriffPersonLastName || 'N/A'}`);
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

      // Document data
      if (user.veriffDocumentType) {
        console.log(`   Document Type: ${user.veriffDocumentType}`);
      }
      
      if (user.veriffDocumentNumber) {
        console.log(`   Document Number: ${user.veriffDocumentNumber}`);
      }
      
      if (user.veriffDocumentCountry) {
        console.log(`   Document Country: ${user.veriffDocumentCountry}`);
      }
      
      if (user.veriffDocumentValidFrom || user.veriffDocumentValidUntil) {
        console.log(`   Document Validity: ${user.veriffDocumentValidFrom || 'N/A'} to ${user.veriffDocumentValidUntil || 'N/A'}`);
      }

      // Verification scores
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

      // Timestamps
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

      // Flags and context
      if (user.veriffFlags && user.veriffFlags.length > 0) {
        console.log(`   Flags: ${user.veriffFlags.join(', ')}`);
      }
      
      if (user.veriffContext) {
        console.log(`   Context: ${user.veriffContext}`);
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

      console.log(''); // Empty line for separation
    });

    // Summary statistics
    const totalUsers = users.length;
    const approvedUsers = users.filter(u => u.identityVerified).length;
    const pendingUsers = users.filter(u => u.veriffStatus === 'submitted').length;
    const declinedUsers = users.filter(u => u.veriffStatus === 'declined').length;
    const createdUsers = users.filter(u => u.veriffStatus === 'created').length;
    const noStatusUsers = users.filter(u => !u.veriffStatus).length;

    console.log('📈 Summary Statistics:');
    console.log(`   Total Users with Veriff Data: ${totalUsers}`);
    console.log(`   ✅ Approved: ${approvedUsers}`);
    console.log(`   ⏳ Pending (Submitted): ${pendingUsers}`);
    console.log(`   ❌ Declined: ${declinedUsers}`);
    console.log(`   📝 Created (Not Submitted): ${createdUsers}`);
    console.log(`   🔍 No Status: ${noStatusUsers}`);
    console.log(`   Approval Rate: ${totalUsers > 0 ? ((approvedUsers / totalUsers) * 100).toFixed(1) : 0}%`);

    // Document type breakdown
    const documentTypes = {};
    users.forEach(user => {
      const type = user.veriffDocumentType || 'Unknown';
      documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    console.log('\n📄 Document Types:');
    Object.entries(documentTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Country breakdown
    const countries = {};
    users.forEach(user => {
      const country = user.veriffDocumentCountry || user.veriffPersonCountry || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });

    console.log('\n🌍 Countries:');
    Object.entries(countries).forEach(([country, count]) => {
      console.log(`   ${country}: ${count}`);
    });

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = users.filter(user => {
      const webhookDate = user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt) : null;
      const approvedDate = user.veriffApprovedAt ? new Date(user.veriffApprovedAt) : null;
      const submittedDate = user.veriffSubmittedAt ? new Date(user.veriffSubmittedAt) : null;
      
      return (webhookDate && webhookDate > thirtyDaysAgo) ||
             (approvedDate && approvedDate > thirtyDaysAgo) ||
             (submittedDate && submittedDate > thirtyDaysAgo);
    });

    console.log(`\n🕒 Recent Activity (Last 30 Days): ${recentUsers.length} users`);
    recentUsers.forEach(user => {
      const latestDate = user.veriffWebhookReceivedAt || user.veriffApprovedAt || user.veriffSubmittedAt;
      console.log(`   ${user.firstName} ${user.lastName} - ${user.veriffStatus} - ${new Date(latestDate).toLocaleDateString()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkAllVeriffUsers(); 