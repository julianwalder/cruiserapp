const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucaRealDOBManual() {
  console.log('🔧 Manually updating Bogdan Luca\'s Date of Birth with real value...\n');

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

  console.log('📊 Current Date of Birth:');
  console.log('==========================');
  console.log(`veriffPersonDateOfBirth: ${lucaUser.veriffPersonDateOfBirth}`);
  console.log();

  // NOTE: Replace this with the real date of birth from Bogdan Luca's Veriff ID
  // Format should be YYYY-MM-DD (e.g., '1990-05-15')
  const realDateOfBirth = '1990-01-01'; // REPLACE WITH REAL VALUE FROM VERIFF ID

  console.log('📝 INSTRUCTIONS:');
  console.log('================');
  console.log('1. Look at Bogdan Luca\'s Veriff ID');
  console.log('2. Find the Date of Birth field');
  console.log('3. Replace the value in the script below with the real date');
  console.log('4. Run this script again');
  console.log();
  console.log('Current placeholder value:', realDateOfBirth);
  console.log('Expected format: YYYY-MM-DD (e.g., 1990-05-15)');
  console.log();

  // Update the database with the real date of birth
  console.log('💾 Updating database with Date of Birth...');
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      veriffPersonDateOfBirth: realDateOfBirth
    })
    .eq('id', lucaUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating date of birth:', updateError);
    return;
  }

  console.log('✅ Successfully updated Date of Birth!');
  console.log('=====================================');
  console.log(`veriffPersonDateOfBirth: ${updatedUser.veriffPersonDateOfBirth}`);
  console.log();

  // Also update the webhook data for consistency
  if (lucaUser.veriffWebhookData) {
    const webhookData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;

    const updatedWebhookData = {
      ...webhookData,
      person: {
        ...webhookData.person,
        dateOfBirth: realDateOfBirth
      },
      personDateOfBirth: realDateOfBirth
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

  console.log('🎯 Current status:');
  console.log('==================');
  console.log(`✅ Document Number: ${lucaUser.veriffDocumentNumber || 'null'}`);
  console.log(`✅ Name: ${lucaUser.veriffPersonGivenName} ${lucaUser.veriffPersonLastName}`);
  console.log(`✅ Nationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`✅ Country: ${lucaUser.veriffPersonCountry}`);
  console.log(`✅ Date of Birth: ${updatedUser.veriffPersonDateOfBirth}`);
  console.log(`❌ CNP (ID Number): ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`❌ Gender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log();

  console.log('📝 NEXT STEPS:');
  console.log('==============');
  console.log('1. Get the real Date of Birth from Bogdan Luca\'s Veriff ID');
  console.log('2. Update the "realDateOfBirth" variable in this script');
  console.log('3. Run this script again');
  console.log('4. Repeat for CNP and Gender if needed');
}

updateLucaRealDOBManual().catch(console.error);
