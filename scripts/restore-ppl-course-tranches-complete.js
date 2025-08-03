const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restorePplCourseTranchesComplete() {
  console.log('🔧 Restoring ppl_course_tranches table with proper foreign key relationships...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupTranches, error: backupTranchesError } = await supabase
      .from('ppl_course_tranches_backup')
      .select('*');

    if (backupTranchesError) {
      console.error('❌ Error fetching ppl_course_tranches_backup:', backupTranchesError);
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

    const { data: backupUsers, error: backupUsersError } = await supabase
      .from('users_backup')
      .select('id, email, firstName, lastName');

    if (backupUsersError) {
      console.error('❌ Error fetching users_backup:', backupUsersError);
      return;
    }

    const { data: currentUsers, error: currentUsersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName');

    if (currentUsersError) {
      console.error('❌ Error fetching current users:', currentUsersError);
      return;
    }

    console.log(`📊 Found ${backupTranches.length} backup ppl_course_tranches records`);
    console.log(`📊 Found ${backupInvoices.length} backup invoices`);
    console.log(`📊 Found ${currentInvoices.length} current invoices`);
    console.log(`📊 Found ${backupUsers.length} backup users`);
    console.log(`📊 Found ${currentUsers.length} current users`);

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

    // Map backup user IDs to current user IDs via email
    const backupUserToCurrent = new Map();
    backupUsers.forEach(backupUser => {
      const currentUser = currentUsers.find(current => current.email === backupUser.email);
      if (currentUser) {
        backupUserToCurrent.set(backupUser.id, currentUser.id);
      }
    });

    console.log(`🔗 Created ${backupInvoiceToCurrent.size} invoice mappings`);
    console.log(`🔗 Created ${backupUserToCurrent.size} user mappings`);

    // Step 3: Check if ppl_course_tranches table exists and clear it
    console.log('\n🗑️ Step 3: Checking and clearing ppl_course_tranches table...');
    
    // First, let's check if the table exists by trying to fetch a sample
    const { data: existingTranches, error: existingError } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .limit(1);

    if (existingError) {
      console.log('⚠️ ppl_course_tranches table does not exist or is empty');
    } else {
      console.log(`📊 Found ${existingTranches?.length || 0} existing ppl_course_tranches records`);
      
      // Clear existing records if any
      if (existingTranches && existingTranches.length > 0) {
        const { error: deleteError } = await supabase
          .from('ppl_course_tranches')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) {
          console.error('❌ Error deleting existing ppl_course_tranches:', deleteError);
          return;
        }
        console.log('✅ Cleared existing ppl_course_tranches records');
      }
    }

    // Step 4: Restore ppl_course_tranches with proper mappings
    console.log('\n🔄 Step 4: Restoring ppl_course_tranches with proper mappings...');
    
    let restoredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const backupRecord of backupTranches) {
      try {
        // Map invoice_id
        const currentInvoiceId = backupInvoiceToCurrent.get(backupRecord.invoice_id);
        if (!currentInvoiceId) {
          console.log(`⚠️ Skipping ppl_course_tranches record ${backupRecord.id}: No current invoice mapping for ${backupRecord.invoice_id}`);
          skippedCount++;
          continue;
        }

        // Map user_id
        const currentUserId = backupUserToCurrent.get(backupRecord.user_id);
        if (!currentUserId) {
          console.log(`⚠️ Skipping ppl_course_tranches record ${backupRecord.id}: No current user mapping for ${backupRecord.user_id}`);
          skippedCount++;
          continue;
        }

        // Create the new ppl_course_tranches record
        const newTranche = {
          invoice_id: currentInvoiceId,
          user_id: currentUserId,
          tranche_number: backupRecord.tranche_number,
          amount: backupRecord.amount,
          due_date: backupRecord.due_date,
          status: backupRecord.status,
          payment_date: backupRecord.payment_date,
          notes: backupRecord.notes,
          created_at: backupRecord.created_at,
          updated_at: backupRecord.updated_at
        };

        const { error: insertError } = await supabase
          .from('ppl_course_tranches')
          .insert(newTranche);

        if (insertError) {
          console.error(`❌ Error inserting ppl_course_tranches record ${backupRecord.id}:`, insertError);
          errorCount++;
        } else {
          restoredCount++;
          if (restoredCount % 10 === 0) {
            console.log(`✅ Restored ${restoredCount} ppl_course_tranches records...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ppl_course_tranches record ${backupRecord.id}:`, error);
        errorCount++;
      }
    }

    // Step 5: Summary
    console.log('\n📊 Step 5: Restoration Summary');
    console.log('================================');
    console.log(`✅ Successfully restored: ${restoredCount} ppl_course_tranches records`);
    console.log(`⚠️ Skipped (no mapping): ${skippedCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log(`📊 Total processed: ${backupTranches.length} records`);

    // Verify the restoration
    console.log('\n🔍 Step 6: Verification...');
    const { data: finalTranches, error: finalError } = await supabase
      .from('ppl_course_tranches')
      .select('*');

    if (finalError) {
      console.error('❌ Error fetching final ppl_course_tranches:', finalError);
    } else {
      console.log(`📊 Final ppl_course_tranches count: ${finalTranches.length}`);
      
      if (finalTranches.length > 0) {
        console.log('\n📋 Sample restored records:');
        finalTranches.slice(0, 3).forEach((tranche, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(tranche).forEach(([key, value]) => {
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
restorePplCourseTranchesComplete(); 