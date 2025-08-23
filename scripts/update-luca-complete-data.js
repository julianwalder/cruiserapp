const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucaCompleteData() {
  console.log('🔧 Updating Bogdan Luca with complete real data from Veriff ID...\n');

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

  console.log('📊 Current personal data:');
  console.log('==========================');
  console.log(`veriffPersonDateOfBirth: ${lucaUser.veriffPersonDateOfBirth}`);
  console.log(`veriffPersonIdNumber: ${lucaUser.veriffPersonIdNumber}`);
  console.log(`veriffPersonNationality: ${lucaUser.veriffPersonNationality}`);
  console.log(`veriffPersonGender: ${lucaUser.veriffPersonGender}`);
  console.log(`veriffPersonCountry: ${lucaUser.veriffPersonCountry}`);
  console.log(`veriffDocumentNumber: ${lucaUser.veriffDocumentNumber}`);
  console.log();

  // NOTE: You'll need to provide the real values from Bogdan Luca's Veriff ID
  // For now, I'll use placeholder comments showing what needs to be filled in
  
  console.log('📝 PLEASE PROVIDE THE REAL VALUES FROM BOGDAN LUCA\'S VERIFF ID:');
  console.log('===============================================================');
  console.log('To complete this update, please provide the real values for:');
  console.log();
  console.log('1. Date of Birth (format: YYYY-MM-DD)');
  console.log('2. CNP (Personal Numeric Code - 13 digits)');
  console.log('3. Nationality (e.g., "Romanian", "RO")');
  console.log('4. Gender (e.g., "M", "F")');
  console.log('5. Country (e.g., "Romania")');
  console.log('6. Address (if available)');
  console.log();

  // Example update - replace these with real values
  const realData = {
    // Replace these with actual values from Bogdan Luca's Veriff ID
    veriffPersonDateOfBirth: null, // e.g., '1990-05-15'
    veriffPersonIdNumber: null,     // e.g., '1234567890123' (CNP)
    veriffPersonNationality: 'Romanian', // Already set
    veriffPersonGender: null,       // e.g., 'M' or 'F'
    veriffPersonCountry: 'Romania', // Already set
    veriffDocumentNumber: 'RX740900', // Already updated
    // Add address fields if available
    // veriffPersonAddress: null,
    // veriffPersonCity: null,
    // veriffPersonPostalCode: null,
  };

  console.log('🔍 CURRENT REAL DATA WE HAVE:');
  console.log('=============================');
  console.log('✅ Document Number: RX740900');
  console.log('✅ Nationality: Romanian');
  console.log('✅ Country: Romania');
  console.log('✅ Name: BOGDAN LUCA');
  console.log();
  console.log('❌ MISSING REAL DATA:');
  console.log('=====================');
  console.log('❌ Date of Birth: Need real value');
  console.log('❌ CNP (ID Number): Need real value');
  console.log('❌ Gender: Need real value');
  console.log('❌ Address: Need real value (if available)');
  console.log();

  // For now, let's update with what we know is real
  const updateData = {
    veriffDocumentNumber: 'RX740900',
    veriffPersonNationality: 'Romanian',
    veriffPersonCountry: 'Romania',
    veriffPersonGivenName: 'BOGDAN',
    veriffPersonLastName: 'LUCA'
  };

  console.log('💾 Updating with confirmed real data...');
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
  console.log('================================================');
  console.log('Updated fields:');
  Object.entries(updateData).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();

  console.log('📋 INSTRUCTIONS TO COMPLETE THE UPDATE:');
  console.log('=======================================');
  console.log('1. Get Bogdan Luca\'s Veriff ID details');
  console.log('2. Provide the real values for:');
  console.log('   - Date of Birth');
  console.log('   - CNP (Personal Numeric Code)');
  console.log('   - Gender');
  console.log('   - Address (if available)');
  console.log('3. Run this script again with the real values');
  console.log();
  console.log('🎯 Current status:');
  console.log('==================');
  console.log('✅ Document Number: RX740900 (REAL)');
  console.log('✅ Name: BOGDAN LUCA (REAL)');
  console.log('✅ Nationality: Romanian (REAL)');
  console.log('✅ Country: Romania (REAL)');
  console.log('❌ Date of Birth: NEED REAL VALUE');
  console.log('❌ CNP: NEED REAL VALUE');
  console.log('❌ Gender: NEED REAL VALUE');
  console.log('❌ Address: NEED REAL VALUE');
}

updateLucaCompleteData().catch(console.error);
