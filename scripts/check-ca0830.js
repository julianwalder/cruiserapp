require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCA0830() {
  try {
    console.log('🔍 Checking invoice CA0830...\n');

    // 1. Find the invoice
    console.log('1. Finding invoice CA0830...');
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        issue_date,
        total_amount,
        currency,
        status
      `)
      .eq('smartbill_id', 'CA0830')
      .single();

    if (invoiceError) {
      console.error('❌ Error finding invoice CA0830:', invoiceError);
      return;
    }

    if (!invoice) {
      console.log('❌ Invoice CA0830 not found');
      return;
    }

    console.log(`✅ Found invoice CA0830:`);
    console.log(`   - ID: ${invoice.id}`);
    console.log(`   - Status: ${invoice.status}`);
    console.log(`   - Amount: ${invoice.total_amount} ${invoice.currency}`);
    console.log(`   - Date: ${invoice.issue_date}\n`);

    // 2. Check invoice client details
    console.log('2. Checking invoice client details...');
    const { data: clients, error: clientError } = await supabase
      .from('invoice_clients')
      .select(`
        invoice_id,
        user_id,
        name,
        email,
        phone,
        vat_code
      `)
      .eq('invoice_id', invoice.id);

    if (clientError) {
      console.error('❌ Error finding invoice client:', clientError);
      return;
    }

    if (clientError) {
      console.error('❌ Error finding invoice client:', clientError);
      return;
    }

    if (!clients || clients.length === 0) {
      console.log('❌ No client records found for invoice CA0830');
      console.log('   This means the invoice was imported without client data or the client record was deleted.\n');
    } else {
      console.log(`✅ Found ${clients.length} client record(s):`);
      clients.forEach((client, index) => {
        console.log(`   Client ${index + 1}:`);
        console.log(`     - Name: ${client.name}`);
        console.log(`     - Email: ${client.email}`);
        console.log(`     - User ID: ${client.user_id || 'NOT LINKED'}`);
        console.log(`     - Phone: ${client.phone || 'N/A'}`);
        console.log(`     - VAT Code: ${client.vat_code || 'N/A'}`);
      });
      console.log('');
    }

    // 3. Check if linked to Tzon (only if there are clients)
    if (clients && clients.length > 0) {
      const client = clients[0]; // Use first client
      if (client.user_id) {
        console.log('3. Checking linked user...');
        const { data: linkedUser, error: userError } = await supabase
          .from('users')
          .select('id, email, firstName, lastName')
          .eq('id', client.user_id)
          .single();

        if (userError) {
          console.error('❌ Error finding linked user:', userError);
        } else if (linkedUser) {
          console.log(`✅ Linked to user: ${linkedUser.firstName} ${linkedUser.lastName} (${linkedUser.email})`);
        }
      } else {
        console.log('3. ❌ Invoice is not linked to any user');
      }
    } else {
      console.log('3. ❌ Cannot check user link - no client record exists');
    }

    // 4. Check invoice items for hour packages
    console.log('\n4. Checking invoice items...');
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        line_id,
        name,
        description,
        quantity,
        unit,
        unit_price,
        total_amount
      `)
      .eq('invoice_id', invoice.id);

    if (itemsError) {
      console.error('❌ Error finding invoice items:', itemsError);
      return;
    }

    console.log(`✅ Found ${items?.length || 0} invoice items:`);
    if (items && items.length > 0) {
      items.forEach(item => {
        const isHourPackage = item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H';
        const hourIndicator = isHourPackage ? ' 🕐 HOUR PACKAGE' : '';
        console.log(`   - ${item.name}: ${item.quantity} ${item.unit} (${item.total_amount} ${invoice.currency})${hourIndicator}`);
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkCA0830(); 