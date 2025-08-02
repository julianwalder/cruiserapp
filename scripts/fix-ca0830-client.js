require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCA0830Client() {
  try {
    console.log('🔧 Fixing invoice CA0830 client record...\n');

    // 1. Find Tzon user
    console.log('1. Finding Tzon user...');
    const { data: tzonUser, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .or('firstName.ilike.%Tzon%,lastName.ilike.%Tzon%')
      .limit(1);

    if (userError || !tzonUser || tzonUser.length === 0) {
      console.error('❌ Error finding Tzon user:', userError);
      return;
    }

    const user = tzonUser[0];
    console.log(`✅ Found Tzon: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}\n`);

    // 2. Find invoice CA0830
    console.log('2. Finding invoice CA0830...');
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, smartbill_id, issue_date, total_amount, currency')
      .eq('smartbill_id', 'CA0830')
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Error finding invoice CA0830:', invoiceError);
      return;
    }

    console.log(`✅ Found invoice: ${invoice.smartbill_id} - ${invoice.total_amount} ${invoice.currency}\n`);

    // 3. Create client record for CA0830
    console.log('3. Creating client record for CA0830...');
    const { data: newClient, error: createError } = await supabase
      .from('invoice_clients')
      .insert({
        invoice_id: invoice.id,
        user_id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: null,
        vat_code: null,
        address: null,
        city: null,
        country: null
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating client record:', createError);
      return;
    }

    console.log(`✅ Created client record:`);
    console.log(`   - Invoice ID: ${newClient.invoice_id}`);
    console.log(`   - User ID: ${newClient.user_id}`);
    console.log(`   - Name: ${newClient.name}`);
    console.log(`   - Email: ${newClient.email}\n`);

    // 4. Verify the fix
    console.log('4. Verifying the fix...');
    const { data: verifyClient, error: verifyError } = await supabase
      .from('invoice_clients')
      .select(`
        invoice_id,
        user_id,
        name,
        email,
        invoices (
          smartbill_id,
          total_amount,
          currency
        )
      `)
      .eq('invoice_id', invoice.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying client record:', verifyError);
      return;
    }

    console.log(`✅ Verification successful:`);
    console.log(`   - Invoice: ${verifyClient.invoices.smartbill_id}`);
    console.log(`   - Linked to: ${verifyClient.name} (${verifyClient.email})`);
    console.log(`   - User ID: ${verifyClient.user_id}`);

    // 5. Check total hours for Tzon
    console.log('\n5. Checking total hours for Tzon...');
    const { data: tzonInvoices, error: tzonError } = await supabase
      .from('invoices')
      .select(`
        smartbill_id,
        invoice_clients!inner (
          user_id
        ),
        invoice_items (
          quantity,
          unit
        )
      `)
      .eq('invoice_clients.user_id', user.id)
      .in('status', ['paid', 'imported']);

    if (tzonError) {
      console.error('❌ Error checking Tzon invoices:', tzonError);
      return;
    }

    let totalHours = 0;
    console.log(`✅ Tzon's invoices:`);
    tzonInvoices?.forEach(invoice => {
      const hourItems = invoice.invoice_items?.filter(item => 
        item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
      ) || [];
      
      hourItems.forEach(item => {
        console.log(`   - ${invoice.smartbill_id}: ${item.quantity} hours`);
        totalHours += item.quantity;
      });
    });

    console.log(`\n📊 Total bought hours for Tzon: ${totalHours} hours`);

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Run the fix
fixCA0830Client(); 