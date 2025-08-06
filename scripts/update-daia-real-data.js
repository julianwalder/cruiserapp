require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateDaiaRealData() {
  console.log('🔧 Updating Daia\'s data with real Personal ID from Veriff...\n');

  try {
    // Update Daia's data with the real Personal ID
    console.log('📋 Updating with real data from Veriff...');
    
    const updateData = {
      // Real Personal ID from Veriff
      veriffPersonIdNumber: '5001227410011',
      
      // Update document number to match the Personal ID
      veriffDocumentNumber: '5001227410011',
      
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

    console.log('✅ Daia\'s data updated successfully!');
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

    console.log('\n🎉 Daia\'s real Personal ID is now updated!');
    console.log('   The frontend will now display the correct ID: 5001227410011');

  } catch (error) {
    console.error('❌ Error updating Daia\'s data:', error);
  }
}

updateDaiaRealData(); 