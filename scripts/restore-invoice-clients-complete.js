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

// Helper function to convert old user ID format to UUID
function convertOldUserIdToUUID(oldUserId) {
  if (!oldUserId) return null;
  
  // If it's already a valid UUID, return it
  if (isValidUUID(oldUserId)) {
    return oldUserId;
  }
  
  // If it's the old format (like cmdko3yci009ww0jcvgovy87t), we need to find the corresponding user
  // For now, we'll return null and handle this separately
  return null;
}

async function restoreInvoiceClientsComplete() {
  console.log('🔧 Restoring invoice_clients table with proper foreign key relationships...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupClients, error: backupClientsError } = await supabase
      .from('invoice_clients_backup')
      .select('*');

    if (backupClientsError) {
      console.error('❌ Error fetching backup clients:', backupClientsError);
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

    console.log(`✅ Found ${backupClients.length} backup clients`);
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

    // Step 3: Get all unique user IDs from backup to find their new UUIDs
    console.log('📊 Step 3: Mapping user IDs...');
    
    const oldUserIds = Array.from(new Set(
      backupClients
        .map(client => client.user_id)
        .filter(Boolean)
    ));

    console.log(`📋 Found ${oldUserIds.length} unique old user IDs`);

    // Get all current users to create a mapping
    const { data: currentUsers, error: currentUsersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName');

    if (currentUsersError) {
      console.error('❌ Error fetching current users:', currentUsersError);
      return;
    }

    console.log(`✅ Found ${currentUsers.length} current users`);

    // Create a map of old user IDs to new UUIDs
    // Since we can't directly map the old format, we'll need to find users by email
    // First, let's get the backup users to see if we can match by email
    const { data: backupUsers, error: backupUsersError } = await supabase
      .from('users_backup')
      .select('id, email, firstName, lastName');

    if (backupUsersError) {
      console.error('❌ Error fetching backup users:', backupUsersError);
      return;
    }

    console.log(`✅ Found ${backupUsers.length} backup users`);

    // Create mapping from old user ID to email
    const oldUserIdToEmail = new Map();
    backupUsers.forEach(user => {
      oldUserIdToEmail.set(user.id, user.email);
    });

    // Create mapping from email to new user UUID
    const emailToNewUserId = new Map();
    currentUsers.forEach(user => {
      emailToNewUserId.set(user.email, user.id);
    });

    // Create final mapping from old user ID to new UUID
    const oldUserIdToNewUUID = new Map();
    oldUserIds.forEach(oldUserId => {
      const email = oldUserIdToEmail.get(oldUserId);
      if (email) {
        const newUUID = emailToNewUserId.get(email);
        if (newUUID) {
          oldUserIdToNewUUID.set(oldUserId, newUUID);
          console.log(`   ✅ Mapped ${oldUserId} -> ${email} -> ${newUUID}`);
        } else {
          console.log(`   ⚠️  No current user found for email: ${email}`);
        }
      } else {
        console.log(`   ⚠️  No email found for old user ID: ${oldUserId}`);
      }
    });

    console.log(`📋 Successfully mapped ${oldUserIdToNewUUID.size} user IDs`);

    // Step 4: Process each backup client
    console.log('📊 Step 4: Processing backup clients...');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

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

        // Map the user_id to the new UUID
        let newUserId = null;
        if (backupClient.user_id) {
          newUserId = oldUserIdToNewUUID.get(backupClient.user_id);
          if (!newUserId) {
            console.log(`   ⚠️  Could not map user_id ${backupClient.user_id} to new UUID`);
          }
        }

        // Insert the client record with the new invoice UUID and mapped user_id
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
            user_id: newUserId, // Use mapped UUID or null
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

    // Step 5: Verify the results
    console.log('\n🔍 Step 5: Verifying results...');
    const { data: clientCount, error: countError } = await supabase
      .from('invoice_clients')
      .select('id');

    if (countError) {
      console.error('❌ Error counting clients:', countError);
    } else {
      console.log(`✅ Total invoice clients in database: ${clientCount.length}`);
    }

    // Step 6: Test the API endpoint
    console.log('\n🔍 Step 6: Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      const firstInvoice = data.invoices?.[0];
      if (firstInvoice && firstInvoice.client && Object.keys(firstInvoice.client).length > 0) {
        console.log('✅ API endpoint now returns client data correctly');
        console.log(`   Sample client: ${firstInvoice.client.name} (${firstInvoice.client.email || 'no email'})`);
        
        // Check if the client data is now coming from the database instead of XML
        if (firstInvoice.client.user_id) {
          console.log(`   ✅ Client has user_id: ${firstInvoice.client.user_id}`);
        }
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
restoreInvoiceClientsComplete(); 