const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllInvoices() {
  try {
    console.log('🔍 Verifying all users and their invoices...\n');

    // Get all users with their invoice counts
    console.log('📋 Fetching all users and their invoices...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        invoices:invoice_clients!user_id(
          invoice:invoices(
            smartbill_id,
            payment_method
          )
        )
      `)
      .eq('status', 'ACTIVE')
      .order('"firstName"');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} active users\n`);

    // Analyze results
    let usersWithInvoices = 0;
    let totalInvoices = 0;
    const usersWithInvoicesList = [];

    users.forEach(user => {
      const invoiceCount = user.invoices?.length || 0;
      if (invoiceCount > 0) {
        usersWithInvoices++;
        totalInvoices += invoiceCount;
        usersWithInvoicesList.push({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          count: invoiceCount,
          invoices: user.invoices?.map(ic => ic.invoice.smartbill_id) || []
        });
      }
    });

    console.log(`📊 Summary:`);
    console.log(`  - Total active users: ${users.length}`);
    console.log(`  - Users with invoices: ${usersWithInvoices}`);
    console.log(`  - Total invoices: ${totalInvoices}`);
    console.log(`  - Average invoices per user: ${usersWithInvoices > 0 ? (totalInvoices / usersWithInvoices).toFixed(1) : 0}`);

    if (usersWithInvoicesList.length > 0) {
      console.log('\n👥 Users with invoices:');
      usersWithInvoicesList
        .sort((a, b) => b.count - a.count) // Sort by invoice count descending
        .forEach(user => {
          console.log(`  - ${user.name} (${user.email}): ${user.count} invoices`);
          if (user.count <= 5) {
            console.log(`    Invoices: ${user.invoices.join(', ')}`);
          } else {
            console.log(`    Invoices: ${user.invoices.slice(0, 3).join(', ')}... and ${user.count - 3} more`);
          }
        });
    }

    // Check for any unlinked invoices
    console.log('\n🔍 Checking for any unlinked invoices...');
    const { data: unlinkedInvoices, error: unlinkedError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        email,
        user_id,
        invoice:invoices(
          smartbill_id,
          payment_method
        )
      `)
      .is('user_id', null);

    if (unlinkedError) {
      console.error('❌ Error checking unlinked invoices:', unlinkedError);
    } else {
      console.log(`📄 Unlinked invoices: ${unlinkedInvoices.length}`);
      if (unlinkedInvoices.length > 0) {
        console.log('  Unlinked invoices:');
        unlinkedInvoices.forEach(invoice => {
          console.log(`    - ${invoice.invoice.smartbill_id} (${invoice.email || 'No email'})`);
        });
      }
    }

    // Check for invoices without client records
    console.log('\n🔍 Checking for invoices without client records...');
    const { data: invoicesWithoutClients, error: noClientError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method
      `)
      .not('client.id', 'is', null);

    if (noClientError) {
      console.error('❌ Error checking invoices without clients:', noClientError);
    } else {
      console.log(`📄 Invoices without client records: ${invoicesWithoutClients.length}`);
    }

    console.log('\n✅ Verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyAllInvoices();
