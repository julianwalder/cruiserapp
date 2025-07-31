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

async function testSpecificUsers() {
  console.log('🧪 Testing PPL courses for specific users...');
  
  try {
    // Test with the specific users we know have PPL courses
    const testEmails = [
      'stefanmladinradu@gmail.com',
      'stefanalexandru97@yahoo.com',
      'iuliaoprea182@gmail.com'
    ];
    
    for (const email of testEmails) {
      console.log(`\n👤 Testing user: ${email}`);
      
      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, firstName, lastName')
        .eq('email', email)
        .single();
      
      if (userError || !user) {
        console.log(`   ❌ User not found: ${userError?.message || 'No user found'}`);
        continue;
      }
      
      console.log(`   ✅ User found: ${user.firstName} ${user.lastName}`);
      
      // Get PPL course tranches
      const { data: tranches, error: tranchesError } = await supabase
        .from('ppl_course_tranches')
        .select('*')
        .eq('user_id', user.id)
        .order('tranche_number', { ascending: true });
      
      if (tranchesError) {
        console.log(`   ❌ Error fetching tranches: ${tranchesError.message}`);
        continue;
      }
      
      console.log(`   📊 Found ${tranches?.length || 0} PPL course tranches`);
      
      if (tranches && tranches.length > 0) {
        // Calculate summary
        const totalTranches = tranches.length;
        const completedTranches = tranches.filter(t => t.status === 'completed').length;
        const totalHoursAllocated = tranches.reduce((sum, t) => sum + parseFloat(t.hours_allocated), 0);
        const totalHoursUsed = tranches.reduce((sum, t) => sum + parseFloat(t.used_hours), 0);
        const totalHoursRemaining = tranches.reduce((sum, t) => sum + parseFloat(t.remaining_hours), 0);
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
        
        // Show tranche details
        console.log(`   📝 Tranche details:`);
        tranches.forEach(tranche => {
          console.log(`      - Tranche ${tranche.tranche_number}/${tranche.total_tranches}: ${tranche.hours_allocated}h allocated, ${tranche.used_hours}h used, ${tranche.remaining_hours}h remaining (${tranche.status})`);
        });
        
        // Test the data structure that should be returned by the API
        const pplCourseData = {
          tranches: tranches.map(t => ({
            id: t.id,
            invoiceId: t.invoice_id,
            trancheNumber: t.tranche_number,
            totalTranches: t.total_tranches,
            hoursAllocated: t.hours_allocated,
            totalCourseHours: t.total_course_hours,
            amount: t.amount,
            currency: t.currency,
            description: t.description,
            purchaseDate: t.purchase_date,
            status: t.status,
            usedHours: t.used_hours,
            remainingHours: t.remaining_hours
          })),
          summary: {
            totalTranches,
            completedTranches,
            totalHoursAllocated,
            totalHoursUsed,
            totalHoursRemaining,
            progress,
            isCompleted
          }
        };
        
        console.log(`   🔍 API data structure:`);
        console.log(JSON.stringify(pplCourseData, null, 2));
      }
    }
    
    console.log('\n🎉 Specific users test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSpecificUsers(); 