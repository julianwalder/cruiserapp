const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreInvoiceClients() {
  console.log('🔧 Restoring invoice clients from backup...');
  
  try {
    // First, let's get all backup clients with their invoice information
    console.log('📊 Fetching backup clients...');
    const { data: backupClients, error: backupError } = await supabase
      .from('invoice_clients_backup')
      .select(`
        *,
        invoices_backup!inner (
          smartbill_id
        )
      `);

    if (backupError) {
      console.error('❌ Error fetching backup clients:', backupError);
      return;
    }

    console.log(`✅ Found ${backupClients.length} backup client records`);

    // Get all current invoices
    console.log('📊 Fetching current invoices...');
    const { data: currentInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (invoicesError) {
      console.error('❌ Error fetching current invoices:', invoicesError);
      return;
    }

    console.log(`✅ Found ${currentInvoices.length} current invoices`);

    // Create a map of smartbill_id to current invoice UUID
    const smartbillToUUID = new Map();
    currentInvoices.forEach(invoice => {
      smartbillToUUID.set(invoice.smartbill_id, invoice.id);
    });

    console.log(`📋 Created mapping for ${smartbillToUUID.size} SmartBill IDs`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each backup client
    for (const backupClient of backupClients) {
      try {
        const smartbillId = backupClient.invoices_backup?.smartbill_id;
        
        if (!smartbillId) {
          console.log(`   ⚠️  No SmartBill ID found for backup client ${backupClient.id}`);
          skippedCount++;
          continue;
        }

        const currentInvoiceId = smartbillToUUID.get(smartbillId);
        
        if (!currentInvoiceId) {
          console.log(`   ⚠️  No current invoice found for SmartBill ID ${smartbillId}`);
          skippedCount++;
          continue;
        }

        console.log(`📝 Processing ${smartbillId} -> ${backupClient.name}`);

        // Check if client record already exists for this invoice
        const { data: existingClient } = await supabase
          .from('invoice_clients')
          .select('id')
          .eq('invoice_id', currentInvoiceId)
          .limit(1);

        if (existingClient && existingClient.length > 0) {
          console.log(`   ⏭️  Client record already exists for ${smartbillId}`);
          skippedCount++;
          continue;
        }

        // Insert the client record with the new invoice UUID
        const { error: insertError } = await supabase
          .from('invoice_clients')
          .insert({
            invoice_id: currentInvoiceId,
            name: backupClient.name,
            email: backupClient.email,
            phone: backupClient.phone,
            vat_code: backupClient.vat_code,
            address: backupClient.address,
            city: backupClient.city,
            country: backupClient.country,
            user_id: backupClient.user_id || '00000000-0000-0000-0000-000000000000', // Use dummy UUID if null
            company_id: backupClient.company_id
          });

        if (insertError) {
          console.error(`   ❌ Error inserting client for ${smartbillId}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Restored client: ${backupClient.name} (${backupClient.email || 'no email'})`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing backup client ${backupClient.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} clients`);
    console.log(`   ❌ Errors: ${errorCount} clients`);
    console.log(`   ⏭️  Skipped: ${skippedCount} clients`);
    console.log(`   📝 Total processed: ${successCount + errorCount + skippedCount} clients`);

    // Verify the results
    console.log('\n🔍 Verifying results...');
    const { data: clientCount, error: countError } = await supabase
      .from('invoice_clients')
      .select('id');

    if (countError) {
      console.error('❌ Error counting clients:', countError);
    } else {
      console.log(`✅ Total invoice clients in database: ${clientCount.length}`);
    }

    // Test the API endpoint
    console.log('\n🔍 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      const firstInvoice = data.invoices?.[0];
      if (firstInvoice && firstInvoice.client && Object.keys(firstInvoice.client).length > 0) {
        console.log('✅ API endpoint now returns client data correctly');
        console.log(`   Sample client: ${firstInvoice.client.name} (${firstInvoice.client.email || 'no email'})`);
      } else {
        console.log('❌ API endpoint still not returning client data');
      }
    } else {
      console.log('❌ API endpoint not responding');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
restoreInvoiceClients(); 