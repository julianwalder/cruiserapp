const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugInvoiceClients() {
  console.log('🔍 Debugging invoice clients...');
  
  try {
    // Check if invoice_clients table has data
    console.log('📊 Checking invoice_clients table...');
    const { data: clients, error: clientsError } = await supabase
      .from('invoice_clients')
      .select('*')
      .limit(5);

    if (clientsError) {
      console.error('❌ Error fetching invoice_clients:', clientsError);
      return;
    }

    console.log(`✅ Found ${clients.length} invoice clients:`);
    clients.forEach((client, index) => {
      console.log(`   ${index + 1}. Invoice ID: ${client.invoice_id}, Name: ${client.name}, Email: ${client.email}`);
    });

    // Check if invoices table has data
    console.log('\n📊 Checking invoices table...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id, series, number')
      .limit(5);

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return;
    }

    console.log(`✅ Found ${invoices.length} invoices:`);
    invoices.forEach((invoice, index) => {
      console.log(`   ${index + 1}. ID: ${invoice.id}, SmartBill ID: ${invoice.smartbill_id}`);
    });

    // Test the relationship query
    console.log('\n🔗 Testing relationship query...');
    const { data: relatedData, error: relatedError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
          user_id,
          company_id
        )
      `)
      .limit(3);

    if (relatedError) {
      console.error('❌ Error in relationship query:', relatedError);
      return;
    }

    console.log('✅ Relationship query results:');
    relatedData.forEach((invoice, index) => {
      console.log(`   ${index + 1}. Invoice: ${invoice.smartbill_id}`);
      console.log(`      Clients: ${invoice.invoice_clients?.length || 0}`);
      if (invoice.invoice_clients && invoice.invoice_clients.length > 0) {
        invoice.invoice_clients.forEach((client, clientIndex) => {
          console.log(`         ${clientIndex + 1}. ${client.name} (${client.email})`);
        });
      } else {
        console.log('         No clients found');
      }
    });

    // Check if there are any foreign key issues
    console.log('\n🔍 Checking for foreign key issues...');
    const { data: orphanedClients, error: orphanedError } = await supabase
      .from('invoice_clients')
      .select('invoice_id, name')
      .is('invoice_id', null);

    if (orphanedError) {
      console.error('❌ Error checking orphaned clients:', orphanedError);
    } else {
      console.log(`✅ Found ${orphanedClients.length} orphaned clients (no invoice_id)`);
    }

    // Test the exact query from the service
    console.log('\n🔍 Testing exact service query...');
    const { data: serviceQuery, error: serviceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_clients (
          name,
          email,
          phone,
          vat_code,
          address,
          city,
          country,
          user_id,
          company_id
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount,
          vat_rate
        ),
        flight_hours (
          hours_regular,
          hours_promotional,
          total_hours,
          rate_per_hour,
          total_amount,
          notes
        )
      `)
      .order('issue_date', { ascending: false })
      .limit(1);

    if (serviceError) {
      console.error('❌ Error in service query:', serviceError);
      return;
    }

    console.log('✅ Service query result:');
    if (serviceQuery && serviceQuery.length > 0) {
      const invoice = serviceQuery[0];
      console.log(`   Invoice: ${invoice.smartbill_id}`);
      console.log(`   Clients: ${invoice.invoice_clients?.length || 0}`);
      console.log(`   Items: ${invoice.invoice_items?.length || 0}`);
      console.log(`   Flight Hours: ${invoice.flight_hours?.length || 0}`);
      
      if (invoice.invoice_clients && invoice.invoice_clients.length > 0) {
        console.log('   Client details:');
        invoice.invoice_clients.forEach((client, index) => {
          console.log(`     ${index + 1}. ${client.name} (${client.email})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug function
debugInvoiceClients(); 