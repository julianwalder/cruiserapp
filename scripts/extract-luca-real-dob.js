const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractLucaRealDOB() {
  console.log('🔍 Extracting real Date of Birth from Bogdan Luca\'s webhook data...\n');

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

  console.log('📋 Searching for Date of Birth in webhook data...');
  console.log('=================================================');

  // Look for date of birth in various possible locations
  const possibleDOBFields = [
    'personDateOfBirth',
    'person.dateOfBirth',
    'person.birthDate',
    'person.birth',
    'dateOfBirth',
    'birthDate',
    'birth',
    'dob'
  ];

  let foundDOB = null;
  let foundInField = null;

  // Check in person object
  if (webhookData.person && webhookData.person.dateOfBirth) {
    foundDOB = webhookData.person.dateOfBirth;
    foundInField = 'person.dateOfBirth';
  }

  // Check in root level fields
  if (!foundDOB && webhookData.personDateOfBirth) {
    foundDOB = webhookData.personDateOfBirth;
    foundInField = 'personDateOfBirth';
  }

  // Check other possible variations
  if (!foundDOB && webhookData.dateOfBirth) {
    foundDOB = webhookData.dateOfBirth;
    foundInField = 'dateOfBirth';
  }

  // Check all fields in the webhook data
  console.log('🔍 Checking all webhook data fields for date-related information:');
  console.log('===============================================================');
  
  const allFields = Object.keys(webhookData);
  const dateRelatedFields = allFields.filter(field => 
    field.toLowerCase().includes('date') || 
    field.toLowerCase().includes('birth') || 
    field.toLowerCase().includes('dob')
  );

  console.log('Date-related fields found:', dateRelatedFields);
  console.log();

  dateRelatedFields.forEach(field => {
    const value = webhookData[field];
    console.log(`  ${field}: ${value}`);
    
    // If we haven't found DOB yet and this looks like a date
    if (!foundDOB && value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      foundDOB = value;
      foundInField = field;
    }
  });
  console.log();

  // Also check nested objects
  console.log('🔍 Checking nested objects for date information:');
  console.log('================================================');
  
  if (webhookData.person) {
    console.log('Person object fields:', Object.keys(webhookData.person));
    Object.entries(webhookData.person).forEach(([key, value]) => {
      console.log(`  person.${key}: ${value}`);
      if (!foundDOB && value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        foundDOB = value;
        foundInField = `person.${key}`;
      }
    });
  }
  console.log();

  if (foundDOB) {
    console.log('✅ FOUND DATE OF BIRTH!');
    console.log('=======================');
    console.log(`Field: ${foundInField}`);
    console.log(`Value: ${foundDOB}`);
    console.log();

    // Update the database with the real date of birth
    console.log('💾 Updating database with real Date of Birth...');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        veriffPersonDateOfBirth: foundDOB
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

    // Also update the webhook data to ensure consistency
    if (webhookData.person) {
      const updatedWebhookData = {
        ...webhookData,
        person: {
          ...webhookData.person,
          dateOfBirth: foundDOB
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

  } else {
    console.log('❌ NO DATE OF BIRTH FOUND IN WEBHOOK DATA');
    console.log('==========================================');
    console.log('The webhook data does not contain a date of birth.');
    console.log('This could mean:');
    console.log('1. The original webhook was incomplete');
    console.log('2. The date of birth was not included in the webhook');
    console.log('3. The date of birth is stored in a different format or field');
    console.log();
    console.log('📝 To add the real date of birth, you would need to:');
    console.log('1. Get it from Bogdan Luca\'s Veriff ID directly');
    console.log('2. Update the database manually with the real value');
  }

  console.log('🎯 Current status:');
  console.log('==================');
  console.log(`veriffPersonDateOfBirth: ${lucaUser.veriffPersonDateOfBirth || 'null'}`);
  console.log(`veriffPersonIdNumber: ${lucaUser.veriffPersonIdNumber || 'null'}`);
  console.log(`veriffPersonGender: ${lucaUser.veriffPersonGender || 'null'}`);
  console.log(`veriffDocumentNumber: ${lucaUser.veriffDocumentNumber || 'null'}`);
}

extractLucaRealDOB().catch(console.error);
