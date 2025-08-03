const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPplCourseTranchesStructure() {
  console.log('🔍 Checking ppl_course_tranches table structures...');
  
  try {
    // Check backup structure
    console.log('\n📋 ppl_course_tranches_backup table structure:');
    const { data: backupTranches, error: backupError } = await supabase
      .from('ppl_course_tranches_backup')
      .select('*')
      .limit(3);

    if (backupError) {
      console.error('❌ Error fetching ppl_course_tranches_backup:', backupError);
    } else {
      if (backupTranches && backupTranches.length > 0) {
        console.log('Available columns:');
        Object.keys(backupTranches[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample backup records:');
        backupTranches.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'NULL'}`);
          });
        });
      }
    }

    // Check current structure
    console.log('\n📋 Current ppl_course_tranches table structure:');
    const { data: currentTranches, error: currentError } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .limit(1);

    if (currentError) {
      console.error('❌ Error fetching current ppl_course_tranches:', currentError);
    } else {
      if (currentTranches && currentTranches.length > 0) {
        console.log('Available columns:');
        Object.keys(currentTranches[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample current record:');
        Object.entries(currentTranches[0]).forEach(([key, value]) => {
          console.log(`   ${key}: ${value || 'NULL'}`);
        });
      } else {
        console.log('📊 Current table is empty, checking schema...');
        
        // Try to get schema information by attempting an insert with minimal data
        const testRecord = {
          invoice_id: '00000000-0000-0000-0000-000000000000',
          user_id: '00000000-0000-0000-0000-000000000000',
          tranche_number: 1,
          total_tranches: 1,
          amount: 0,
          currency: 'RON',
          status: 'active'
        };

        const { error: testError } = await supabase
          .from('ppl_course_tranches')
          .insert(testRecord);

        if (testError) {
          console.log('❌ Test insert error (this helps us understand the schema):', testError.message);
        } else {
          console.log('✅ Test insert successful');
          // Clean up test record
          await supabase
            .from('ppl_course_tranches')
            .delete()
            .eq('invoice_id', '00000000-0000-0000-0000-000000000000');
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkPplCourseTranchesStructure(); 