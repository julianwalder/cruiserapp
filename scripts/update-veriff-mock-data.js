const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateUserWithVeriffData() {
  const sessionId = 'fefb6eff-d56e-457c-9d73-27bdfd70d19f'; // New session ID from Veriff
  const attemptId = '111a6dbd-2d36-49f4-9081-75a38d4ef9ca'; // New attempt ID from Veriff
  
  // Updated data based on actual Veriff extraction with high confidence
  const veriffData = {
    id: sessionId,
    status: 'submitted',
    person: {
      givenName: 'JULIAN',
      lastName: 'WALDER',
      idNumber: null,
      dateOfBirth: '1973-07-08',
      nationality: 'Austria',
      gender: null,
      country: 'Austria'
    },
    document: {
      type: 'DRIVER_LICENCE',
      number: '19060794',
      country: 'Austria',
      validFrom: '2019-02-18',
      validUntil: '2034-02-17',
      issuedBy: 'Austria'
    },
    additionalVerification: {
      faceMatch: {
        similarity: null,
        status: 'pending'
      }
    },
    decisionScore: null,
    insights: {
      quality: 'excellent',
      flags: [],
      context: 'Document submitted successfully with high confidence extraction'
    },
    createdAt: '2025-08-05T12:25:27.070Z',
    updatedAt: new Date().toISOString(),
    // Webhook data
    sessionId: sessionId,
    attemptId: attemptId,
    feature: 'selfid',
    action: 'submitted',
    code: 7002,
    submittedAt: new Date().toISOString(),
    webhookReceivedAt: new Date().toISOString(),
    // Vendor data
    vendorData: '3688d854-3ee7-404b-a1b1-b60f1d8aba2f'
  };

  console.log('Updating user with Veriff data:', JSON.stringify(veriffData, null, 2));

  // Find the user by vendor data (user ID)
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, firstName, lastName')
    .eq('id', '3688d854-3ee7-404b-a1b1-b60f1d8aba2f') // Use vendor data as user ID
    .single();

  if (findError) {
    console.error('Error finding user:', findError);
    return;
  }

  if (!user) {
    console.log('No user found with ID: 3688d854-3ee7-404b-a1b1-b60f1d8aba2f');
    return;
  }

  console.log(`Found user: ${user.email} (${user.firstName} ${user.lastName})`);

  // Update user with the Veriff data
  const { error: updateError } = await supabase
    .from('users')
    .update({
      veriffSessionId: sessionId,
      veriffData: veriffData,
      veriffStatus: 'submitted',
      identityVerified: false, // Still pending approval
      updatedAt: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating user:', updateError);
    return;
  }

  console.log('✅ User updated successfully with Veriff data');
  console.log('User ID:', user.id);
  console.log('Email:', user.email);
  console.log('Session ID:', sessionId);
  console.log('Attempt ID:', attemptId);
  console.log('Status: submitted');
  console.log('Person: JULIAN WALDER');
  console.log('Date of Birth: 1973-07-08');
  console.log('Country: Austria');
  console.log('Document: Driver\'s Licence #19060794');
  console.log('Valid: 2019-02-18 to 2034-02-17');
  console.log('Data Extraction: High Confidence (VIZ)');
}

updateUserWithVeriffData().catch(console.error); 