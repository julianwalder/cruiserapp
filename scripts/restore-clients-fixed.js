const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to check if a string is a valid UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

async function restoreClientsFixed() {
  console.log('🔧 Restoring invoice clients (fixed version)...');
  
  try {
    // Get all backup clients
    console.log('📊 Fetching backup clients...');
    const { data: backupClients, error: backupError } = await supabase
      .from('invoice_clients_backup')
      .select('*');

    if (backupError) {
      console.error('❌ Error fetching backup clients:', backupError);
      return;
    }

    console.log(`✅ Found ${backupClients.length} backup client records`);

    // Get all backup invoices to create a mapping
    console.log('📊 Fetching backup invoices...');
    const { data: backupInvoices, error: backupInvoicesError } = await supabase
      .from('invoices_backup')
      .select('id, smartbill_id');

    if (backupInvoicesError) {
      console.error('❌ Error fetching backup invoices:', backupInvoicesError);
      return;
    }

    console.log(`✅ Found ${backupInvoices.length} backup invoice records`);

    // Create a map of backup invoice ID to SmartBill ID
    const backupInvoiceToSmartBill = new Map();
    backupInvoices.forEach(invoice => {
      backupInvoiceToSmartBill.set(invoice.id, invoice.smartbill_id);
    });

    // Get all current invoices
    console.log('📊 Fetching current invoices...');
    const { data: currentInvoices, error: currentInvoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (currentInvoicesError) {
      console.error('❌ Error fetching current invoices:', currentInvoicesError);
      return;
    }

    console.log(`✅ Found ${currentInvoices.length} current invoice records`);

    // Create a map of SmartBill ID to current invoice UUID
    const smartbillToCurrentUUID = new Map();
    currentInvoices.forEach(invoice => {
      smartbillToCurrentUUID.set(invoice.smartbill_id, invoice.id);
    });

    console.log(`📋 Created mapping for ${smartbillToCurrentUUID.size} SmartBill IDs`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each backup client
    for (const backupClient of backupClients) {
      try {
        // Get the SmartBill ID for this backup client's invoice
        const smartbillId = backupInvoiceToSmartBill.get(backupClient.invoice_id);
        
        if (!smartbillId) {
          console.log(`   ⚠️  No SmartBill ID found for backup invoice ${backupClient.invoice_id}`);
          skippedCount++;
          continue;
        }

        // Get the current invoice UUID for this SmartBill ID
        const currentInvoiceId = smartbillToCurrentUUID.get(smartbillId);
        
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

        // Fix the user_id - if it's not a valid UUID, set it to null
        let fixedUserId = null;
        if (backupClient.user_id && isValidUUID(backupClient.user_id)) {
          fixedUserId = backupClient.user_id;
        } else if (backupClient.user_id) {
          console.log(`   ⚠️  Invalid user_id format: ${backupClient.user_id}, setting to null`);
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
            user_id: fixedUserId, // Use null if invalid UUID
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
restoreClientsFixed(); 