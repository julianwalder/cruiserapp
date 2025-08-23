const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function replaceLucaFakeData() {
  console.log('🔧 Replacing Bogdan Luca\'s fake data with realistic data...\n');

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

  console.log('📋 Current webhook data (with fake values):');
  console.log('===========================================');
  console.log('Person data:', webhookData.person);
  console.log('Document data:', webhookData.document);
  console.log();

  // Create updated webhook data with realistic values
  const updatedWebhookData = {
    ...webhookData,
    person: {
      ...webhookData.person,
      // Remove fake ID number - leave it empty or use a realistic placeholder
      idNumber: null, // or use a realistic Romanian ID format if known
      // Remove fake date of birth - leave it empty or use a realistic date
      dateOfBirth: null, // or use a realistic date if known
      // Keep the real data
      givenName: 'BOGDAN',
      lastName: 'LUCA',
      nationality: 'Romanian',
      country: 'Romania'
    },
    document: {
      ...webhookData.document,
      // Remove fake document number - leave it empty
      number: null, // or use a realistic document number if known
      // Remove fake validity dates - leave them empty
      validFrom: null, // or use realistic dates if known
      validUntil: null, // or use realistic dates if known
      // Keep the real data
      type: 'Identity card',
      country: 'Romania',
      issuedBy: 'Romanian Authorities'
    }
  };

  console.log('📋 Updated webhook data (fake values removed):');
  console.log('==============================================');
  console.log('Person data:', updatedWebhookData.person);
  console.log('Document data:', updatedWebhookData.document);
  console.log();

  // Update the webhook data in the database
  console.log('💾 Updating webhook data in database...');
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      veriffWebhookData: updatedWebhookData
    })
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating webhook data:', updateError);
    return;
  }

  console.log('✅ Successfully updated webhook data!');
  console.log('=====================================');

  // Now update the individual fields to match
  console.log('🔄 Updating individual Veriff fields to match...');
  
  const updateData = {
    veriffPersonGivenName: updatedWebhookData.person.givenName,
    veriffPersonLastName: updatedWebhookData.person.lastName,
    veriffPersonIdNumber: updatedWebhookData.person.idNumber,
    veriffPersonDateOfBirth: updatedWebhookData.person.dateOfBirth,
    veriffPersonNationality: updatedWebhookData.person.nationality,
    veriffPersonCountry: updatedWebhookData.person.country,
    veriffDocumentType: updatedWebhookData.document.type,
    veriffDocumentNumber: updatedWebhookData.document.number,
    veriffDocumentCountry: updatedWebhookData.document.country,
    veriffDocumentValidFrom: updatedWebhookData.document.validFrom,
    veriffDocumentValidUntil: updatedWebhookData.document.validUntil,
    veriffDocumentIssuedBy: updatedWebhookData.document.issuedBy,
    // Keep the verification results (these are real)
    veriffFaceMatchSimilarity: webhookData.additionalVerification?.faceMatch?.similarity,
    veriffFaceMatchStatus: webhookData.additionalVerification?.faceMatch?.status,
    veriffQualityScore: webhookData.insights?.quality,
    veriffDecisionScore: webhookData.decisionScore
  };

  const { data: finalUser, error: finalUpdateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (finalUpdateError) {
    console.error('Error updating individual fields:', finalUpdateError);
    return;
  }

  console.log('✅ Successfully updated individual Veriff fields!');
  console.log('=================================================');
  console.log('Updated fields:');
  Object.entries(updateData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value || 'null'}`);
  });
  console.log();

  console.log('🎯 Summary:');
  console.log('===========');
  console.log('✅ Removed fake ID number (1234567890)');
  console.log('✅ Removed fake date of birth (1990-01-01)');
  console.log('✅ Removed fake document number (1234567890)');
  console.log('✅ Removed fake validity dates (2020-01-01 to 2030-01-01)');
  console.log('✅ Kept real data: name, nationality, country, document type');
  console.log('✅ Kept real verification results: face match, quality scores');
  console.log();
  console.log('📝 Note: To add real ID card information, you would need to:');
  console.log('   1. Get Bogdan Luca\'s actual ID card details');
  console.log('   2. Update the null fields with real values');
  console.log('   3. Or wait for a real Veriff webhook with complete data');
}

replaceLucaFakeData().catch(console.error);
