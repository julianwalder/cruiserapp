require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testClientHoursAPI() {
  try {
    console.log('🔍 Testing Client Hours API for Tzon...\n');

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
    console.log(`📋 Using user: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${user.id}\n`);

    // 2. Simulate the client hours API logic
    console.log('2. Simulating Client Hours API logic...');
    
    // Fetch invoices with user_id linked to Tzon
    const { data: userInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        issue_date,
        total_amount,
        currency,
        status,
        invoice_clients!inner (
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
        )
      `)
      .eq('invoice_clients.user_id', user.id)
      .in('status', ['paid', 'imported'])
      .order('issue_date', { ascending: false });

    if (invoiceError) {
      console.error('❌ Error fetching user invoices:', invoiceError);
      return;
    }

    console.log(`✅ Found ${userInvoices?.length || 0} invoices linked to user`);
    
    // Process invoices like the API does
    const clientMap = new Map();
    const clientPackages = new Map();
    
    for (const invoice of userInvoices || []) {
      const client = invoice.invoice_clients?.[0];
      if (!client || !client.email) continue;
      
      const clientId = client.email;
      console.log(`   Processing invoice ${invoice.smartbill_id} for client ${clientId}`);
      
      // Create client data
      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          id: clientId,
          name: `${user.firstName} ${user.lastName}`,
          email: client.email,
          vatCode: client.vat_code,
          user_id: client.user_id,
          company: null
        });
        console.log(`   ➕ Created client entry: ${clientId}`);
      }
      
      // Extract hour packages
      const hourItems = invoice.invoice_items?.filter(item => 
        item.unit === 'HUR' || item.unit === 'HOUR' || item.unit === 'H'
      ) || [];
      
      hourItems.forEach(item => {
        const packageData = {
          id: `${invoice.id}-${item.name}`,
          clientId: clientId,
          invoiceId: invoice.smartbill_id,
          totalHours: item.quantity,
          usedHours: 0,
          remainingHours: item.quantity,
          purchaseDate: invoice.issue_date,
          status: 'active',
          price: item.total_amount,
          currency: invoice.currency
        };
        
        if (!clientPackages.has(clientId)) {
          clientPackages.set(clientId, []);
        }
        clientPackages.get(clientId).push(packageData);
        console.log(`   ➕ Added package: ${item.name} - ${item.quantity} hours`);
      });
    }
    
    // 3. Show results
    console.log('\n3. Results:');
    console.log(`   Clients found: ${clientMap.size}`);
    console.log(`   Packages found: ${Array.from(clientPackages.values()).flat().length}`);
    
    clientMap.forEach((client, email) => {
      console.log(`   Client: ${client.name} (${email})`);
      const packages = clientPackages.get(email) || [];
      console.log(`     Packages: ${packages.length}`);
      packages.forEach(pkg => {
        console.log(`       - ${pkg.invoiceId}: ${pkg.totalHours} hours (${pkg.price} ${pkg.currency})`);
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testClientHoursAPI(); 