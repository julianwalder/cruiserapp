const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreFlightHoursWithInvoiceItems() {
  console.log('🔧 Restoring flight_hours table with proper invoice_item_id mapping...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupFlightHours, error: backupFlightHoursError } = await supabase
      .from('flight_hours_backup')
      .select('*');

    if (backupFlightHoursError) {
      console.error('❌ Error fetching flight_hours_backup:', backupFlightHoursError);
      return;
    }

    const { data: backupInvoices, error: backupInvoicesError } = await supabase
      .from('invoices_backup')
      .select('id, smartbill_id');

    if (backupInvoicesError) {
      console.error('❌ Error fetching invoices_backup:', backupInvoicesError);
      return;
    }

    const { data: currentInvoices, error: currentInvoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (currentInvoicesError) {
      console.error('❌ Error fetching current invoices:', currentInvoicesError);
      return;
    }

    const { data: backupInvoiceItems, error: backupInvoiceItemsError } = await supabase
      .from('invoice_items_backup')
      .select('*');

    if (backupInvoiceItemsError) {
      console.error('❌ Error fetching invoice_items_backup:', backupInvoiceItemsError);
      return;
    }

    const { data: currentInvoiceItems, error: currentInvoiceItemsError } = await supabase
      .from('invoice_items')
      .select('*');

    if (currentInvoiceItemsError) {
      console.error('❌ Error fetching current invoice_items:', currentInvoiceItemsError);
      return;
    }

    console.log(`📊 Found ${backupFlightHours.length} backup flight hours records`);
    console.log(`📊 Found ${backupInvoices.length} backup invoices`);
    console.log(`📊 Found ${currentInvoices.length} current invoices`);
    console.log(`📊 Found ${backupInvoiceItems.length} backup invoice items`);
    console.log(`📊 Found ${currentInvoiceItems.length} current invoice items`);

    // Step 2: Create mappings
    console.log('\n🔗 Step 2: Creating mappings...');
    
    // Map backup invoice IDs to current invoice IDs via smartbill_id
    const backupInvoiceToCurrent = new Map();
    backupInvoices.forEach(backupInvoice => {
      const currentInvoice = currentInvoices.find(current => current.smartbill_id === backupInvoice.smartbill_id);
      if (currentInvoice) {
        backupInvoiceToCurrent.set(backupInvoice.id, currentInvoice.id);
      }
    });

    // Map backup invoice item IDs to current invoice item IDs via invoice_id mapping
    const backupItemToCurrent = new Map();
    backupInvoiceItems.forEach(backupItem => {
      const currentInvoiceId = backupInvoiceToCurrent.get(backupItem.invoice_id);
      if (currentInvoiceId) {
        const currentItem = currentInvoiceItems.find(current => 
          current.invoice_id === currentInvoiceId && 
          current.line_id === backupItem.line_id &&
          current.name === backupItem.name
        );
        if (currentItem) {
          backupItemToCurrent.set(backupItem.id, currentItem.id);
        }
      }
    });

    console.log(`🔗 Created ${backupInvoiceToCurrent.size} invoice mappings`);
    console.log(`🔗 Created ${backupItemToCurrent.size} invoice item mappings`);

    // Step 3: Clear existing flight_hours records
    console.log('\n🗑️ Step 3: Clearing existing flight_hours records...');
    const { error: deleteError } = await supabase
      .from('flight_hours')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('❌ Error deleting existing flight_hours:', deleteError);
      return;
    }

    console.log('✅ Cleared existing flight_hours records');

    // Step 4: Restore flight_hours with proper mappings
    console.log('\n🔄 Step 4: Restoring flight_hours with proper mappings...');
    
    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const backupRecord of backupFlightHours) {
      try {
        // Map invoice_id
        const currentInvoiceId = backupInvoiceToCurrent.get(backupRecord.invoice_id);
        if (!currentInvoiceId) {
          console.log(`⚠️ Skipping flight_hours record ${backupRecord.id}: No current invoice mapping for ${backupRecord.invoice_id}`);
          skippedCount++;
          continue;
        }

        // Map invoice_item_id
        const currentItemId = backupItemToCurrent.get(backupRecord.invoice_item_id);
        if (!currentItemId) {
          console.log(`⚠️ Skipping flight_hours record ${backupRecord.id}: No current invoice item mapping for ${backupRecord.invoice_item_id}`);
          skippedCount++;
          continue;
        }

        // Map user_id (using the same logic as before)
        let currentUserId = null;
        if (backupRecord.user_id) {
          // Try to find user by email from invoice_clients
          const { data: invoiceClients } = await supabase
            .from('invoice_clients')
            .select('user_id')
            .eq('invoice_id', currentInvoiceId)
            .limit(1);
          
          if (invoiceClients && invoiceClients.length > 0) {
            currentUserId = invoiceClients[0].user_id;
          }
        }

        // Create the new flight_hours record
        const newFlightHours = {
          invoice_id: currentInvoiceId,
          user_id: currentUserId,
          invoice_item_id: currentItemId, // This is the key fix!
          flight_date: backupRecord.flight_date,
          hours_regular: backupRecord.hours_regular,
          hours_promotional: backupRecord.hours_promotional,
          total_hours: backupRecord.total_hours,
          rate_per_hour: backupRecord.rate_per_hour,
          total_amount: backupRecord.total_amount,
          notes: backupRecord.notes,
          company_id: backupRecord.company_id
        };

        const { error: insertError } = await supabase
          .from('flight_hours')
          .insert(newFlightHours);

        if (insertError) {
          console.error(`❌ Error inserting flight_hours record ${backupRecord.id}:`, insertError);
          errorCount++;
        } else {
          restoredCount++;
          if (restoredCount % 10 === 0) {
            console.log(`✅ Restored ${restoredCount} flight_hours records...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing flight_hours record ${backupRecord.id}:`, error);
        errorCount++;
      }
    }

    // Step 5: Summary
    console.log('\n📊 Step 5: Restoration Summary');
    console.log('================================');
    console.log(`✅ Successfully restored: ${restoredCount} flight_hours records`);
    console.log(`⚠️ Skipped (no mapping): ${skippedCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`📊 Total processed: ${backupFlightHours.length} records`);

    // Verify the restoration
    console.log('\n🔍 Step 6: Verification...');
    const { data: finalFlightHours, error: finalError } = await supabase
      .from('flight_hours')
      .select('*');

    if (finalError) {
      console.error('❌ Error fetching final flight_hours:', finalError);
    } else {
      console.log(`📊 Final flight_hours count: ${finalFlightHours.length}`);
      
      // Check for NULL invoice_item_id
      const nullItemIds = finalFlightHours.filter(record => !record.invoice_item_id);
      console.log(`🔍 Records with NULL invoice_item_id: ${nullItemIds.length}`);
      
      if (nullItemIds.length > 0) {
        console.log('⚠️ Warning: Some records still have NULL invoice_item_id');
        nullItemIds.slice(0, 5).forEach(record => {
          console.log(`   - Record ${record.id}: invoice_id=${record.invoice_id}, user_id=${record.user_id}`);
        });
      } else {
        console.log('✅ All flight_hours records have proper invoice_item_id mapping!');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
restoreFlightHoursWithInvoiceItems(); 