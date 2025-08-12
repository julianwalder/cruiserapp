const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDaiaInvoices() {
  console.log('🔍 Testing Daia\'s invoices...');
  
  try {
    // Step 1: Find Daia's user record
    console.log('👤 Finding Daia\'s user record...');
    const { data: daiaUsers, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .or('firstName.ilike.%Daia%,lastName.ilike.%Daia%,email.ilike.%daia%');

    if (userError) {
      console.error('❌ Error finding Daia:', userError);
      return;
    }

    if (!daiaUsers || daiaUsers.length === 0) {
      console.log('❌ Daia not found in users table');
      return;
    }

    console.log(`✅ Found ${daiaUsers.length} users matching Daia:`);
    daiaUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}`);
    });

    // Use the first match (or you can specify which one to use)
    const daiaUser = daiaUsers[0];
    console.log(`\n🔍 Using user: ${daiaUser.firstName} ${daiaUser.lastName} (${daiaUser.email})`);
    console.log(`   User ID: ${daiaUser.id}`);

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
      .eq('user_id', daiaUser.id);

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

    // Step 3: Check invoice_clients with Daia's email (in case they weren't linked)
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
      .eq('email', daiaUser.email);

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

    // Step 4: Check proforma invoices for Daia
    console.log('\n📄 Checking proforma invoices for Daia...');
    const { data: proformaInvoices, error: proformaError } = await supabase
      .from('proforma_invoices')
      .select(`
        id,
        invoice_number,
        issue_date,
        total_amount,
        status,
        user_id
      `)
      .eq('user_id', daiaUser.id);

    if (proformaError) {
      console.error('❌ Error fetching proforma invoices:', proformaError);
    } else {
      console.log(`📊 Daia has ${proformaInvoices?.length || 0} proforma invoices`);
      if (proformaInvoices && proformaInvoices.length > 0) {
        proformaInvoices.forEach((invoice, index) => {
          console.log(`   ${index + 1}. ${invoice.invoice_number} - ${invoice.issue_date} - ${invoice.total_amount} RON (${invoice.status})`);
        });
      }
    }

    // Step 5: Summary
    console.log('\n📈 Summary:');
    console.log(`   Legacy invoices linked: ${daiaInvoices?.length || 0}`);
    console.log(`   Legacy invoices by email: ${emailInvoices?.length || 0}`);
    console.log(`   Proforma invoices: ${proformaInvoices?.length || 0}`);
    console.log(`   Total invoices: ${(daiaInvoices?.length || 0) + (proformaInvoices?.length || 0)}`);

    if ((daiaInvoices?.length || 0) + (proformaInvoices?.length || 0) === 0) {
      console.log('\n⚠️  No invoices found for Daia!');
      console.log('   Possible reasons:');
      console.log('   1. No legacy invoices exist with Daia\'s email');
      console.log('   2. Migration didn\'t link any invoices');
      console.log('   3. Daia has no proforma invoices');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDaiaInvoices()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
