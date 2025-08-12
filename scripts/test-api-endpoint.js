const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAPIEndpoint() {
  console.log('🔍 Testing the API endpoint logic...');
  
  try {
    const daiaUserId = '9043dc12-13d7-4763-a7ac-4d6d8a300ca5';

    // Test the exact query that the unified service should be using
    console.log('\n📋 Testing legacy fiscal invoices with user_id filter...');
    const { data: legacyInvoices, error: legacyError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        series,
        number,
        issue_date,
        due_date,
        status,
        total_amount,
        vat_amount,
        currency,
        import_date,
        created_at,
        xml_content,
        original_xml_content,
        client:invoice_clients!inner(
          name,
          email,
          phone,
          address,
          city,
          country,
          vat_code,
          user_id,
          company_id
        ),
        items:invoice_items(
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        )
      `)
      .eq('client.user_id', daiaUserId);

    if (legacyError) {
      console.error('❌ Error fetching legacy invoices:', legacyError);
    } else {
      console.log(`✅ Found ${legacyInvoices?.length || 0} legacy invoices for Daia`);
      if (legacyInvoices && legacyInvoices.length > 0) {
        legacyInvoices.forEach((invoice, index) => {
          const client = invoice.client?.[0] || {};
          console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - ${invoice.total_amount} RON - Client: ${client.name} (${client.email})`);
        });
      }
    }

    // Test without the user_id filter to see all invoices
    console.log('\n📋 Testing ALL legacy invoices (no user filter)...');
    const { data: allInvoices, error: allError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        series,
        number,
        issue_date,
        due_date,
        status,
        total_amount,
        vat_amount,
        currency,
        import_date,
        created_at,
        xml_content,
        original_xml_content,
        client:invoice_clients!inner(
          name,
          email,
          phone,
          address,
          city,
          country,
          vat_code,
          user_id,
          company_id
        ),
        items:invoice_items(
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        )
      `)
      .limit(5);

    if (allError) {
      console.error('❌ Error fetching all invoices:', allError);
    } else {
      console.log(`📊 Found ${allInvoices?.length || 0} total invoices (showing first 5)`);
      if (allInvoices && allInvoices.length > 0) {
        allInvoices.forEach((invoice, index) => {
          const client = invoice.client?.[0] || {};
          console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - ${invoice.total_amount} RON - Client: ${client.name} (${client.email}) - User ID: ${client.user_id}`);
        });
      }
    }

    // Check if there are any invoice_clients without user_id
    console.log('\n📋 Checking invoice_clients without user_id...');
    const { data: unlinkedClients, error: unlinkedError } = await supabase
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
          total_amount
        )
      `)
      .is('user_id', null)
      .limit(5);

    if (unlinkedError) {
      console.error('❌ Error fetching unlinked clients:', unlinkedError);
    } else {
      console.log(`📊 Found ${unlinkedClients?.length || 0} unlinked invoice clients (showing first 5)`);
      if (unlinkedClients && unlinkedClients.length > 0) {
        unlinkedClients.forEach((client, index) => {
          const invoice = client.invoices;
          console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - Client: ${client.name} (${client.email}) - User ID: NULL`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAPIEndpoint()
  .then(() => {
    console.log('\n🏁 API endpoint test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 API endpoint test failed:', error);
    process.exit(1);
  });
