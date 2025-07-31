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

async function testPPLSetup() {
  console.log('🧪 Testing PPL Course setup...');
  
  try {
    // Test 1: Check if table exists
    console.log('📋 Test 1: Checking if ppl_course_tranches table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('ppl_course_tranches')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === '42P01') {
      console.log('❌ Table does not exist. Please run the SQL setup first.');
      return;
    }
    
    console.log('✅ Table exists successfully!');
    
    // Test 2: Check table structure
    console.log('📋 Test 2: Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'ppl_course_tranches')
      .order('ordinal_position');
    
    if (columnsError) {
      console.log('❌ Error checking table structure:', columnsError);
    } else {
      console.log('✅ Table structure verified:');
      columns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }
    
    // Test 3: Check indexes
    console.log('📋 Test 3: Checking indexes...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .eq('tablename', 'ppl_course_tranches');
    
    if (indexesError) {
      console.log('❌ Error checking indexes:', indexesError);
    } else {
      console.log('✅ Indexes found:');
      indexes?.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    }
    
    // Test 4: Check RLS policies
    console.log('📋 Test 4: Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd')
      .eq('tablename', 'ppl_course_tranches');
    
    if (policiesError) {
      console.log('❌ Error checking RLS policies:', policiesError);
    } else {
      console.log('✅ RLS policies found:');
      policies?.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd}`);
      });
    }
    
    // Test 5: Test insert (should fail without proper auth)
    console.log('📋 Test 5: Testing insert permissions...');
    const { error: insertError } = await supabase
      .from('ppl_course_tranches')
      .insert({
        invoice_id: 'TEST001',
        user_id: '00000000-0000-0000-0000-000000000000',
        tranche_number: 1,
        total_tranches: 1,
        hours_allocated: 45,
        amount: 1000,
        description: 'Test tranche',
        purchase_date: '2024-01-01'
      });
    
    if (insertError && insertError.code === '42501') {
      console.log('✅ Insert permissions properly restricted (RLS working)');
    } else if (insertError) {
      console.log('⚠️  Insert error (expected):', insertError.message);
    } else {
      console.log('⚠️  Insert succeeded (unexpected - RLS might not be working)');
    }
    
    console.log('');
    console.log('🎉 PPL Course setup test completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Import PPL course invoices');
    console.log('2. Run: curl -X POST /api/smartbill/process-ppl-courses');
    console.log('3. Run: curl -X POST /api/smartbill/update-ppl-usage');
    console.log('4. Check client hours in the UI');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPPLSetup(); 