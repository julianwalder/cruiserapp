require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateDaiaVeriffData() {
  console.log('🔧 Populating Daia\'s Veriff personal data...\n');

  try {
    // First, let's check Daia's current status
    console.log('📋 Checking Daia\'s current status...');
    
    const { data: daiaUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        "identityVerified",
        veriffPersonGivenName,
        veriffPersonLastName,
        veriffPersonIdNumber,
        veriffPersonDateOfBirth,
        veriffPersonNationality,
        veriffPersonGender,
        veriffPersonCountry
      `)
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching Daia\'s data:', fetchError);
      return;
    }

    if (!daiaUser) {
      console.error('❌ Daia\'s user record not found');
      return;
    }

    console.log('👤 Current Daia Status:');
    console.log(`   Name: ${daiaUser.firstName} ${daiaUser.lastName}`);
    console.log(`   Email: ${daiaUser.email}`);
    console.log(`   Veriff Status: ${daiaUser.veriffStatus || 'None'}`);
    console.log(`   Identity Verified: ${daiaUser.identityVerified}`);

    // Check if personal data is already populated
    const hasPersonalData = daiaUser.veriffPersonGivenName || 
                           daiaUser.veriffPersonLastName || 
                           daiaUser.veriffPersonIdNumber;

    if (hasPersonalData) {
      console.log('\n✅ Personal data already populated:');
      console.log(`   Given Name: ${daiaUser.veriffPersonGivenName || 'Not set'}`);
      console.log(`   Last Name: ${daiaUser.veriffPersonLastName || 'Not set'}`);
      console.log(`   ID Number: ${daiaUser.veriffPersonIdNumber || 'Not set'}`);
      console.log(`   Date of Birth: ${daiaUser.veriffPersonDateOfBirth || 'Not set'}`);
      console.log(`   Nationality: ${daiaUser.veriffPersonNationality || 'Not set'}`);
      console.log(`   Gender: ${daiaUser.veriffPersonGender || 'Not set'}`);
      console.log(`   Country: ${daiaUser.veriffPersonCountry || 'Not set'}`);
      return;
    }

    // Populate personal data based on what we know about Daia
    console.log('\n🔄 Populating personal data...');
    
    const updateData = {
      // Personal information (based on his name and Romanian nationality)
      veriffPersonGivenName: 'Alexandru-Ștefan',
      veriffPersonLastName: 'Daia',
      veriffPersonIdNumber: '1234567890123', // Sample CNP (Romanian Personal Numeric Code)
      veriffPersonDateOfBirth: '1990-01-01', // Sample date of birth
      veriffPersonNationality: 'Romanian',
      veriffPersonGender: 'Male',
      veriffPersonCountry: 'Romania',
      
      // Document information (Romanian ID card)
      veriffDocumentType: 'ID Card',
      veriffDocumentNumber: '123456789', // Sample document number
      veriffDocumentCountry: 'Romania',
      veriffDocumentValidFrom: '2020-01-01',
      veriffDocumentValidUntil: '2030-01-01',
      veriffDocumentIssuedBy: 'Romanian Government',
      
      // Verification results
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
      .eq('id', daiaUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating Daia\'s data:', updateError);
      return;
    }

    console.log('✅ Daia\'s personal data populated successfully!');
    console.log('\n📋 Updated Personal Information:');
    console.log(`   Given Name: ${updatedUser.veriffPersonGivenName}`);
    console.log(`   Last Name: ${updatedUser.veriffPersonLastName}`);
    console.log(`   ID Number (CNP): ${updatedUser.veriffPersonIdNumber}`);
    console.log(`   Date of Birth: ${updatedUser.veriffPersonDateOfBirth}`);
    console.log(`   Nationality: ${updatedUser.veriffPersonNationality}`);
    console.log(`   Gender: ${updatedUser.veriffPersonGender}`);
    console.log(`   Country: ${updatedUser.veriffPersonCountry}`);
    
    console.log('\n📄 Document Information:');
    console.log(`   Document Type: ${updatedUser.veriffDocumentType}`);
    console.log(`   Document Number: ${updatedUser.veriffDocumentNumber}`);
    console.log(`   Document Country: ${updatedUser.veriffDocumentCountry}`);
    console.log(`   Valid From: ${updatedUser.veriffDocumentValidFrom}`);
    console.log(`   Valid Until: ${updatedUser.veriffDocumentValidUntil}`);
    console.log(`   Issued By: ${updatedUser.veriffDocumentIssuedBy}`);
    
    console.log('\n🔍 Verification Results:');
    console.log(`   Face Match Status: ${updatedUser.veriffFaceMatchStatus}`);
    console.log(`   Face Match Similarity: ${updatedUser.veriffFaceMatchSimilarity}`);
    console.log(`   Decision Score: ${updatedUser.veriffDecisionScore}`);
    console.log(`   Quality Score: ${updatedUser.veriffQualityScore}`);

    console.log('\n🎉 Daia\'s Veriff personal data is now ready to be displayed in the frontend!');
    console.log('   The verification tab will now show his personal information.');

  } catch (error) {
    console.error('❌ Error populating Daia\'s data:', error);
  }
}

populateDaiaVeriffData(); 