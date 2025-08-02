require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addOriginalXmlColumn() {
  try {
    console.log('🔄 Adding original_xml_content column to invoices table...');
    
    // Step 1: Add the column
    console.log('📝 Adding original_xml_content column...');
    const { error: addError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE invoices ADD COLUMN original_xml_content TEXT;' 
    });
    
    if (addError) {
      console.error('❌ Error adding column:', addError);
      // Check if column already exists
      if (addError.message.includes('already exists')) {
        console.log('ℹ️ Column already exists, continuing...');
      } else {
        throw addError;
      }
    } else {
      console.log('✅ Column added successfully');
    }
    
    // Step 2: Update existing records
    console.log('📝 Updating existing records...');
    const { error: updateError } = await supabase.rpc('exec_sql', { 
      sql: 'UPDATE invoices SET original_xml_content = xml_content WHERE original_xml_content IS NULL;' 
    });
    
    if (updateError) {
      console.error('❌ Error updating records:', updateError);
      throw updateError;
    } else {
      console.log('✅ Records updated successfully');
    }
    
    // Step 3: Make column NOT NULL
    console.log('📝 Making column NOT NULL...');
    const { error: notNullError } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE invoices ALTER COLUMN original_xml_content SET NOT NULL;' 
    });
    
    if (notNullError) {
      console.error('❌ Error making column NOT NULL:', notNullError);
      throw notNullError;
    } else {
      console.log('✅ Column made NOT NULL successfully');
    }
    
    console.log('\n🎉 Successfully added original_xml_content column to invoices table!');
    console.log('\n📋 Summary:');
    console.log('- Added original_xml_content TEXT column');
    console.log('- Set existing records to use current xml_content as original');
    console.log('- Made column NOT NULL for data integrity');
    
  } catch (error) {
    console.error('❌ Failed to add original_xml_content column:', error);
    process.exit(1);
  }
}

// Run the migration
addOriginalXmlColumn(); 