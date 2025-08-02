const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function populateAircraftHobbsUUIDs() {
  try {
    console.log('🔧 Populating aircraft_hobbs table with UUID data...');

    // Get all aircraft with their UUID IDs
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id, id_uuid, callSign');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraft.length} aircraft`);

    // For each aircraft, find the latest flight log with Hobbs data
    for (const ac of aircraft) {
      console.log(`🔍 Processing aircraft ${ac.callSign} (${ac.id})...`);

      // Find the latest flight log with arrival Hobbs for this aircraft using UUID
      const { data: latestLog, error: logError } = await supabase
        .from('flight_logs')
        .select('id, id_uuid, arrivalHobbs, date')
        .eq('aircraftId', ac.id) // Use the original TEXT ID for now
        .not('arrivalHobbs', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (logError && logError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error(`❌ Error fetching latest log for ${ac.callSign}:`, logError);
        continue;
      }

      if (latestLog) {
        console.log(`✅ Found latest Hobbs for ${ac.callSign}: ${latestLog.arrivalHobbs} hours on ${latestLog.date}`);

        // Insert or update the aircraft_hobbs record using UUIDs
        const { error: upsertError } = await supabase
          .from('aircraft_hobbs')
          .upsert({
            aircraft_id: ac.id_uuid,
            last_hobbs_reading: parseFloat(latestLog.arrivalHobbs),
            last_hobbs_date: latestLog.date,
            last_flight_log_id: latestLog.id_uuid
          }, {
            onConflict: 'aircraft_id'
          });

        if (upsertError) {
          console.error(`❌ Error upserting Hobbs data for ${ac.callSign}:`, upsertError);
        } else {
          console.log(`✅ Updated Hobbs data for ${ac.callSign}`);
        }
      } else {
        console.log(`⚠️ No Hobbs data found for ${ac.callSign}`);
      }
    }

    console.log('✅ Finished populating aircraft_hobbs table with UUIDs');

  } catch (error) {
    console.error('❌ Error populating aircraft_hobbs table:', error);
  }
}

// Run the population
populateAircraftHobbsUUIDs().then(() => {
  console.log('🎉 Population complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Population failed:', error);
  process.exit(1);
}); 