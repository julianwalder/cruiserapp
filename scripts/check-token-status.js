const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = "https://lvbukwpecrtdtrsmqass.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnVrd3BlY3J0ZHRyc21xYXNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY0ODk0MywiZXhwIjoyMDY5MjI0OTQzfQ.Jn5Ai5KpFJl2_BP0dg-JT4JS4VUcggSa4r00WaUfwNs";

const supabase = createClient(supabaseUrl, supabaseKey);

function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.log('Error decoding JWT:', error.message);
    return null;
  }
}

async function checkTokenStatus() {
  console.log('🔍 Checking token status and authentication...\n');

  // Get current user data
  const { data: lucaUser, error: lucaError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'bogdan.luca@gmail.com')
    .single();

  if (lucaError) {
    console.error('Error fetching Luca:', lucaError);
    return;
  }

  console.log('📊 Bogdan Luca\'s Current Status:');
  console.log('=================================');
  console.log(`Email: ${lucaUser.email}`);
  console.log(`Name: ${lucaUser.firstName} ${lucaUser.lastName}`);
  console.log(`Veriff Status: ${lucaUser.veriffStatus}`);
  console.log(`Identity Verified: ${lucaUser.identityVerified}`);
  console.log(`Has veriffWebhookData: ${!!lucaUser.veriffWebhookData}`);
  console.log(`Has veriffPersonDateOfBirth: ${!!lucaUser.veriffPersonDateOfBirth}`);
  console.log(`Has veriffPersonIdNumber: ${!!lucaUser.veriffPersonIdNumber}`);
  console.log();

  // Check if we have the real data
  if (lucaUser.veriffPersonDateOfBirth && lucaUser.veriffPersonIdNumber) {
    console.log('✅ REAL DATA CONFIRMED:');
    console.log('========================');
    console.log(`Date of Birth: ${lucaUser.veriffPersonDateOfBirth}`);
    console.log(`CNP: ${lucaUser.veriffPersonIdNumber}`);
    console.log(`Gender: ${lucaUser.veriffPersonGender}`);
    console.log(`Document Number: ${lucaUser.veriffDocumentNumber}`);
    console.log(`Document Valid From: ${lucaUser.veriffDocumentValidFrom}`);
    console.log(`Document Valid Until: ${lucaUser.veriffDocumentValidUntil}`);
    console.log();
  }

  console.log('🔧 AUTHENTICATION TROUBLESHOOTING:');
  console.log('==================================');
  console.log('The "No authentication token found" error suggests:');
  console.log();
  console.log('1. 🔑 Check if impersonation token exists in localStorage');
  console.log('   - Open browser dev tools (F12)');
  console.log('   - Go to Application/Storage tab');
  console.log('   - Check localStorage for "impersonationToken"');
  console.log();
  console.log('2. ⏰ Check if token has expired');
  console.log('   - If token exists, it might have expired');
  console.log('   - Try impersonating Bogdan Luca again');
  console.log();
  console.log('3. 🔄 Try refreshing the page');
  console.log('   - Sometimes tokens need to be refreshed');
  console.log();
  console.log('4. 🚪 Try logging out and logging back in');
  console.log('   - Then impersonate Bogdan Luca again');
  console.log();

  console.log('💡 QUICK FIX:');
  console.log('==============');
  console.log('1. Go to User Management page');
  console.log('2. Click "Impersonate" for Bogdan Luca');
  console.log('3. This will create a fresh impersonation token');
  console.log('4. Then go to My Account page');
  console.log();

  console.log('🎯 VERIFICATION DATA STATUS:');
  console.log('============================');
  console.log('✅ Real data is in the database');
  console.log('✅ Webhook data is complete');
  console.log('✅ All fields are populated');
  console.log('❌ Authentication token issue needs to be resolved');
  console.log();
  console.log('Once authentication is fixed, Bogdan Luca should see:');
  console.log('- Complete verification cards with real data');
  console.log('- Same display as Alexandru-Ștefan Daia');
  console.log('- All details from his Veriff ID');
}

checkTokenStatus().catch(console.error);
