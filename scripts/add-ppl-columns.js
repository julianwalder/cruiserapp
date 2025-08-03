const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPPLColumns() {
  console.log('🔧 Adding missing PPL columns to invoices table...');
  
  try {
    // Add is_ppl column
    console.log('📝 Adding is_ppl column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_ppl BOOLEAN DEFAULT FALSE;'
    });
    
    if (error1) {
      console.error('❌ Error adding is_ppl column:', error1);
    } else {
      console.log('✅ Added is_ppl column');
    }

    // Add ppl_hours_paid column
    console.log('📝 Adding ppl_hours_paid column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ppl_hours_paid DECIMAL(5,2) DEFAULT 0;'
    });
    
    if (error2) {
      console.error('❌ Error adding ppl_hours_paid column:', error2);
    } else {
      console.log('✅ Added ppl_hours_paid column');
    }

    // Add original_xml_content column
    console.log('📝 Adding original_xml_content column...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_xml_content TEXT;'
    });
    
    if (error3) {
      console.error('❌ Error adding original_xml_content column:', error3);
    } else {
      console.log('✅ Added original_xml_content column');
    }

    // Add edited_xml_content column
    console.log('📝 Adding edited_xml_content column...');
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS edited_xml_content TEXT;'
    });
    
    if (error4) {
      console.error('❌ Error adding edited_xml_content column:', error4);
    } else {
      console.log('✅ Added edited_xml_content column');
    }

    // Create index on is_ppl
    console.log('📝 Creating index on is_ppl...');
    const { error: error5 } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_invoices_is_ppl ON invoices(is_ppl);'
    });
    
    if (error5) {
      console.error('❌ Error creating index:', error5);
    } else {
      console.log('✅ Created index on is_ppl');
    }

    // Verify the columns were added
    console.log('🔍 Verifying columns were added...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'invoices')
      .in('column_name', ['is_ppl', 'ppl_hours_paid', 'original_xml_content', 'edited_xml_content'])
      .order('column_name');

    if (verifyError) {
      console.error('❌ Error verifying columns:', verifyError);
    } else {
      console.log('✅ Verification successful. Added columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    console.log('🎉 PPL columns added successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
addPPLColumns(); 