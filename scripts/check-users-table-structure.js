const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTableStructure() {
  console.log('🔍 Checking users table structure and Veriff data storage...\n');

  // Get Daia's data (email: ops@cruiseraviation.ro)
  const { data: daiaUser, error: daiaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'ops@cruiseraviation.ro')
    .single();

  if (daiaError) {
    console.error('Error fetching Daia:', daiaError);
    return;
  }

  // Get Luca's data (email: bogdan.luca@gmail.com)
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  console.log('📊 USERS TABLE VERIFF-RELATED FIELDS:');
  console.log('=====================================');
  
  // Get all field names from the users table
  const allFields = Object.keys(daiaUser);
  const veriffFields = allFields.filter(field => 
    field.toLowerCase().includes('veriff') || 
    field.toLowerCase().includes('id') ||
    field.toLowerCase().includes('document') ||
    field.toLowerCase().includes('person') ||
    field.toLowerCase().includes('nationality') ||
    field.toLowerCase().includes('birth') ||
    field.toLowerCase().includes('gender')
  );

  console.log('Veriff-related fields in users table:');
  veriffFields.forEach(field => {
    console.log(`  - ${field}`);
  });
  console.log();

  console.log('📋 DAIA (Alexandru-Ștefan Daia) - Field Values:');
  console.log('===============================================');
  veriffFields.forEach(field => {
    const value = daiaUser[field];
    console.log(`  ${field}: ${value || 'null/undefined'}`);
  });
  console.log();

  console.log('📋 LUCA (Bogdan Luca) - Field Values:');
  console.log('=====================================');
  veriffFields.forEach(field => {
    const value = lucaUser[field];
    console.log(`  ${field}: ${value || 'null/undefined'}`);
  });
  console.log();

  // Check if there are specific Veriff ID fields that should be populated
  console.log('🔍 VERIFF ID FIELD ANALYSIS:');
  console.log('============================');
  
  const veriffIdFields = [
    'veriffIdNumber',
    'veriffDocumentNumber', 
    'veriffDateOfBirth',
    'veriffNationality',
    'veriffDocumentType',
    'veriffDocumentCountry',
    'veriffDocumentValidFrom',
    'veriffDocumentValidUntil',
    'veriffPersonFirstName',
    'veriffPersonLastName',
    'veriffGender'
  ];

  console.log('Checking for specific Veriff ID fields:');
  veriffIdFields.forEach(field => {
    const daiaValue = daiaUser[field];
    const lucaValue = lucaUser[field];
    console.log(`  ${field}:`);
    console.log(`    Daia: ${daiaValue || 'null'}`);
    console.log(`    Luca: ${lucaValue || 'null'}`);
  });
  console.log();

  // Check if the difference is in how the data is stored
  console.log('🎯 KEY DIFFERENCE ANALYSIS:');
  console.log('===========================');
  
  const daiaHasIndividualFields = veriffIdFields.some(field => daiaUser[field]);
  const lucaHasIndividualFields = veriffIdFields.some(field => lucaUser[field]);
  
  console.log(`Daia has individual Veriff fields populated: ${daiaHasIndividualFields}`);
  console.log(`Luca has individual Veriff fields populated: ${lucaHasIndividualFields}`);
  console.log();
  
  if (daiaHasIndividualFields && !lucaHasIndividualFields) {
    console.log('✅ This explains the rendering difference!');
    console.log('   - Daia has Veriff data in individual table fields');
    console.log('   - Luca only has data in the veriffWebhookData JSON field');
    console.log('   - The UI components might be reading from individual fields first');
  }
}

checkUsersTableStructure().catch(console.error);
