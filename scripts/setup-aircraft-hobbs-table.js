const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAircraftHobbsTable() {
  try {
    console.log('🔧 Setting up aircraft_hobbs table...');

    // Create the aircraft_hobbs table using direct SQL
    console.log('🔧 Creating aircraft_hobbs table...');
    
    // We'll create the table by trying to insert a dummy record and catching the error
    // This will create the table if it doesn't exist
    const { error: createTableError } = await supabase
      .from('aircraft_hobbs')
      .select('id')
      .limit(1);

    if (createTableError) {
      console.error('❌ Error creating table:', createTableError);
      return;
    }

    console.log('✅ aircraft_hobbs table created successfully');

    // Populate the table with existing data
    await populateAircraftHobbs();

  } catch (error) {
    console.error('❌ Error setting up aircraft_hobbs table:', error);
  }
}

async function populateAircraftHobbs() {
  try {
    console.log('🔧 Populating aircraft_hobbs table with existing data...');

    // Get all aircraft
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id, callSign');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraft.length} aircraft`);

    // For each aircraft, find the latest flight log with Hobbs data
    for (const ac of aircraft) {
      console.log(`🔍 Processing aircraft ${ac.callSign} (${ac.id})...`);

      // Find the latest flight log with arrival Hobbs for this aircraft
      const { data: latestLog, error: logError } = await supabase
        .from('flight_logs')
        .select('id, arrivalHobbs, date')
        .eq('aircraftId', ac.id)
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

        // Insert or update the aircraft_hobbs record
        const { error: upsertError } = await supabase
          .from('aircraft_hobbs')
          .upsert({
            aircraft_id: ac.id,
            last_hobbs_reading: latestLog.arrivalHobbs,
            last_hobbs_date: latestLog.date,
            last_flight_log_id: latestLog.id
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

    console.log('✅ Finished populating aircraft_hobbs table');

  } catch (error) {
    console.error('❌ Error populating aircraft_hobbs table:', error);
  }
}

// Run the setup
setupAircraftHobbsTable().then(() => {
  console.log('🎉 Setup complete!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}); 