const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBackupTables() {
  console.log('🔍 Checking backup tables...');
  
  try {
    // Check what backup tables exist
    console.log('📋 Checking for backup tables...');
    
    // Try to access different backup tables
    const backupTables = [
      'invoice_clients_backup',
      'invoices_backup',
      'users_backup',
      'companies_backup'
    ];

    for (const tableName of backupTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: Found ${data.length} records`);
          if (data.length > 0) {
            console.log(`   Structure: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName}: Table does not exist`);
      }
    }

    // Check the structure of invoice_clients_backup in detail
    console.log('\n📊 Detailed invoice_clients_backup structure:');
    const { data: backupClients, error: backupError } = await supabase
      .from('invoice_clients_backup')
      .select('*')
      .limit(5);

    if (backupError) {
      console.error('❌ Error accessing invoice_clients_backup:', backupError);
    } else {
      console.log(`✅ Found ${backupClients.length} backup client records`);
      
      if (backupClients.length > 0) {
        const sample = backupClients[0];
        console.log('📋 Sample record structure:');
        Object.entries(sample).forEach(([key, value]) => {
          console.log(`   - ${key}: ${typeof value} (${value})`);
        });
      }
    }

    // Check if there's an invoices_backup table
    console.log('\n📊 Checking invoices_backup table:');
    const { data: backupInvoices, error: invoicesError } = await supabase
      .from('invoices_backup')
      .select('*')
      .limit(5);

    if (invoicesError) {
      console.error('❌ Error accessing invoices_backup:', invoicesError);
    } else {
      console.log(`✅ Found ${backupInvoices.length} backup invoice records`);
      
      if (backupInvoices.length > 0) {
        const sample = backupInvoices[0];
        console.log('📋 Sample invoice record structure:');
        Object.entries(sample).forEach(([key, value]) => {
          console.log(`   - ${key}: ${typeof value} (${value})`);
        });
      }
    }

    // Try to find a way to map backup clients to current invoices
    console.log('\n🔍 Looking for mapping strategy...');
    
    // Check if backup clients have any identifying information
    if (backupClients && backupClients.length > 0) {
      const sampleClient = backupClients[0];
      console.log('📋 Backup client sample:');
      console.log(`   - Invoice ID: ${sampleClient.invoice_id}`);
      console.log(`   - Name: ${sampleClient.name}`);
      console.log(`   - Email: ${sampleClient.email}`);
      
      // Check if the invoice_id in backup matches any pattern in current invoices
      console.log('\n🔍 Checking if backup invoice_id matches current invoices...');
      
      // Get a few current invoices to compare
      const { data: currentInvoices, error: currentError } = await supabase
        .from('invoices')
        .select('id, smartbill_id')
        .limit(5);

      if (currentError) {
        console.error('❌ Error fetching current invoices:', currentError);
      } else {
        console.log('📋 Current invoice sample:');
        currentInvoices.forEach((invoice, index) => {
          console.log(`   ${index + 1}. ID: ${invoice.id}, SmartBill ID: ${invoice.smartbill_id}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkBackupTables(); 