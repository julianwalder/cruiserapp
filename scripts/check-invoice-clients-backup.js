const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInvoiceClientsBackup() {
  console.log('🔍 Checking invoice_clients_backup table...');
  
  try {
    // Check if the backup table exists and has data
    const { data: backupClients, error: backupError } = await supabase
      .from('invoice_clients_backup')
      .select('*')
      .limit(10);

    if (backupError) {
      console.error('❌ Error accessing invoice_clients_backup:', backupError);
      return;
    }

    console.log(`✅ Found ${backupClients.length} records in invoice_clients_backup`);
    
    if (backupClients.length > 0) {
      console.log('📊 Sample backup records:');
      backupClients.forEach((client, index) => {
        console.log(`   ${index + 1}. Invoice ID: ${client.invoice_id}, Name: ${client.name}, Email: ${client.email || 'N/A'}`);
      });

      // Check the structure of the backup table
      console.log('\n📋 Backup table structure:');
      const sampleClient = backupClients[0];
      Object.keys(sampleClient).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleClient[key]} (${sampleClient[key]})`);
      });

      // Check if we can match with current invoices
      console.log('\n🔗 Checking invoice matching...');
      const { data: currentInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, smartbill_id, series, number')
        .limit(5);

      if (invoicesError) {
        console.error('❌ Error fetching current invoices:', invoicesError);
        return;
      }

      console.log(`📊 Current invoices structure:`);
      currentInvoices.forEach((invoice, index) => {
        console.log(`   ${index + 1}. ID: ${invoice.id}, SmartBill ID: ${invoice.smartbill_id}`);
      });

      // Check if we can find a mapping between old invoice IDs and new UUIDs
      console.log('\n🔍 Looking for invoice ID mapping...');
      
      // Try to find invoices that might have the old ID format
      const { data: oldFormatInvoices, error: oldFormatError } = await supabase
        .from('invoices')
        .select('id, smartbill_id')
        .or('id.like.%,id.like.%')
        .limit(5);

      if (!oldFormatError && oldFormatInvoices.length > 0) {
        console.log('📊 Found invoices with potential old ID format:');
        oldFormatInvoices.forEach((invoice, index) => {
          console.log(`   ${index + 1}. ID: ${invoice.id}, SmartBill ID: ${invoice.smartbill_id}`);
        });
      }

      // Check if there's a mapping table or if we can reconstruct the relationship
      console.log('\n🔍 Checking for mapping possibilities...');
      
      // Look for any tables that might contain the mapping
      const { data: allTables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%backup%');

      if (!tablesError && allTables.length > 0) {
        console.log('📋 Found backup tables:');
        allTables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }

    } else {
      console.log('❌ No data found in invoice_clients_backup table');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkInvoiceClientsBackup(); 