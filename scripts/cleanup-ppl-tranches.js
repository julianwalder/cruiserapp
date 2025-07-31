const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupPPLTranches() {
  console.log('🧹 Cleaning up existing PPL course tranches...');
  
  try {
    // Delete all existing PPL course tranches
    const { data: deletedTranches, error: deleteError } = await supabase
      .from('ppl_course_tranches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.log('❌ Error deleting tranches:', deleteError.message);
      return;
    }
    
    console.log(`✅ Deleted ${deletedTranches?.length || 0} existing PPL course tranches`);
    console.log('🔄 Now you can reprocess all PPL courses with the corrected logic');
    console.log('');
    console.log('Run: node scripts/process-all-ppl-courses.js');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupPPLTranches(); 