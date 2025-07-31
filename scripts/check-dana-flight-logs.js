const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDanaFlightLogs() {
  console.log('🔍 Checking Dana\'s flight logs...');
  
  // Get Dana's user ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'dana.elena.costica@gmail.com')
    .single();
    
  if (userError) {
    console.log('❌ User not found:', userError.message);
    return;
  }
  
  console.log('✅ Found user:', user.email);
  
  // Get Dana's flight logs
  const { data: flightLogs, error: flightLogsError } = await supabase
    .from('flight_logs')
    .select('*')
    .eq('pilotId', user.id)
    .order('date', { ascending: true });
    
  if (flightLogsError) {
    console.log('❌ Error fetching flight logs:', flightLogsError.message);
    return;
  }
  
  console.log(`📊 Found ${flightLogs.length} flight logs for Dana`);
  
  let totalHours = 0;
  flightLogs.forEach((log, index) => {
    console.log(`\n✈️ Flight ${index + 1}:`);
    console.log('  - Date:', log.date);
    console.log('  - Total Hours:', log.totalHours);
    console.log('  - Aircraft:', log.aircraftId);
    console.log('  - Instructor:', log.instructorId);
    totalHours += log.totalHours || 0;
  });
  
  console.log(`\n📈 Total flight hours: ${totalHours}`);
  
  // Get current PPL course data
  const { data: pplTranches, error: pplError } = await supabase
    .from('ppl_course_tranches')
    .select('*')
    .eq('user_id', user.id);
    
  if (pplError) {
    console.log('❌ Error fetching PPL tranches:', pplError.message);
    return;
  }
  
  console.log(`\n🎓 Current PPL course data:`);
  pplTranches.forEach((tranche, index) => {
    console.log(`  Tranche ${index + 1}:`);
    console.log('    - Hours Allocated:', tranche.hours_allocated);
    console.log('    - Hours Used:', tranche.used_hours);
    console.log('    - Hours Remaining:', tranche.remaining_hours);
  });
  
  // Update PPL usage based on flight logs
  console.log('\n🔄 Updating PPL course usage...');
  
  let remainingHoursToAllocate = totalHours;
  const updates = [];
  
  for (const tranche of pplTranches.sort((a, b) => a.tranche_number - b.tranche_number)) {
    const trancheUsedHours = Math.min(tranche.hours_allocated, remainingHoursToAllocate);
    const newRemainingHours = tranche.hours_allocated - trancheUsedHours;
    
    console.log(`\n📝 Updating tranche ${tranche.tranche_number}:`);
    console.log(`  - Allocated: ${tranche.hours_allocated}`);
    console.log(`  - Used: ${trancheUsedHours} (was ${tranche.used_hours})`);
    console.log(`  - Remaining: ${newRemainingHours} (was ${tranche.remaining_hours})`);
    
    const { error: updateError } = await supabase
      .from('ppl_course_tranches')
      .update({
        used_hours: trancheUsedHours,
        remaining_hours: newRemainingHours
      })
      .eq('id', tranche.id);
      
    if (updateError) {
      console.log(`❌ Error updating tranche ${tranche.tranche_number}:`, updateError.message);
    } else {
      console.log(`✅ Tranche ${tranche.tranche_number} updated successfully`);
    }
    
    remainingHoursToAllocate -= trancheUsedHours;
    if (remainingHoursToAllocate <= 0) break;
  }
  
  console.log('\n✅ PPL course usage update completed!');
}

checkDanaFlightLogs().catch(console.error); 