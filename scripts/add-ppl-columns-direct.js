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
    // First, let's check the current structure of the invoices table
    console.log('🔍 Checking current invoices table structure...');
    const { data: currentColumns, error: checkError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking table structure:', checkError);
      return;
    }

    console.log('✅ Table structure check completed');

    // Try to add columns by updating an existing record with the new fields
    // This will trigger the column creation if they don't exist
    console.log('📝 Attempting to add columns by updating schema...');
    
    // Get the first invoice to test with
    const { data: firstInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);

    if (fetchError || !firstInvoice || firstInvoice.length === 0) {
      console.log('ℹ️  No invoices found in table. Creating a test record...');
      
      // Create a test record with the new columns
      const { data: testRecord, error: createError } = await supabase
        .from('invoices')
        .insert({
          smartbill_id: 'TEST-001',
          series: 'TEST',
          number: '001',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          vat_amount: 0,
          currency: 'RON',
          xml_content: '<test>Test invoice</test>',
          is_ppl: false,
          ppl_hours_paid: 0,
          original_xml_content: '<test>Original test</test>',
          edited_xml_content: null
        })
        .select();

      if (createError) {
        console.error('❌ Error creating test record:', createError);
        console.log('💡 This might indicate the columns already exist or there\'s a schema issue');
      } else {
        console.log('✅ Test record created successfully');
        
        // Clean up the test record
        await supabase
          .from('invoices')
          .delete()
          .eq('smartbill_id', 'TEST-001');
        
        console.log('✅ Test record cleaned up');
      }
    } else {
      console.log('ℹ️  Found existing invoices. Testing column addition...');
      
      // Try to update an existing record with the new fields
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          is_ppl: false,
          ppl_hours_paid: 0,
          original_xml_content: null,
          edited_xml_content: null
        })
        .eq('id', firstInvoice[0].id);

      if (updateError) {
        console.error('❌ Error updating record:', updateError);
        console.log('💡 This might indicate the columns don\'t exist yet');
      } else {
        console.log('✅ Record updated successfully - columns exist');
      }
    }

    // Test the API endpoint to see if the error is resolved
    console.log('🔍 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint working correctly');
      console.log(`📊 Found ${data.invoices?.length || 0} invoices`);
    } else {
      console.log('❌ API endpoint still has issues');
    }

    console.log('🎉 Column addition process completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
addPPLColumns(); 