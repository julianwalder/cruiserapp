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

async function testPPLAPI() {
  console.log('🧪 Testing PPL Course API functionality...');
  
  try {
    // 1. Check if PPL course tranches exist
    console.log('\n📋 Step 1: Checking PPL course tranches...');
    const { data: tranches, error: tranchesError } = await supabase
      .from('ppl_course_tranches')
      .select('*');
    
    if (tranchesError) {
      console.log('❌ Error fetching PPL course tranches:', tranchesError.message);
      return;
    }
    
    console.log(`✅ Found ${tranches?.length || 0} PPL course tranches`);
    
    if (tranches && tranches.length > 0) {
      console.log('📊 Sample tranche data:');
      console.log(JSON.stringify(tranches[0], null, 2));
    }
    
    // 2. Test PPLCourseService functions directly
    console.log('\n📋 Step 2: Testing PPLCourseService functions...');
    
    // Get a user with PPL course
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      return;
    }
    
    console.log(`✅ Found ${users?.length || 0} users`);
    
    // Test with each user
    for (const user of users || []) {
      console.log(`\n👤 Testing user: ${user.firstName} ${user.lastName} (${user.email})`);
      
      // Check if user has PPL course tranches
      const { data: userTranches, error: userTranchesError } = await supabase
        .from('ppl_course_tranches')
        .select('*')
        .eq('user_id', user.id);
      
      if (userTranchesError) {
        console.log(`   ❌ Error fetching user tranches: ${userTranchesError.message}`);
        continue;
      }
      
      console.log(`   📊 User has ${userTranches?.length || 0} PPL course tranches`);
      
      if (userTranches && userTranches.length > 0) {
        // Calculate summary manually
        const totalTranches = userTranches.length;
        const completedTranches = userTranches.filter(t => t.status === 'completed').length;
        const totalHoursAllocated = userTranches.reduce((sum, t) => sum + parseFloat(t.hours_allocated), 0);
        const totalHoursUsed = userTranches.reduce((sum, t) => sum + parseFloat(t.used_hours), 0);
        const totalHoursRemaining = userTranches.reduce((sum, t) => sum + parseFloat(t.remaining_hours), 0);
        const progress = totalHoursAllocated > 0 ? (totalHoursUsed / totalHoursAllocated) * 100 : 0;
        const isCompleted = totalHoursRemaining <= 0;
        
        console.log(`   📈 Summary:`);
        console.log(`      - Total tranches: ${totalTranches}`);
        console.log(`      - Completed tranches: ${completedTranches}`);
        console.log(`      - Total allocated: ${totalHoursAllocated.toFixed(2)}h`);
        console.log(`      - Total used: ${totalHoursUsed.toFixed(2)}h`);
        console.log(`      - Total remaining: ${totalHoursRemaining.toFixed(2)}h`);
        console.log(`      - Progress: ${progress.toFixed(1)}%`);
        console.log(`      - Completed: ${isCompleted}`);
        
        // Test individual tranche data
        console.log(`   📝 Tranche details:`);
        userTranches.forEach(tranche => {
          console.log(`      - Tranche ${tranche.tranche_number}/${tranche.total_tranches}: ${tranche.hours_allocated}h allocated, ${tranche.used_hours}h used, ${tranche.remaining_hours}h remaining (${tranche.status})`);
        });
      }
    }
    
    console.log('\n🎉 PPL Course API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPPLAPI(); 