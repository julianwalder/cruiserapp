const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAircraftHobbs(aircraftId) {
  try {
    console.log(`🔧 Updating Hobbs data for aircraft ${aircraftId}...`);

    // Find the latest flight log with arrival Hobbs for this aircraft
    const { data: latestLog, error: logError } = await supabase
      .from('flight_logs')
      .select('id, arrivalHobbs, date')
      .eq('aircraftId', aircraftId)
      .not('arrivalHobbs', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (logError && logError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`❌ Error fetching latest log for aircraft ${aircraftId}:`, logError);
      return;
    }

    if (latestLog) {
      console.log(`✅ Found latest Hobbs: ${latestLog.arrivalHobbs} hours on ${latestLog.date}`);

      // Update the aircraft_hobbs record
      const { error: upsertError } = await supabase
        .from('aircraft_hobbs')
        .upsert({
          aircraft_id: aircraftId,
          last_hobbs_reading: parseFloat(latestLog.arrivalHobbs),
          last_hobbs_date: latestLog.date,
          last_flight_log_id: latestLog.id
        }, {
          onConflict: 'aircraft_id'
        });

      if (upsertError) {
        console.error(`❌ Error updating Hobbs data for aircraft ${aircraftId}:`, upsertError);
      } else {
        console.log(`✅ Updated Hobbs data for aircraft ${aircraftId}`);
      }
    } else {
      console.log(`⚠️ No Hobbs data found for aircraft ${aircraftId}`);
    }

  } catch (error) {
    console.error(`❌ Error updating Hobbs data for aircraft ${aircraftId}:`, error);
  }
}

// Function to update all aircraft Hobbs data
async function updateAllAircraftHobbs() {
  try {
    console.log('🔧 Updating Hobbs data for all aircraft...');

    // Get all aircraft
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id, callSign');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraft.length} aircraft`);

    // Update Hobbs data for each aircraft
    for (const ac of aircraft) {
      await updateAircraftHobbs(ac.id);
    }

    console.log('✅ Finished updating all aircraft Hobbs data');

  } catch (error) {
    console.error('❌ Error updating all aircraft Hobbs data:', error);
  }
}

// Export functions for use in other scripts
module.exports = {
  updateAircraftHobbs,
  updateAllAircraftHobbs
};

// If run directly, update all aircraft
if (require.main === module) {
  updateAllAircraftHobbs().then(() => {
    console.log('🎉 Update complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });
} 