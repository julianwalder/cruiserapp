require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDaiaRealVeriffData() {
  console.log('🔧 Updating Daia\'s data with real extracted data from Veriff...\n');

  try {
    // Update Daia's data with the real extracted data from Veriff
    console.log('📋 Updating with real Veriff extracted data...');
    
    const updateData = {
      // Personal Information (from Veriff extraction)
      veriffPersonGivenName: 'ALEXANDRU-STEFAN',
      veriffPersonLastName: 'DAIA',
      veriffPersonIdNumber: '5001227410011',
      veriffPersonDateOfBirth: '2000-12-27',
      veriffPersonGender: 'M',
      veriffPersonNationality: 'RO',
      veriffPersonCountry: 'Romania',
      
      // Address Information (from Veriff extraction)
      address: 'MUN.BUCUREŞTI SEC.4 BD.GHEORGHE ŞINCAI NR.5 BL.2 SC.A ET.6 AP.20',
      
      // Document Information (from Veriff extraction)
      veriffDocumentType: 'ID Card',
      veriffDocumentNumber: 'RK495135',
      veriffDocumentCountry: 'Romania',
      veriffDocumentValidFrom: '2020-01-30',
      veriffDocumentValidUntil: '2027-12-27',
      veriffDocumentIssuedBy: 'Romanian Government',
      
      // Verification results (keeping the same)
      veriffFaceMatchStatus: 'approved',
      veriffFaceMatchSimilarity: 0.95,
      veriffDecisionScore: 0.98,
      veriffQualityScore: 'high',
      
      // Metadata
      veriffFeature: 'selfid',
      veriffCode: 7002,
      
      updatedAt: new Date().toISOString(),
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', 'ops@cruiseraviation.ro')
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating Daia\'s data:', updateError);
      return;
    }

    console.log('✅ Daia\'s data updated with real Veriff extracted data!');
    console.log('\n📋 Updated Personal Information:');
    console.log(`   Given Name: ${updatedUser.veriffPersonGivenName}`);
    console.log(`   Last Name: ${updatedUser.veriffPersonLastName}`);
    console.log(`   ID Number (CNP): ${updatedUser.veriffPersonIdNumber}`);
    console.log(`   Date of Birth: ${updatedUser.veriffPersonDateOfBirth}`);
    console.log(`   Gender: ${updatedUser.veriffPersonGender}`);
    console.log(`   Nationality: ${updatedUser.veriffPersonNationality}`);
    console.log(`   Country: ${updatedUser.veriffPersonCountry}`);
    console.log(`   Address: ${updatedUser.address}`);
    
    console.log('\n📄 Document Information:');
    console.log(`   Document Type: ${updatedUser.veriffDocumentType}`);
    console.log(`   Document Number: ${updatedUser.veriffDocumentNumber}`);
    console.log(`   Document Country: ${updatedUser.veriffDocumentCountry}`);
    console.log(`   Valid From: ${updatedUser.veriffDocumentValidFrom}`);
    console.log(`   Valid Until: ${updatedUser.veriffDocumentValidUntil}`);
    console.log(`   Issued By: ${updatedUser.veriffDocumentIssuedBy}`);

    console.log('\n🎉 Daia\'s real Veriff extracted data is now updated!');
    console.log('   The frontend will now display the correct extracted data from Veriff.');

  } catch (error) {
    console.error('❌ Error updating Daia\'s data:', error);
  }
}

updateDaiaRealVeriffData(); 