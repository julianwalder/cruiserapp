const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucaVeriffFields() {
  console.log('🔧 Updating Bogdan Luca\'s individual Veriff fields...\n');

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

  if (!lucaUser.veriffWebhookData) {
    console.error('No veriffWebhookData found for Luca');
    return;
  }

  const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
    ? JSON.parse(lucaUser.veriffWebhookData) 
    : lucaUser.veriffWebhookData;

  console.log('📋 Extracting data from webhook...');
  console.log('===================================');

  // Extract data from webhook
  const updateData = {};

  // Person data
  if (webhookData.person) {
    updateData.veriffPersonGivenName = webhookData.person.firstName || webhookData.personGivenName;
    updateData.veriffPersonLastName = webhookData.person.lastName || webhookData.personLastName;
    updateData.veriffPersonIdNumber = webhookData.person.idNumber || webhookData.personIdNumber;
    updateData.veriffPersonDateOfBirth = webhookData.person.dateOfBirth || webhookData.personDateOfBirth;
    updateData.veriffPersonNationality = webhookData.person.nationality || webhookData.personNationality;
    updateData.veriffPersonGender = webhookData.person.gender || webhookData.personGender;
    updateData.veriffPersonCountry = webhookData.person.country || webhookData.personCountry;
  }

  // Document data
  if (webhookData.document) {
    updateData.veriffDocumentType = webhookData.document.type || webhookData.documentType;
    updateData.veriffDocumentNumber = webhookData.document.number || webhookData.documentNumber;
    updateData.veriffDocumentCountry = webhookData.document.country || webhookData.documentCountry;
    updateData.veriffDocumentValidFrom = webhookData.document.validFrom || webhookData.documentValidFrom;
    updateData.veriffDocumentValidUntil = webhookData.document.validUntil || webhookData.documentValidUntil;
    updateData.veriffDocumentIssuedBy = webhookData.document.issuedBy || webhookData.documentIssuedBy;
  }

  // Additional verification data
  if (webhookData.additionalVerification?.faceMatch) {
    updateData.veriffFaceMatchSimilarity = webhookData.additionalVerification.faceMatch.similarity || webhookData.faceMatchSimilarity;
    updateData.veriffFaceMatchStatus = webhookData.additionalVerification.faceMatch.status || webhookData.faceMatchStatus;
  }

  // Insights and scores
  if (webhookData.insights) {
    updateData.veriffQualityScore = webhookData.insights.quality || webhookData.qualityScore;
    updateData.veriffFlags = webhookData.insights.flags || webhookData.flags;
    updateData.veriffContext = webhookData.insights.context || webhookData.context;
  }

  // Decision score
  if (webhookData.decisionScore) {
    updateData.veriffDecisionScore = webhookData.decisionScore;
  }

  // Other fields from webhook
  if (webhookData.attemptId) {
    updateData.veriffAttemptId = webhookData.attemptId;
  }
  if (webhookData.feature) {
    updateData.veriffFeature = webhookData.feature;
  }
  if (webhookData.code) {
    updateData.veriffCode = webhookData.code;
  }
  if (webhookData.reason) {
    updateData.veriffReason = webhookData.reason;
  }
  if (webhookData.createdAt) {
    updateData.veriffCreatedAt = webhookData.createdAt;
  }
  if (webhookData.updatedAt) {
    updateData.veriffUpdatedAt = webhookData.updatedAt;
  }
  if (webhookData.submittedAt) {
    updateData.veriffSubmittedAt = webhookData.submittedAt;
  }

  // Set approved date if status is approved
  if (webhookData.status === 'approved') {
    updateData.veriffApprovedAt = webhookData.updatedAt || new Date().toISOString();
  }

  console.log('📊 Data to be updated:');
  console.log('======================');
  Object.entries(updateData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  // Update the user record
  console.log('💾 Updating database...');
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating user:', updateError);
    return;
  }

  console.log('✅ Successfully updated Bogdan Luca\'s Veriff fields!');
  console.log('=====================================================');
  
  // Show the updated fields
  const updatedFields = Object.keys(updateData);
  updatedFields.forEach(field => {
    const value = updatedUser[field];
    console.log(`  ${field}: ${value || 'null'}`);
  });
  console.log();

  console.log('🎯 Now Luca should have the same rendering as Daia!');
  console.log('   - Individual Veriff fields are populated');
  console.log('   - UI components will read from these fields');
  console.log('   - Verification cards should display properly');
}

updateLucaVeriffFields().catch(console.error);
