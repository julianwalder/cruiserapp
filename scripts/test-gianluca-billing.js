const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGianlucaBilling() {
  try {
    console.log('🔍 Testing Gianluca\'s billing access...\n');

    // Find Gianluca Dipinto
    const { data: gianluca, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .or('email.eq.gianluca.dipinto@cruiseraviation.ro,firstName.eq.Gianluca,lastName.eq.Dipinto')
      .limit(5);

    if (userError) {
      console.error('❌ Error finding Gianluca:', userError);
      return;
    }

    console.log('👤 Found users matching Gianluca:');
    gianluca.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Status: ${user.status}`);
      console.log(`    Roles: ${user.user_roles.map(ur => ur.roles.name).join(', ')}`);
      console.log('');
    });

    if (gianluca.length === 0) {
      console.log('❌ No users found matching Gianluca');
      return;
    }

    // Test with the first matching user
    const testUser = gianluca[0];
    console.log(`🎯 Testing with user: ${testUser.firstName} ${testUser.lastName} (${testUser.id})`);

    // Check if user has any invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method,
        user_id,
        client:invoice_clients(
          name,
          email,
          user_id
        )
      `)
      .eq('user_id', testUser.id);

    if (invoiceError) {
      console.error('❌ Error fetching invoices:', invoiceError);
    } else {
      console.log(`📄 Found ${invoices.length} invoices for Gianluca:`);
      invoices.forEach(invoice => {
        console.log(`  - ${invoice.smartbill_id} (${invoice.payment_method || 'fiscal'})`);
        console.log(`    Client: ${invoice.client.name} (${invoice.client.email})`);
        console.log(`    User ID: ${invoice.user_id || 'N/A'}`);
        console.log('');
      });
    }

    // Check if user has any proforma invoices
    const { data: proformaInvoices, error: proformaError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method,
        user_id
      `)
      .eq('user_id', testUser.id)
      .eq('payment_method', 'proforma');

    if (proformaError) {
      console.error('❌ Error fetching proforma invoices:', proformaError);
    } else {
      console.log(`💳 Found ${proformaInvoices.length} proforma invoices for Gianluca:`);
      proformaInvoices.forEach(invoice => {
        console.log(`  - ${invoice.smartbill_id}`);
      });
    }

    // Check for legacy invoices by email
    console.log('\n🔍 Checking for legacy invoices by email...');
    const { data: legacyInvoices, error: legacyError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method,
        client:invoice_clients(
          name,
          email,
          user_id
        )
      `)
      .eq('client.email', testUser.email);

    if (legacyError) {
      console.error('❌ Error fetching legacy invoices:', legacyError);
    } else {
      console.log(`📄 Found ${legacyInvoices.length} legacy invoices for Gianluca's email:`);
      legacyInvoices.forEach(invoice => {
        console.log(`  - ${invoice.smartbill_id} (${invoice.payment_method || 'fiscal'})`);
        console.log(`    Client: ${invoice.client?.[0]?.name || 'N/A'} (${invoice.client?.[0]?.email || 'N/A'})`);
        console.log(`    User ID: ${invoice.client?.[0]?.user_id || 'N/A'}`);
        console.log('');
      });
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGianlucaBilling();
