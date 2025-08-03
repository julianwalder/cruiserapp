const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreInvoiceItemsComplete() {
  console.log('🔧 Restoring invoice_items table with proper foreign key relationships...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupItems, error: backupItemsError } = await supabase
      .from('invoice_items_backup')
      .select('*');

    if (backupItemsError) {
      console.error('❌ Error fetching backup items:', backupItemsError);
      return;
    }

    const { data: backupInvoices, error: backupInvoicesError } = await supabase
      .from('invoices_backup')
      .select('id, smartbill_id');

    if (backupInvoicesError) {
      console.error('❌ Error fetching backup invoices:', backupInvoicesError);
      return;
    }

    const { data: currentInvoices, error: currentInvoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (currentInvoicesError) {
      console.error('❌ Error fetching current invoices:', currentInvoicesError);
      return;
    }

    console.log(`✅ Found ${backupItems.length} backup items`);
    console.log(`✅ Found ${backupInvoices.length} backup invoices`);
    console.log(`✅ Found ${currentInvoices.length} current invoices`);

    // Step 2: Create mapping from backup invoice ID to SmartBill ID
    console.log('📊 Step 2: Creating invoice ID mappings...');
    
    const backupInvoiceToSmartBill = new Map();
    backupInvoices.forEach(invoice => {
      backupInvoiceToSmartBill.set(invoice.id, invoice.smartbill_id);
    });

    const smartbillToCurrentUUID = new Map();
    currentInvoices.forEach(invoice => {
      smartbillToCurrentUUID.set(invoice.smartbill_id, invoice.id);
    });

    // Step 3: Process each backup item
    console.log('📊 Step 3: Processing backup items...');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const backupItem of backupItems) {
      try {
        // Get the SmartBill ID for this backup item's invoice
        const smartbillId = backupInvoiceToSmartBill.get(backupItem.invoice_id);
        
        if (!smartbillId) {
          console.log(`   ⚠️  No SmartBill ID found for backup invoice ${backupItem.invoice_id}`);
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

        console.log(`📝 Processing ${smartbillId} -> ${backupItem.name || backupItem.description || 'Unnamed item'}`);

        // Check if item record already exists for this invoice and line_id
        const { data: existingItem } = await supabase
          .from('invoice_items')
          .select('id')
          .eq('invoice_id', currentInvoiceId)
          .eq('line_id', backupItem.line_id)
          .limit(1);

        if (existingItem && existingItem.length > 0) {
          console.log(`   ⏭️  Item record already exists for ${smartbillId} line ${backupItem.line_id}`);
          skippedCount++;
          continue;
        }

        // Insert the item record with the new invoice UUID
        const { error: insertError } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: currentInvoiceId,
            line_id: backupItem.line_id,
            name: backupItem.name,
            description: backupItem.description,
            quantity: backupItem.quantity,
            unit: backupItem.unit,
            unit_price: backupItem.unit_price,
            total_amount: backupItem.total_amount,
            vat_rate: backupItem.vat_rate,
            vat_amount: backupItem.vat_amount,
            discount_rate: backupItem.discount_rate,
            discount_amount: backupItem.discount_amount
          });

        if (insertError) {
          console.error(`   ❌ Error inserting item for ${smartbillId}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Restored item: ${backupItem.name || backupItem.description || 'Unnamed item'} (Line ${backupItem.line_id})`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing backup item ${backupItem.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} items`);
    console.log(`   ❌ Errors: ${errorCount} items`);
    console.log(`   ⏭️  Skipped: ${skippedCount} items`);
    console.log(`   📝 Total processed: ${successCount + errorCount + skippedCount} items`);

    // Step 4: Verify the results
    console.log('\n🔍 Step 4: Verifying results...');
    const { data: itemCount, error: countError } = await supabase
      .from('invoice_items')
      .select('id');

    if (countError) {
      console.error('❌ Error counting items:', countError);
    } else {
      console.log(`✅ Total invoice items in database: ${itemCount.length}`);
    }

    // Step 5: Test the API endpoint
    console.log('\n🔍 Step 5: Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      const firstInvoice = data.invoices?.[0];
      if (firstInvoice && firstInvoice.items && firstInvoice.items.length > 0) {
        console.log('✅ API endpoint now returns item data correctly');
        console.log(`   Sample invoice has ${firstInvoice.items.length} items`);
        console.log(`   Sample item: ${firstInvoice.items[0].name} (${firstInvoice.items[0].quantity} x ${firstInvoice.items[0].unit_price})`);
      } else {
        console.log('❌ API endpoint still not returning item data');
      }
    } else {
      console.log('❌ API endpoint not responding');
    }

    // Step 6: Show some statistics
    console.log('\n📊 Step 6: Item statistics...');
    const { data: itemStats, error: statsError } = await supabase
      .from('invoice_items')
      .select('invoice_id, total_amount');

    if (!statsError && itemStats) {
      const totalValue = itemStats.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      const uniqueInvoices = new Set(itemStats.map(item => item.invoice_id)).size;
      console.log(`   💰 Total value of all items: ${totalValue.toFixed(2)}`);
      console.log(`   📄 Items across ${uniqueInvoices} unique invoices`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
restoreInvoiceItemsComplete(); 