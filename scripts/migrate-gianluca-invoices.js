const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateGianlucaInvoices() {
  try {
    console.log('🔧 Migrating Gianluca\'s legacy invoices...\n');

    // Gianluca's user ID and email
    const gianlucaUserId = '057919c3-97d5-436b-b72b-dd73681cfcd1';
    const gianlucaEmail = 'giandipinto@gmail.com';

    // First, let's see how many invoices exist for Gianluca's email
    const { data: allInvoices, error: allInvoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        smartbill_id,
        payment_method,
        client:invoice_clients(
          id,
          name,
          email,
          user_id
        )
      `)
      .eq('client.email', gianlucaEmail);

    if (allInvoicesError) {
      console.error('❌ Error fetching all invoices:', allInvoicesError);
      return;
    }

    console.log(`📄 Found ${allInvoices.length} invoices with Gianluca's email:`);
    
    // Count how many need to be updated
    const needsUpdate = allInvoices.filter(invoice => 
      !invoice.client?.[0]?.user_id || invoice.client?.[0]?.user_id !== gianlucaUserId
    );
    
    console.log(`🔧 ${needsUpdate.length} invoices need to be linked to Gianluca's user ID`);

    if (needsUpdate.length > 0) {
      console.log('\n🔍 Checking invoice_clients table structure...');
      
      // First, let's see what's in the invoice_clients table for Gianluca's email
      const { data: clientRecords, error: clientError } = await supabase
        .from('invoice_clients')
        .select('*')
        .eq('email', gianlucaEmail)
        .limit(5);

      if (clientError) {
        console.error('❌ Error fetching client records:', clientError);
        return;
      }

      console.log(`📋 Found ${clientRecords.length} client records for Gianluca's email:`);
      clientRecords.forEach(record => {
        console.log(`  - ID: ${record.id}, User ID: ${record.user_id || 'NULL'}, Email: ${record.email}`);
      });

      // Update invoice_clients table to link Gianluca's invoices by email
      const { data: updateResult, error: updateError } = await supabase
        .from('invoice_clients')
        .update({ user_id: gianlucaUserId })
        .eq('email', gianlucaEmail)
        .is('user_id', null);

      if (updateError) {
        console.error('❌ Error updating invoice_clients:', updateError);
        return;
      }

      console.log(`✅ Updated ${updateResult?.length || 0} invoice client records`);

      // Now let's create missing client records for invoices that don't have them
      console.log('\n🔧 Creating missing client records...');
      
      const { data: invoicesWithoutClients, error: missingError } = await supabase
        .from('invoices')
        .select(`
          id,
          smartbill_id,
          payment_method
        `)
        .eq('client.email', gianlucaEmail)
        .not('client.id', 'is', null);

      if (missingError) {
        console.error('❌ Error fetching invoices without clients:', missingError);
        return;
      }

      console.log(`📄 Found ${invoicesWithoutClients.length} invoices that need client records`);

      // Create client records for invoices that don't have them
      const clientRecordsToCreate = invoicesWithoutClients.map(invoice => ({
        invoice_id: invoice.id,
        name: 'Gianluca Di Pinto',
        email: gianlucaEmail,
        user_id: gianlucaUserId
      }));

      if (clientRecordsToCreate.length > 0) {
        const { data: createdRecords, error: createError } = await supabase
          .from('invoice_clients')
          .insert(clientRecordsToCreate);

        if (createError) {
          console.error('❌ Error creating client records:', createError);
        } else {
          console.log(`✅ Created ${createdRecords?.length || 0} client records`);
        }
      }
    }

    // Show the final results
    const { data: results, error: selectError } = await supabase
      .from('invoice_clients')
      .select(`
        id,
        name,
        email,
        user_id,
        invoice:invoices(
          smartbill_id,
          payment_method
        )
      `)
      .eq('email', gianlucaEmail)
      .order('invoice(smartbill_id)');

    if (selectError) {
      console.error('❌ Error fetching results:', selectError);
      return;
    }

    console.log(`\n📄 Final results - ${results.length} invoices for Gianluca:`);
    results.forEach(record => {
      console.log(`  - ${record.invoice.smartbill_id} (${record.invoice.payment_method || 'fiscal'})`);
      console.log(`    Client: ${record.name || 'N/A'} (${record.email})`);
      console.log(`    User ID: ${record.user_id || 'N/A'}`);
      console.log('');
    });

    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateGianlucaInvoices();
