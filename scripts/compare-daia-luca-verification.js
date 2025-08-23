const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareVerificationData() {
  console.log('🔍 Comparing verification data between Daia and Luca...\n');

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

  console.log('📊 VERIFICATION STATUS COMPARISON:');
  console.log('=====================================');
  console.log(`Daia (${daiaUser.email}):`);
  console.log(`  - identityVerified: ${daiaUser.identityVerified}`);
  console.log(`  - veriffStatus: ${daiaUser.veriffStatus}`);
  console.log(`  - veriffSessionId: ${daiaUser.veriffSessionId || 'null'}`);
  console.log(`  - veriffVerificationId: ${daiaUser.veriffVerificationId || 'null'}`);
  console.log(`  - has veriffWebhookData: ${!!daiaUser.veriffWebhookData}`);
  console.log(`  - has veriffData: ${!!daiaUser.veriffData}`);
  console.log();

  console.log(`Luca (${lucaUser.email}):`);
  console.log(`  - identityVerified: ${lucaUser.identityVerified}`);
  console.log(`  - veriffStatus: ${lucaUser.veriffStatus}`);
  console.log(`  - veriffSessionId: ${lucaUser.veriffSessionId || 'null'}`);
  console.log(`  - veriffVerificationId: ${lucaUser.veriffVerificationId || 'null'}`);
  console.log(`  - has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log(`  - has veriffData: ${!!lucaUser.veriffData}`);
  console.log();

  // Check what getUserVeriffStatus would return for each
  console.log('🔍 SIMULATING getUserVeriffStatus RESPONSE:');
  console.log('==========================================');

  // Simulate Daia's getUserVeriffStatus response
  console.log('Daia getUserVeriffStatus would return:');
  if (daiaUser.identityVerified) {
    console.log('  ✅ identityVerified: true - should return verified status');
    console.log(`  - sessionId: ${daiaUser.veriffSessionId || 'undefined'}`);
    console.log(`  - veriffStatus: ${daiaUser.veriffStatus || 'approved'}`);
    console.log(`  - isVerified: true`);
    console.log(`  - veriffData: ${!!(daiaUser.veriffWebhookData || daiaUser.veriffData)}`);
  } else {
    console.log('  ❌ identityVerified: false - would need verification');
  }
  console.log();

  // Simulate Luca's getUserVeriffStatus response
  console.log('Luca getUserVeriffStatus would return:');
  if (lucaUser.identityVerified) {
    console.log('  ✅ identityVerified: true - should return verified status');
    console.log(`  - sessionId: ${lucaUser.veriffSessionId || 'undefined'}`);
    console.log(`  - veriffStatus: ${lucaUser.veriffStatus || 'approved'}`);
    console.log(`  - isVerified: true`);
    console.log(`  - veriffData: ${!!(lucaUser.veriffWebhookData || lucaUser.veriffData)}`);
  } else {
    console.log('  ❌ identityVerified: false - would need verification');
  }
  console.log();

  // Check the actual webhook data structure
  console.log('📋 WEBHOOK DATA STRUCTURE COMPARISON:');
  console.log('=====================================');

  if (daiaUser.veriffWebhookData) {
    const daiaData = typeof daiaUser.veriffWebhookData === 'string' 
      ? JSON.parse(daiaUser.veriffWebhookData) 
      : daiaUser.veriffWebhookData;
    
    console.log('Daia webhook data keys:', Object.keys(daiaData));
    console.log('Daia has person data:', !!daiaData.person);
    console.log('Daia has document data:', !!daiaData.document);
    console.log('Daia has verification data:', !!daiaData.verification);
    console.log();
  }

  if (lucaUser.veriffWebhookData) {
    const lucaData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;
    
    console.log('Luca webhook data keys:', Object.keys(lucaData));
    console.log('Luca has person data:', !!lucaData.person);
    console.log('Luca has document data:', !!lucaData.document);
    console.log('Luca has verification data:', !!lucaData.verification);
    console.log();
  }

  // Check what the VeriffVerification component would render
  console.log('🎨 VERIFFVERIFICATION COMPONENT RENDERING:');
  console.log('==========================================');

  // Check the condition for rendering VeriffIDVResults
  // The condition is: status?.veriffData && (status?.isVerified || status?.veriffStatus === 'approved')
  
  const daiaHasVeriffData = !!(daiaUser.veriffWebhookData || daiaUser.veriffData);
  const daiaIsVerified = daiaUser.identityVerified;
  const daiaStatusApproved = daiaUser.veriffStatus === 'approved';
  
  const lucaHasVeriffData = !!(lucaUser.veriffWebhookData || lucaUser.veriffData);
  const lucaIsVerified = lucaUser.identityVerified;
  const lucaStatusApproved = lucaUser.veriffStatus === 'approved';

  console.log('Daia rendering condition:');
  console.log(`  - hasVeriffData: ${daiaHasVeriffData}`);
  console.log(`  - isVerified: ${daiaIsVerified}`);
  console.log(`  - statusApproved: ${daiaStatusApproved}`);
  console.log(`  - Condition result: ${daiaHasVeriffData && (daiaIsVerified || daiaStatusApproved)}`);
  console.log(`  - Should show VeriffIDVResults: ${daiaHasVeriffData && (daiaIsVerified || daiaStatusApproved) ? 'YES' : 'NO'}`);
  console.log();

  console.log('Luca rendering condition:');
  console.log(`  - hasVeriffData: ${lucaHasVeriffData}`);
  console.log(`  - isVerified: ${lucaIsVerified}`);
  console.log(`  - statusApproved: ${lucaStatusApproved}`);
  console.log(`  - Condition result: ${lucaHasVeriffData && (lucaIsVerified || lucaStatusApproved)}`);
  console.log(`  - Should show VeriffIDVResults: ${lucaHasVeriffData && (lucaIsVerified || lucaStatusApproved) ? 'YES' : 'NO'}`);
  console.log();

  // Check if there are any differences in the actual data structure
  console.log('🔍 DETAILED DATA STRUCTURE ANALYSIS:');
  console.log('=====================================');

  if (daiaUser.veriffWebhookData && lucaUser.veriffWebhookData) {
    const daiaData = typeof daiaUser.veriffWebhookData === 'string' 
      ? JSON.parse(daiaUser.veriffWebhookData) 
      : daiaUser.veriffWebhookData;
    
    const lucaData = typeof lucaUser.veriffWebhookData === 'string' 
      ? JSON.parse(lucaUser.veriffWebhookData) 
      : lucaUser.veriffWebhookData;

    console.log('Daia person data structure:');
    if (daiaData.person) {
      console.log('  - firstName:', daiaData.person.firstName);
      console.log('  - lastName:', daiaData.person.lastName);
      console.log('  - dateOfBirth:', daiaData.person.dateOfBirth);
      console.log('  - nationality:', daiaData.person.nationality);
      console.log('  - idNumber:', daiaData.person.idNumber);
    } else {
      console.log('  - No person data');
    }
    console.log();

    console.log('Luca person data structure:');
    if (lucaData.person) {
      console.log('  - firstName:', lucaData.person.firstName);
      console.log('  - lastName:', lucaData.person.lastName);
      console.log('  - dateOfBirth:', lucaData.person.dateOfBirth);
      console.log('  - nationality:', lucaData.person.nationality);
      console.log('  - idNumber:', lucaData.person.idNumber);
    } else {
      console.log('  - No person data');
    }
    console.log();

    console.log('Daia document data structure:');
    if (daiaData.document) {
      console.log('  - type:', daiaData.document.type);
      console.log('  - number:', daiaData.document.number);
      console.log('  - country:', daiaData.document.country);
      console.log('  - validFrom:', daiaData.document.validFrom);
      console.log('  - validUntil:', daiaData.document.validUntil);
    } else {
      console.log('  - No document data');
    }
    console.log();

    console.log('Luca document data structure:');
    if (lucaData.document) {
      console.log('  - type:', lucaData.document.type);
      console.log('  - number:', lucaData.document.number);
      console.log('  - country:', lucaData.document.country);
      console.log('  - validFrom:', lucaData.document.validFrom);
      console.log('  - validUntil:', lucaData.document.validUntil);
    } else {
      console.log('  - No document data');
    }
  }
}

compareVerificationData().catch(console.error);
