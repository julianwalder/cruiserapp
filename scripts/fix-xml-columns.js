require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixXmlColumns() {
  try {
    console.log('🔧 Fixing XML columns structure...');
    
    // Check if edited_xml_content column exists and remove it
    console.log('📝 Checking for edited_xml_content column...');
    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE invoices DROP COLUMN IF EXISTS edited_xml_content;' 
    });
    
    if (dropError) {
      console.log('ℹ️ No edited_xml_content column to remove or error:', dropError.message);
    } else {
      console.log('✅ Removed edited_xml_content column');
    }
    
    // Ensure original_xml_content column exists
    console.log('📝 Ensuring original_xml_content column exists...');
    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_xml_content TEXT;' 
    });
    
    if (addError) {
      console.log('ℹ️ original_xml_content column already exists or error:', addError.message);
    } else {
      console.log('✅ Added original_xml_content column');
    }
    
    // Update existing records to set original_xml_content = xml_content if it's null
    console.log('📝 Updating existing records...');
    const { error: updateError } = await supabase.rpc('exec_sql', { 
      sql: 'UPDATE invoices SET original_xml_content = xml_content WHERE original_xml_content IS NULL;' 
    });
    
    if (updateError) {
      console.error('❌ Error updating records:', updateError);
    } else {
      console.log('✅ Updated existing records');
    }
    
    console.log('\n🎉 XML columns structure fixed!');
    console.log('\n📋 Final structure:');
    console.log('- xml_content: Current content (edited JSON or original XML)');
    console.log('- original_xml_content: Original XML before any edits');
    console.log('- has_edits: Determined by comparing xml_content !== original_xml_content');
    
  } catch (error) {
    console.error('❌ Failed to fix XML columns:', error);
    process.exit(1);
  }
}

// Run the fix
fixXmlColumns(); 