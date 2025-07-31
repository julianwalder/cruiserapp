const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
  console.log('🔍 Checking ppl_course_tranches table columns...');
  
  // Try to get a sample record to see the structure
  const { data: sample, error: sampleError } = await supabase
    .from('ppl_course_tranches')
    .select('*')
    .limit(1);
    
  if (sampleError) {
    console.log('❌ Error accessing table:', sampleError.message);
    return;
  }
  
  if (sample && sample.length > 0) {
    console.log('✅ Table structure:');
    console.log(Object.keys(sample[0]));
  } else {
    console.log('📋 No records found, checking with a simple insert test...');
    
    // Try to insert a test record to see what columns are expected
    const testRecord = {
      id: 'test-' + Date.now(),
      invoice_id: 'TEST',
      user_id: 'test-user',
      tranche_number: 1,
      total_tranches: 1,
      allocated_hours: 10,
      total_course_hours: 45,
      amount: 1000,
      currency: 'RON',
      description: 'Test',
      purchase_date: '2024-01-01',
      status: 'active',
      used_hours: 0,
      remaining_hours: 10
    };
    
    const { error: insertError } = await supabase
      .from('ppl_course_tranches')
      .insert(testRecord);
      
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      
      // Try with different column names
      const testRecord2 = {
        id: 'test2-' + Date.now(),
        invoice_id: 'TEST2',
        user_id: 'test-user',
        tranche_number: 1,
        total_tranches: 1,
        hours_allocated: 10, // Try different name
        total_course_hours: 45,
        amount: 1000,
        currency: 'RON',
        description: 'Test',
        purchase_date: '2024-01-01',
        status: 'active',
        used_hours: 0,
        remaining_hours: 10
      };
      
      const { error: insertError2 } = await supabase
        .from('ppl_course_tranches')
        .insert(testRecord2);
        
      if (insertError2) {
        console.log('❌ Second insert error:', insertError2.message);
      } else {
        console.log('✅ Second insert worked with hours_allocated');
      }
    } else {
      console.log('✅ First insert worked with allocated_hours');
    }
  }
}

checkColumns().catch(console.error); 