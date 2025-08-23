const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateWithRealData() {
  console.log('🔧 Updating Bogdan Luca with REAL data from Veriff ID...\n');

  // ⚠️ IMPORTANT: Replace these values with the REAL data from Bogdan Luca's Veriff ID
  // Get these values from the Veriff dashboard by looking up Bogdan Luca's verification record
  
  const REAL_DATA = {
    // Personal Information
    dateOfBirth: '1990-01-01',        // REPLACE: Real date of birth (YYYY-MM-DD format)
    cnp: '1234567890123',             // REPLACE: Real CNP (13 digits)
    gender: 'M',                      // REPLACE: Real gender ('M' or 'F')
    
    // Document Information
    documentNumber: 'RX740900',       // Already correct
    documentValidFrom: '2020-01-01',  // REPLACE: Real valid from date (YYYY-MM-DD)
    documentValidUntil: '2030-01-01', // REPLACE: Real valid until date (YYYY-MM-DD)
    
    // Address Information (if available)
    address: null,                    // REPLACE: Real address (if available)
    city: null,                       // REPLACE: Real city (if available)
    postalCode: null,                 // REPLACE: Real postal code (if available)
  };

  console.log('📝 INSTRUCTIONS:');
  console.log('================');
  console.log('1. 📋 Go to the Veriff dashboard');
  console.log('2. 🔍 Search for Bogdan Luca (bogdan.luca@gmail.com)');
  console.log('3. 📄 Open his verification record');
  console.log('4. 📝 Copy the REAL values from his Veriff ID');
  console.log('5. 🔄 Replace the placeholder values in the REAL_DATA object above');
  console.log('6. 🚀 Run this script again');
  console.log();

  console.log('📋 REQUIRED FIELDS TO REPLACE:');
  console.log('==============================');
  console.log(`❌ Date of Birth: "${REAL_DATA.dateOfBirth}" → Replace with real date`);
  console.log(`❌ CNP: "${REAL_DATA.cnp}" → Replace with real CNP (13 digits)`);
  console.log(`❌ Gender: "${REAL_DATA.gender}" → Replace with real gender (M/F)`);
  console.log(`❌ Document Valid From: "${REAL_DATA.documentValidFrom}" → Replace with real date`);
  console.log(`❌ Document Valid Until: "${REAL_DATA.documentValidUntil}" → Replace with real date`);
  console.log(`❌ Address: "${REAL_DATA.address}" → Replace with real address (if available)`);
  console.log();

  // Check if we have real data (not placeholder values)
  const hasRealData = REAL_DATA.dateOfBirth !== '1990-01-01' && 
                     REAL_DATA.cnp !== '1234567890123' &&
                     REAL_DATA.documentValidFrom !== '2020-01-01' &&
                     REAL_DATA.documentValidUntil !== '2030-01-01';

  if (!hasRealData) {
    console.log('⚠️  WARNING: Still using placeholder values!');
    console.log('Please replace the values in the REAL_DATA object with real data from Veriff ID.');
    console.log();
    console.log('🎯 Current placeholder values detected:');
    console.log('=====================================');
    if (REAL_DATA.dateOfBirth === '1990-01-01') console.log('❌ Date of Birth: Still using placeholder');
    if (REAL_DATA.cnp === '1234567890123') console.log('❌ CNP: Still using placeholder');
    if (REAL_DATA.documentValidFrom === '2020-01-01') console.log('❌ Document Valid From: Still using placeholder');
    if (REAL_DATA.documentValidUntil === '2030-01-01') console.log('❌ Document Valid Until: Still using placeholder');
    console.log();
    console.log('📝 Please update the REAL_DATA object and run this script again.');
    return;
  }

  console.log('✅ Real data detected! Updating database...');
  console.log('===========================================');

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

  // Prepare update data
  const updateData = {
    veriffPersonDateOfBirth: REAL_DATA.dateOfBirth,
    veriffPersonIdNumber: REAL_DATA.cnp,
    veriffPersonGender: REAL_DATA.gender,
    veriffDocumentValidFrom: REAL_DATA.documentValidFrom,
    veriffDocumentValidUntil: REAL_DATA.documentValidUntil,
    // Keep existing real data
    veriffDocumentNumber: 'RX740900',
    veriffPersonGivenName: 'BOGDAN',
    veriffPersonLastName: 'LUCA',
    veriffPersonNationality: 'Romanian',
    veriffPersonCountry: 'Romania'
  };

  console.log('💾 Updating database with real data...');
  console.log('======================================');
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

  console.log('✅ Successfully updated with REAL data!');
  console.log('=======================================');
  console.log('🎯 Now Bogdan Luca should have the same verification display as Daia!');
  console.log();
  console.log('🧪 Test the result:');
  console.log('==================');
  console.log('1. Go to My Account page while impersonating Bogdan Luca');
  console.log('2. Check the verification tab');
  console.log('3. You should see detailed verification cards with real data');
  console.log('4. The display should match Alexandru-Ștefan Daia\'s verification');
}

updateWithRealData().catch(console.error);
