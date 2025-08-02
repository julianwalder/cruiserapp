require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvoiceUserLink() {
  try {
    console.log('🔍 Testing invoice-user link for Tzon...\n');

    // 1. Find Tzon user
    console.log('1. Finding Tzon user...');
    const { data: tzonUser, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .or('firstName.ilike.%Tzon%,lastName.ilike.%Tzon%')
      .limit(5);

    if (userError) {
      console.error('❌ Error finding Tzon user:', userError);
      return;
    }

    if (!tzonUser || tzonUser.length === 0) {
      console.log('❌ No user found with "Tzon" in name');
      return;
    }

    console.log('✅ Found users:', tzonUser.map(u => `${u.firstName} ${u.lastName} (${u.email})`));
    const user = tzonUser[0];
    console.log(`📋 Using user: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}\n`);

    // 2. Check invoices linked to this user
    console.log('2. Checking invoices linked to this user...');
    const { data: linkedInvoices, error: invoiceError } = await supabase
      .from('invoice_clients')
      .select(`
        invoice_id,
        user_id,
        name,
        email,
        invoices (
          id,
          smartbill_id,
          issue_date,
          total_amount,
          currency,
          status
        )
      `)
      .eq('user_id', user.id);

    if (invoiceError) {
      console.error('❌ Error fetching linked invoices:', invoiceError);
      return;
    }

    console.log(`✅ Found ${linkedInvoices?.length || 0} invoices linked to user`);
    if (linkedInvoices && linkedInvoices.length > 0) {
      linkedInvoices.forEach(invoice => {
        console.log(`   - Invoice ${invoice.invoices?.smartbill_id}: ${invoice.invoices?.total_amount} ${invoice.invoices?.currency} (${invoice.invoices?.status})`);
      });
    }

    // 3. Check all invoices for this user's email
    console.log('\n3. Checking all invoices for user email...');
    const { data: emailInvoices, error: emailError } = await supabase
      .from('invoice_clients')
      .select(`
        invoice_id,
        user_id,
        name,
        email,
        invoices (
          id,
          smartbill_id,
          issue_date,
          total_amount,
          currency,
          status
        )
      `)
      .eq('email', user.email);

    if (emailError) {
      console.error('❌ Error fetching email invoices:', emailError);
      return;
    }

    console.log(`✅ Found ${emailInvoices?.length || 0} invoices with user email`);
    if (emailInvoices && emailInvoices.length > 0) {
      emailInvoices.forEach(invoice => {
        const linked = invoice.user_id ? '✅ Linked' : '❌ Not Linked';
        console.log(`   - Invoice ${invoice.invoices?.smartbill_id}: ${linked} (user_id: ${invoice.user_id || 'null'})`);
      });
    }

    // 3b. Check specific invoices CA0822 and CA0830
    console.log('\n3b. Checking specific invoices CA0822 and CA0830...');
    const { data: specificInvoices, error: specificError } = await supabase
      .from('invoice_clients')
      .select(`
        invoice_id,
        user_id,
        name,
        email,
        invoices (
          id,
          smartbill_id,
          issue_date,
          total_amount,
          currency,
          status
        )
      `)
      .in('invoices.smartbill_id', ['CA0822', 'CA0830']);

    if (specificError) {
      console.error('❌ Error fetching specific invoices:', specificError);
    } else {
      console.log(`✅ Found ${specificInvoices?.length || 0} specific invoices`);
      if (specificInvoices && specificInvoices.length > 0) {
        specificInvoices.forEach(invoice => {
          const linked = invoice.user_id ? '✅ Linked' : '❌ Not Linked';
          const isTzon = invoice.user_id === user.id ? ' (Tzon)' : '';
          console.log(`   - Invoice ${invoice.invoices?.smartbill_id}: ${linked} (user_id: ${invoice.user_id || 'null'})${isTzon}`);
        });
      }
    }

    // 4. Check hour packages for this user
    console.log('\n4. Checking hour packages...');
    const { data: hourPackages, error: packageError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        issue_date,
        total_amount,
        currency,
        status,
        invoice_clients!inner (
          user_id,
          email
        ),
        invoice_items (
          line_id,
          name,
          description,
          quantity,
          unit,
          unit_price,
          total_amount
        )
      `)
      .eq('invoice_clients.user_id', user.id)
      .in('status', ['paid', 'imported']);

    if (packageError) {
      console.error('❌ Error fetching hour packages:', packageError);
      return;
    }

    console.log(`✅ Found ${hourPackages?.length || 0} invoices with hour packages`);
    let totalBoughtHours = 0;
    if (hourPackages && hourPackages.length > 0) {
      hourPackages.forEach(invoice => {
        const hourItems = invoice.invoice_items?.filter(item => 
          item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
        ) || [];
        
        hourItems.forEach(item => {
          console.log(`   - ${item.name}: ${item.quantity} hours (${item.total_amount} ${invoice.currency})`);
          totalBoughtHours += item.quantity;
        });
      });
    }

    console.log(`\n📊 Total bought hours for ${user.firstName} ${user.lastName}: ${totalBoughtHours} hours`);

    // 5. Check invoice status and filtering
    console.log('\n5. Checking invoice status and API filtering...');
    const { data: allInvoices, error: allError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        status,
        issue_date,
        total_amount,
        currency
      `)
      .in('smartbill_id', ['CA0822', 'CA0830']);

    if (allError) {
      console.error('❌ Error fetching invoice details:', allError);
    } else if (allInvoices && allInvoices.length > 0) {
      allInvoices.forEach(invoice => {
        console.log(`   - Invoice ${invoice.smartbill_id}: status = "${invoice.status}"`);
        console.log(`   - Would be included in API: ${['paid', 'imported'].includes(invoice.status)}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testInvoiceUserLink(); 