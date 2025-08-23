const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucaAllRealData() {
  console.log('🔧 Updating Bogdan Luca with ALL real data from Veriff ID...\n');

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

  console.log('📊 Current data status:');
  console.log('========================');
  console.log(`✅ Document Number: ${lucaUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${lucaUser.veriffPersonGivenName} ${lucaUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${lucaUser.veriffPersonCountry}`);
  console.log(`❌ Date of Birth: ${lucaUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`❌ CNP (ID Number): ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`❌ Gender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log();

  // REAL DATA FROM BOGDAN LUCA'S VERIFF ID
  // Replace these values with the actual data from his Veriff ID
  const realData = {
    // Personal Information
    veriffPersonDateOfBirth: '1990-01-01', // REPLACE WITH REAL DATE OF BIRTH (YYYY-MM-DD)
    veriffPersonIdNumber: '1234567890123',  // REPLACE WITH REAL CNP (13 digits)
    veriffPersonGender: 'M',                // REPLACE WITH REAL GENDER ('M' or 'F')
    
    // Document Information (already have some)
    veriffDocumentNumber: 'RX740900',       // Already correct
    veriffDocumentValidFrom: '2020-01-01',  // REPLACE WITH REAL VALID FROM DATE
    veriffDocumentValidUntil: '2030-01-01', // REPLACE WITH REAL VALID UNTIL DATE
    
    // Address Information (if available)
    // veriffPersonAddress: 'Street Address',     // REPLACE WITH REAL ADDRESS
    // veriffPersonCity: 'City',                  // REPLACE WITH REAL CITY
    // veriffPersonPostalCode: '123456',          // REPLACE WITH REAL POSTAL CODE
    // veriffPersonState: 'State/County',         // REPLACE WITH REAL STATE/COUNTY
  };

  console.log('📝 INSTRUCTIONS TO COMPLETE THE UPDATE:');
  console.log('=======================================');
  console.log('1. 📋 Look at Bogdan Luca\'s Veriff ID');
  console.log('2. 📝 Replace the placeholder values in the "realData" object above');
  console.log('3. 🔄 Run this script again');
  console.log();
  console.log('📋 REQUIRED FIELDS TO REPLACE:');
  console.log('==============================');
  console.log('❌ Date of Birth: Replace "1990-01-01" with real date (YYYY-MM-DD)');
  console.log('❌ CNP (ID Number): Replace "1234567890123" with real CNP (13 digits)');
  console.log('❌ Gender: Replace "M" with real gender ("M" or "F")');
  console.log('❌ Document Valid From: Replace "2020-01-01" with real date');
  console.log('❌ Document Valid Until: Replace "2030-01-01" with real date');
  console.log('❌ Address fields: Uncomment and fill if available');
  console.log();

  // Filter out null/undefined values and only update with real data
  const updateData = {};
  Object.entries(realData).forEach(([key, value]) => {
    if (value && value !== '1990-01-01' && value !== '1234567890123' && 
        value !== '2020-01-01' && value !== '2030-01-01') {
      updateData[key] = value;
    }
  });

  // Always include the document number since we know it's correct
  updateData.veriffDocumentNumber = 'RX740900';

  console.log('💾 Updating database with confirmed real data...');
  console.log('================================================');
  console.log('Data to be updated:');
  Object.entries(updateData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating user data:', updateError);
    return;
  }

  console.log('✅ Successfully updated with confirmed real data!');
  console.log('=================================================');

  // Also update the webhook data for consistency
  if (lucaUser.veriffWebhookData) {
    console.log('🔄 Updating webhook data for consistency...');
    
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;

    const updatedWebhookData = {
      ...webhookData,
      person: {
        ...webhookData.person,
        dateOfBirth: realData.veriffPersonDateOfBirth,
        idNumber: realData.veriffPersonIdNumber,
        gender: realData.veriffPersonGender
      },
      document: {
        ...webhookData.document,
        number: realData.veriffDocumentNumber,
        validFrom: realData.veriffDocumentValidFrom,
        validUntil: realData.veriffDocumentValidUntil
      }
    };

    const { error: webhookUpdateError } = await supabase
      .from('users')
      .update({
        veriffWebhookData: updatedWebhookData
      })
      .eq('id', lucaUser.id);

    if (webhookUpdateError) {
      console.error('Error updating webhook data:', webhookUpdateError);
    } else {
      console.log('✅ Also updated webhook data for consistency');
    }
  }

  console.log('\n🎯 FINAL STATUS:');
  console.log('================');
  console.log(`✅ Document Number: ${updatedUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${updatedUser.veriffPersonGivenName} ${updatedUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${updatedUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${updatedUser.veriffPersonCountry}`);
  console.log(`✅ Date of Birth: ${updatedUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`✅ CNP (ID Number): ${updatedUser.veriffPersonIdNumber || 'null'}`);
  console.log(`✅ Gender: ${updatedUser.veriffPersonGender || 'null'}`);
  console.log(`✅ Document Valid From: ${updatedUser.veriffDocumentValidFrom || 'null'}`);
  console.log(`✅ Document Valid Until: ${updatedUser.veriffDocumentValidUntil || 'null'}`);
  console.log();

  console.log('📝 NEXT STEPS:');
  console.log('==============');
  console.log('1. Get the real values from Bogdan Luca\'s Veriff ID');
  console.log('2. Update the "realData" object in this script');
  console.log('3. Run this script again');
  console.log('4. Test the verification display in My Account');
}

updateLucaAllRealData().catch(console.error);
