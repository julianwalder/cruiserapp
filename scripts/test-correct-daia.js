const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectDaia() {
  console.log('🔍 Testing the correct Daia (Alexandru-Ștefan Daia)...');
  
  try {
    // Use the correct Daia's user ID
    const daiaUserId = '9043dc12-13d7-4763-a7ac-4d6d8a300ca5';
    const daiaEmail = 'ops@cruiseraviation.ro';

    console.log(`👤 Testing user ID: ${daiaUserId}`);
    console.log(`📧 Email: ${daiaEmail}`);

    // Step 1: Get Daia's user info
    const { data: daiaUser, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .eq('id', daiaUserId)
      .single();

    if (userError) {
      console.error('❌ Error fetching Daia:', userError);
      return;
    }

    console.log(`✅ Found Daia: ${daiaUser.firstName} ${daiaUser.lastName} (${daiaUser.email})`);

    // Step 2: Check invoice_clients linked to Daia
    console.log('\n📋 Checking invoice_clients linked to Daia...');
    const { data: daiaInvoices, error: invoiceError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        email,
        name,
        user_id,
        invoices!inner(
          id,
          smartbill_id,
          issue_date,
          total_amount,
          status
        )
      `)
      .eq('user_id', daiaUserId);

    if (invoiceError) {
      console.error('❌ Error fetching Daia\'s invoices:', invoiceError);
      return;
    }

    console.log(`📊 Daia has ${daiaInvoices?.length || 0} linked invoices`);

    if (daiaInvoices && daiaInvoices.length > 0) {
      daiaInvoices.forEach((client, index) => {
        const invoice = client.invoices;
        console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - ${invoice.total_amount} RON (${invoice.status})`);
      });
    }

    // Step 3: Check invoice_clients with Daia's email
    console.log('\n📧 Checking invoice_clients with Daia\'s email...');
    const { data: emailInvoices, error: emailError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        email,
        name,
        user_id,
        invoices!inner(
          id,
          smartbill_id,
          issue_date,
          total_amount,
          status
        )
      `)
      .eq('email', daiaEmail);

    if (emailError) {
      console.error('❌ Error fetching invoices by email:', emailError);
      return;
    }

    console.log(`📊 Found ${emailInvoices?.length || 0} invoices with Daia\'s email`);

    if (emailInvoices && emailInvoices.length > 0) {
      emailInvoices.forEach((client, index) => {
        const invoice = client.invoices;
        const linked = client.user_id ? '✅ Linked' : '❌ Not linked';
        console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - ${invoice.total_amount} RON - ${linked}`);
      });
    }

    // Step 4: Check if there are any invoice_clients with similar emails
    console.log('\n🔍 Checking for similar email patterns...');
    const { data: similarEmails, error: similarError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        email,
        name,
        user_id,
        invoices!inner(
          id,
          smartbill_id,
          issue_date,
          total_amount,
          status
        )
      `)
      .or('email.ilike.%cruiseraviation%,email.ilike.%ops%');

    if (similarError) {
      console.error('❌ Error fetching similar emails:', similarError);
    } else {
      console.log(`📊 Found ${similarEmails?.length || 0} invoices with similar email patterns`);
      if (similarEmails && similarEmails.length > 0) {
        similarEmails.forEach((client, index) => {
          const invoice = client.invoices;
          const linked = client.user_id ? '✅ Linked' : '❌ Not linked';
          console.log(`   ${index + 1}. ${client.email} - ${invoice.smartbill_id} - ${invoice.issue_date} - ${linked}`);
        });
      }
    }

    // Step 5: Check total invoice_clients count
    console.log('\n📈 Checking total invoice_clients...');
    const { data: totalClients, error: totalError } = await supabase
      .from('invoice_clients')
      .select('id, email, name, user_id');

    if (totalError) {
      console.error('❌ Error fetching total clients:', totalError);
    } else {
      const withUserId = totalClients.filter(c => c.user_id).length;
      const withoutUserId = totalClients.length - withUserId;
      console.log(`📊 Total invoice_clients: ${totalClients.length}`);
      console.log(`   With user_id: ${withUserId}`);
      console.log(`   Without user_id: ${withoutUserId}`);
    }

    // Step 6: Summary
    console.log('\n📈 Summary for Daia:');
    console.log(`   Legacy invoices linked: ${daiaInvoices?.length || 0}`);
    console.log(`   Legacy invoices by email: ${emailInvoices?.length || 0}`);
    console.log(`   Total invoices: ${(daiaInvoices?.length || 0) + (emailInvoices?.length || 0)}`);

    if ((daiaInvoices?.length || 0) + (emailInvoices?.length || 0) === 0) {
      console.log('\n⚠️  No invoices found for Daia!');
      console.log('   This means:');
      console.log('   1. No legacy invoices exist with email: ops@cruiseraviation.ro');
      console.log('   2. The migration didn\'t find any matching invoices');
      console.log('   3. Daia might not have any legacy invoices in the system');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCorrectDaia()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
