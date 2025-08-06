require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDaiaWebhookData() {
  console.log('🔍 Checking Daia\'s webhook data for personal information...\n');

  try {
    // Get Daia's webhook data
    const { data: daiaUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffWebhookData,
        veriffPersonGivenName,
        veriffPersonLastName,
        veriffPersonIdNumber,
        veriffPersonDateOfBirth,
        veriffPersonNationality,
        veriffPersonGender,
        veriffPersonCountry,
        veriffDocumentType,
        veriffDocumentNumber,
        veriffDocumentCountry,
        veriffDocumentValidFrom,
        veriffDocumentValidUntil,
        veriffDocumentIssuedBy
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

    console.log('👤 Daia\'s Personal Data from Database:');
    console.log(`   Name: ${daiaUser.firstName} ${daiaUser.lastName}`);
    console.log(`   Email: ${daiaUser.email}`);
    console.log('');
    console.log('📋 Veriff Extracted Data:');
    console.log(`   Given Name: ${daiaUser.veriffPersonGivenName || 'Not set'}`);
    console.log(`   Last Name: ${daiaUser.veriffPersonLastName || 'Not set'}`);
    console.log(`   ID Number (CNP): ${daiaUser.veriffPersonIdNumber || 'Not set'}`);
    console.log(`   Date of Birth: ${daiaUser.veriffPersonDateOfBirth || 'Not set'}`);
    console.log(`   Nationality: ${daiaUser.veriffPersonNationality || 'Not set'}`);
    console.log(`   Gender: ${daiaUser.veriffPersonGender || 'Not set'}`);
    console.log(`   Country: ${daiaUser.veriffPersonCountry || 'Not set'}`);
    console.log('');
    console.log('📄 Document Information:');
    console.log(`   Document Type: ${daiaUser.veriffDocumentType || 'Not set'}`);
    console.log(`   Document Number: ${daiaUser.veriffDocumentNumber || 'Not set'}`);
    console.log(`   Document Country: ${daiaUser.veriffDocumentCountry || 'Not set'}`);
    console.log(`   Valid From: ${daiaUser.veriffDocumentValidFrom || 'Not set'}`);
    console.log(`   Valid Until: ${daiaUser.veriffDocumentValidUntil || 'Not set'}`);
    console.log(`   Issued By: ${daiaUser.veriffDocumentIssuedBy || 'Not set'}`);

    // Check raw webhook data
    if (daiaUser.veriffWebhookData) {
      console.log('\n🔍 Raw Webhook Data Analysis:');
      console.log('   Available fields in webhook payload:');
      
      const webhookData = daiaUser.veriffWebhookData;
      
      // Check for person data
      if (webhookData.personGivenName) console.log(`   - personGivenName: ${webhookData.personGivenName}`);
      if (webhookData.personLastName) console.log(`   - personLastName: ${webhookData.personLastName}`);
      if (webhookData.personIdNumber) console.log(`   - personIdNumber: ${webhookData.personIdNumber}`);
      if (webhookData.personDateOfBirth) console.log(`   - personDateOfBirth: ${webhookData.personDateOfBirth}`);
      if (webhookData.personNationality) console.log(`   - personNationality: ${webhookData.personNationality}`);
      if (webhookData.personGender) console.log(`   - personGender: ${webhookData.personGender}`);
      if (webhookData.personCountry) console.log(`   - personCountry: ${webhookData.personCountry}`);
      
      // Check for document data
      if (webhookData.documentType) console.log(`   - documentType: ${webhookData.documentType}`);
      if (webhookData.documentNumber) console.log(`   - documentNumber: ${webhookData.documentNumber}`);
      if (webhookData.documentCountry) console.log(`   - documentCountry: ${webhookData.documentCountry}`);
      if (webhookData.documentValidFrom) console.log(`   - documentValidFrom: ${webhookData.documentValidFrom}`);
      if (webhookData.documentValidUntil) console.log(`   - documentValidUntil: ${webhookData.documentValidUntil}`);
      if (webhookData.documentIssuedBy) console.log(`   - documentIssuedBy: ${webhookData.documentIssuedBy}`);

      // Check for address data
      if (webhookData.personAddress) console.log(`   - personAddress: ${webhookData.personAddress}`);
      if (webhookData.personCity) console.log(`   - personCity: ${webhookData.personCity}`);
      if (webhookData.personPostalCode) console.log(`   - personPostalCode: ${webhookData.personPostalCode}`);
      if (webhookData.personStreet) console.log(`   - personStreet: ${webhookData.personStreet}`);
      if (webhookData.personHouseNumber) console.log(`   - personHouseNumber: ${webhookData.personHouseNumber}`);

      // Show full webhook data structure
      console.log('\n📄 Full Webhook Data Structure:');
      console.log(JSON.stringify(webhookData, null, 2));
    } else {
      console.log('\n❌ No webhook data available');
    }

    // Check if we need to update the individual fields
    console.log('\n🔧 Data Status Check:');
    const missingFields = [];
    
    if (!daiaUser.veriffPersonGivenName && daiaUser.veriffWebhookData?.personGivenName) {
      missingFields.push('veriffPersonGivenName');
    }
    if (!daiaUser.veriffPersonLastName && daiaUser.veriffWebhookData?.personLastName) {
      missingFields.push('veriffPersonLastName');
    }
    if (!daiaUser.veriffPersonIdNumber && daiaUser.veriffWebhookData?.personIdNumber) {
      missingFields.push('veriffPersonIdNumber');
    }
    if (!daiaUser.veriffPersonDateOfBirth && daiaUser.veriffWebhookData?.personDateOfBirth) {
      missingFields.push('veriffPersonDateOfBirth');
    }
    if (!daiaUser.veriffPersonNationality && daiaUser.veriffWebhookData?.personNationality) {
      missingFields.push('veriffPersonNationality');
    }
    if (!daiaUser.veriffPersonGender && daiaUser.veriffWebhookData?.personGender) {
      missingFields.push('veriffPersonGender');
    }
    if (!daiaUser.veriffPersonCountry && daiaUser.veriffWebhookData?.personCountry) {
      missingFields.push('veriffPersonCountry');
    }

    if (missingFields.length > 0) {
      console.log(`   ⚠️  Missing individual fields: ${missingFields.join(', ')}`);
      console.log('   These fields need to be updated from webhook data');
    } else {
      console.log('   ✅ All individual fields are properly set');
    }

  } catch (error) {
    console.error('❌ Error checking Daia\'s webhook data:', error);
  }
}

checkDaiaWebhookData(); 