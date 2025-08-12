const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUnifiedService() {
  console.log('🔍 Testing the unified service logic manually...');
  
  try {
    const daiaUserId = '9043dc12-13d7-4763-a7ac-4d6d8a300ca5';

    // Test the exact same query that the unified service should be using
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

    // Test proforma invoices
    console.log('\n📄 Testing proforma invoices...');
    const { data: proformaInvoices, error: proformaError } = await supabase
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
        payment_method,
        payment_link,
        payment_status,
        payment_date,
        payment_reference,
        user_id,
        package_id,
        client:invoice_clients(
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
        package:hour_package_templates(
          name,
          hours,
          price_per_hour,
          validity_days
        )
      `)
      .eq('user_id', daiaUserId)
      .eq('payment_method', 'proforma');

    if (proformaError) {
      console.error('❌ Error fetching proforma invoices:', proformaError);
    } else {
      console.log(`✅ Found ${proformaInvoices?.length || 0} proforma invoices for Daia`);
      if (proformaInvoices && proformaInvoices.length > 0) {
        proformaInvoices.forEach((invoice, index) => {
          const client = invoice.client?.[0] || {};
          console.log(`   ${index + 1}. ${invoice.smartbill_id} - ${invoice.issue_date} - ${invoice.total_amount} RON - Client: ${client.name} (${client.email})`);
        });
      }
    }

    // Combine results like the unified service does
    const allInvoices = [...(legacyInvoices || []), ...(proformaInvoices || [])]
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());

    console.log(`\n📈 Total invoices for Daia: ${allInvoices.length}`);
    
    if (allInvoices.length > 0) {
      console.log('✅ This is what Daia should see in the billing page!');
    } else {
      console.log('⚠️  No invoices found for Daia');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUnifiedService()
  .then(() => {
    console.log('\n🏁 Unified service test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unified service test failed:', error);
    process.exit(1);
  });
