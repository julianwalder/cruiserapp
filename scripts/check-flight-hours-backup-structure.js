const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFlightHoursBackupStructure() {
  console.log('🔍 Checking flight_hours_backup table structure...');
  
  try {
    // Get sample records from flight_hours_backup
    const { data: backupFlightHours, error: backupFlightHoursError } = await supabase
      .from('flight_hours_backup')
      .select('*')
      .limit(5);

    if (backupFlightHoursError) {
      console.error('❌ Error fetching flight_hours_backup:', backupFlightHoursError);
      return;
    }

    console.log('📋 flight_hours_backup table structure:');
    if (backupFlightHours && backupFlightHours.length > 0) {
      console.log('Available columns:');
      Object.keys(backupFlightHours[0]).forEach(column => {
        console.log(`   - ${column}`);
      });

      console.log('\n📊 Sample records:');
      backupFlightHours.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`   ${key}: ${value || 'NULL'}`);
        });
      });
    }

    // Check if there's an invoice_item_id column in the backup
    if (backupFlightHours && backupFlightHours.length > 0) {
      const hasInvoiceItemId = 'invoice_item_id' in backupFlightHours[0];
      console.log(`\n🔍 Has invoice_item_id column: ${hasInvoiceItemId}`);
      
      if (hasInvoiceItemId) {
        console.log('\n📊 invoice_item_id values in backup:');
        const { data: allBackupFlightHours } = await supabase
          .from('flight_hours_backup')
          .select('invoice_item_id, invoice_id')
          .limit(20);
        
        allBackupFlightHours?.forEach((record, index) => {
          console.log(`   ${index + 1}. invoice_id: ${record.invoice_id}, invoice_item_id: ${record.invoice_item_id || 'NULL'}`);
        });
      }
    }

    // Check invoice_items_backup structure
    console.log('\n🔍 Checking invoice_items_backup structure...');
    const { data: backupInvoiceItems, error: backupInvoiceItemsError } = await supabase
      .from('invoice_items_backup')
      .select('*')
      .limit(3);

    if (backupInvoiceItemsError) {
      console.error('❌ Error fetching invoice_items_backup:', backupInvoiceItemsError);
    } else {
      console.log('📋 invoice_items_backup table structure:');
      if (backupInvoiceItems && backupInvoiceItems.length > 0) {
        console.log('Available columns:');
        Object.keys(backupInvoiceItems[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample invoice items:');
        backupInvoiceItems.forEach((item, index) => {
          console.log(`\nItem ${index + 1}:`);
          Object.entries(item).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'NULL'}`);
          });
        });
      }
    }

    // Check current invoice_items structure
    console.log('\n🔍 Checking current invoice_items structure...');
    const { data: currentInvoiceItems, error: currentInvoiceItemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .limit(3);

    if (currentInvoiceItemsError) {
      console.error('❌ Error fetching current invoice_items:', currentInvoiceItemsError);
    } else {
      console.log('📋 Current invoice_items table structure:');
      if (currentInvoiceItems && currentInvoiceItems.length > 0) {
        console.log('Available columns:');
        Object.keys(currentInvoiceItems[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample current invoice items:');
        currentInvoiceItems.forEach((item, index) => {
          console.log(`\nItem ${index + 1}:`);
          Object.entries(item).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'NULL'}`);
          });
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkFlightHoursBackupStructure(); 