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

async function updatePPLUsage() {
  console.log('🔄 Updating PPL course usage based on flight logs...');
  
  try {
    // 1. Get all users with PPL course tranches
    console.log('\n📋 Step 1: Finding users with PPL course tranches...');
    const { data: pplUsers, error: pplError } = await supabase
      .from('ppl_course_tranches')
      .select(`
        user_id,
        users!inner (
          id,
          email,
          firstName,
          lastName
        )
      `)
      .order('user_id');
    
    if (pplError) {
      console.log('❌ Error fetching PPL users:', pplError.message);
      return;
    }
    
    // Get unique users
    const uniqueUsers = [...new Map(pplUsers.map(item => [item.user_id, item.users])).values()];
    console.log(`✅ Found ${uniqueUsers.length} users with PPL course tranches`);
    
    // 2. Process each user
    for (const user of uniqueUsers) {
      console.log(`\n👤 Processing user: ${user.firstName} ${user.lastName} (${user.email})`);
      
      // Get user's PPL course tranches
      const { data: tranches, error: tranchesError } = await supabase
        .from('ppl_course_tranches')
        .select('*')
        .eq('user_id', user.id)
        .order('tranche_number', { ascending: true });
      
      if (tranchesError) {
        console.log(`   ❌ Error fetching tranches: ${tranchesError.message}`);
        continue;
      }
      
      console.log(`   📊 Found ${tranches.length} PPL course tranches`);
      
      // Get user's flight logs (as pilot or instructor)
      const { data: flightLogs, error: flightsError } = await supabase
        .from('flight_logs')
        .select('*')
        .or(`"pilotId".eq.${user.id},"instructorId".eq.${user.id}`)
        .order('date', { ascending: true });
      
      if (flightsError) {
        console.log(`   ❌ Error fetching flight logs: ${flightsError.message}`);
        continue;
      }
      
      console.log(`   ✈️  Found ${flightLogs.length} flight logs`);
      
      // Calculate total flight hours
      const totalFlightHours = flightLogs.reduce((sum, flight) => {
        const duration = parseFloat(flight.totalHours) || 0;
        return sum + duration;
      }, 0);
      
      console.log(`   🕐 Total flight hours: ${totalFlightHours.toFixed(2)}h`);
      
      // 3. Allocate hours to tranches (FIFO - First In, First Out)
      let remainingHours = totalFlightHours;
      let updatedTranches = [];
      
      for (const tranche of tranches) {
        const allocatedHours = parseFloat(tranche.hours_allocated) || 0;
        const currentUsedHours = parseFloat(tranche.used_hours) || 0;
        
        // Calculate how many hours to use from this tranche
        let hoursToUse = 0;
        if (remainingHours > 0) {
          if (remainingHours >= allocatedHours) {
            // Use all allocated hours from this tranche
            hoursToUse = allocatedHours;
            remainingHours -= allocatedHours;
          } else {
            // Use remaining hours from this tranche
            hoursToUse = remainingHours;
            remainingHours = 0;
          }
        }
        
        const newUsedHours = hoursToUse;
        const newRemainingHours = allocatedHours - newUsedHours;
        
        // Determine status
        let status = 'active';
        if (newUsedHours >= allocatedHours) {
          status = 'completed';
        } else if (newUsedHours > 0) {
          status = 'active';
        }
        
        updatedTranches.push({
          id: tranche.id,
          used_hours: newUsedHours,
          remaining_hours: newRemainingHours,
          status: status
        });
        
        console.log(`   📝 Tranche ${tranche.tranche_number}/${tranche.total_tranches}: ${newUsedHours.toFixed(2)}h used, ${newRemainingHours.toFixed(2)}h remaining (${status})`);
      }
      
      // 4. Update tranches in database
      for (const updateData of updatedTranches) {
        const { error: updateError } = await supabase
          .from('ppl_course_tranches')
          .update({
            used_hours: updateData.used_hours,
            remaining_hours: updateData.remaining_hours,
            status: updateData.status
          })
          .eq('id', updateData.id);
        
        if (updateError) {
          console.log(`   ❌ Error updating tranche: ${updateError.message}`);
        }
      }
      
      // 5. Summary for this user
      const totalAllocated = tranches.reduce((sum, t) => sum + parseFloat(t.hours_allocated), 0);
      const totalUsed = updatedTranches.reduce((sum, t) => sum + t.used_hours, 0);
      const totalRemaining = updatedTranches.reduce((sum, t) => sum + t.remaining_hours, 0);
      
      console.log(`   📊 Summary: ${totalAllocated.toFixed(2)}h allocated, ${totalUsed.toFixed(2)}h used, ${totalRemaining.toFixed(2)}h remaining`);
    }
    
    console.log('\n🎉 PPL course usage update completed!');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

// Run the update
updatePPLUsage(); 