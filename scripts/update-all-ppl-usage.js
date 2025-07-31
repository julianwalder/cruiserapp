const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateAllPPLUsage() {
  console.log('🔄 Updating PPL course usage for all users...');
  
  // Get all users with PPL course tranches
  const { data: pplTranches, error: pplError } = await supabase
    .from('ppl_course_tranches')
    .select('user_id');
    
  if (pplError) {
    console.log('❌ Error fetching PPL users:', pplError.message);
    return;
  }
  
  // Get unique user IDs
  const uniqueUserIds = [...new Set(pplTranches.map(t => t.user_id))];
  console.log(`📊 Found ${uniqueUserIds.length} users with PPL courses`);
  
  for (const userId of uniqueUserIds) {
    
  if (pplError) {
    console.log('❌ Error fetching PPL users:', pplError.message);
    return;
  }
  

    
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, firstName, lastName')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.log(`❌ Error fetching user ${userId}:`, userError.message);
      continue;
    }
    
    console.log(`\n👤 Processing ${user.email} (${user.firstName} ${user.lastName})...`);
    
    // Get user's flight logs
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select('totalHours')
      .eq('pilotId', userId);
      
    if (flightLogsError) {
      console.log(`❌ Error fetching flight logs for ${user.email}:`, flightLogsError.message);
      continue;
    }
    
    const totalHours = flightLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
    console.log(`  📈 Total flight hours: ${totalHours}`);
    
    // Get user's PPL course tranches
    const { data: pplTranches, error: tranchesError } = await supabase
      .from('ppl_course_tranches')
      .select('*')
      .eq('user_id', userId)
      .order('tranche_number', { ascending: true });
      
    if (tranchesError) {
      console.log(`❌ Error fetching PPL tranches for ${user.email}:`, tranchesError.message);
      continue;
    }
    
    console.log(`  🎓 Found ${pplTranches.length} PPL course tranches`);
    
    // Update PPL usage based on flight logs
    let remainingHoursToAllocate = totalHours;
    
    for (const tranche of pplTranches) {
      const trancheUsedHours = Math.min(tranche.hours_allocated, remainingHoursToAllocate);
      const newRemainingHours = tranche.hours_allocated - trancheUsedHours;
      
      console.log(`    📝 Tranche ${tranche.tranche_number}: ${trancheUsedHours}h used (${newRemainingHours}h remaining)`);
      
      const { error: updateError } = await supabase
        .from('ppl_course_tranches')
        .update({
          used_hours: trancheUsedHours,
          remaining_hours: newRemainingHours
        })
        .eq('id', tranche.id);
        
      if (updateError) {
        console.log(`    ❌ Error updating tranche ${tranche.tranche_number}:`, updateError.message);
      }
      
      remainingHoursToAllocate -= trancheUsedHours;
      if (remainingHoursToAllocate <= 0) break;
    }
    
    console.log(`  ✅ Updated PPL usage for ${user.email}`);
  }
  
  console.log('\n🎉 PPL course usage update completed for all users!');
}

updateAllPPLUsage().catch(console.error); 