const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateUserWithVeriffData() {
  const sessionId = 'b0fc7c45-8527-40f9-9924-f8aed05181ca';
  
  // Mock data based on what's visible in Veriff dashboard
  const veriffData = {
    id: sessionId,
    status: 'submitted',
    person: {
      givenName: 'Julian',
      lastName: 'Walder',
      idNumber: null,
      dateOfBirth: null,
      nationality: 'Austria',
      gender: null,
      country: 'Austria'
    },
    document: {
      type: 'PASSPORT',
      number: null,
      country: 'Austria',
      validFrom: null,
      validUntil: null,
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
      quality: 'good',
      flags: [],
      context: 'Document submitted successfully'
    },
    createdAt: '2025-08-05T12:07:45.701Z',
    updatedAt: '2025-08-05T12:07:46.031Z',
    // Webhook data
    sessionId: sessionId,
    attemptId: null,
    feature: 'selfid',
    action: 'submitted',
    code: 7002,
    submittedAt: '2025-08-05T12:07:46.031Z',
    webhookReceivedAt: new Date().toISOString()
  };

  console.log('Updating user with Veriff data:', JSON.stringify(veriffData, null, 2));

  // Find the user with this session ID
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, firstName, lastName')
    .eq('veriffSessionId', sessionId)
    .single();

  if (findError) {
    console.error('Error finding user:', findError);
    return;
  }

  if (!user) {
    console.log('No user found with session ID:', sessionId);
    return;
  }

  console.log(`Found user: ${user.email} (${user.firstName} ${user.lastName})`);

  // Update user with the Veriff data
  const { error: updateError } = await supabase
    .from('users')
    .update({
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
  console.log('Status: submitted');
  console.log('Person: Julian Walder');
  console.log('Country: Austria');
  console.log('Document: Austria Passport');
}

updateUserWithVeriffData().catch(console.error); 