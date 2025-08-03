const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAircraftHobbsUUIDMapping() {
  console.log('🔧 Converting aircraft_hobbs.aircraft_id from text IDs to UUIDs...');
  
  try {
    // Step 1: Get current data
    console.log('📊 Step 1: Fetching current data...');
    
    const { data: aircraftHobbs, error: hobbsError } = await supabase
      .from('aircraft_hobbs')
      .select('*');

    if (hobbsError) {
      console.error('❌ Error fetching aircraft_hobbs:', hobbsError);
      return;
    }

    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('*');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraftHobbs.length} aircraft_hobbs records`);
    console.log(`📊 Found ${aircraft.length} aircraft records`);

    // Step 2: Check if we have backup data to map old IDs
    console.log('\n📊 Step 2: Checking for backup data...');
    
    const { data: aircraftBackup, error: backupError } = await supabase
      .from('aircraft_backup')
      .select('*');

    if (backupError) {
      console.error('❌ Error fetching aircraft_backup:', backupError);
      console.log('⚠️ No backup data available for mapping');
    } else {
      console.log(`📊 Found ${aircraftBackup.length} aircraft_backup records`);
    }

    // Step 3: Create mapping from old text IDs to new UUIDs
    console.log('\n🔗 Step 3: Creating ID mapping...');
    
    const idMapping = new Map();
    
    if (aircraftBackup && aircraftBackup.length > 0) {
      // Map using backup data
      aircraftBackup.forEach(backupAircraft => {
        const currentAircraft = aircraft.find(current => 
          current.callSign === backupAircraft.callSign ||
          current.serialNumber === backupAircraft.serialNumber
        );
        
        if (currentAircraft) {
          idMapping.set(backupAircraft.id, currentAircraft.id);
          console.log(`   ${backupAircraft.callSign}: ${backupAircraft.id} → ${currentAircraft.id}`);
        }
      });
    } else {
      // Try to map using callSign or other identifying fields
      console.log('⚠️ No backup data - attempting to map using callSign...');
      
      // This is a fallback - we'll need to manually map or use a different approach
      console.log('📋 Manual mapping required. Please provide the mapping manually.');
      console.log('');
      console.log('Current aircraft_hobbs.aircraft_id values:');
      aircraftHobbs.forEach(hobbs => {
        console.log(`   ${hobbs.aircraft_id}`);
      });
      console.log('');
      console.log('Current aircraft.id values:');
      aircraft.forEach(ac => {
        console.log(`   ${ac.callSign}: ${ac.id}`);
      });
    }

    console.log(`🔗 Created ${idMapping.size} ID mappings`);

    if (idMapping.size === 0) {
      console.log('❌ No mappings found. Manual intervention required.');
      console.log('');
      console.log('📋 Manual SQL commands to execute:');
      console.log('');
      console.log('You need to manually update the aircraft_id values in aircraft_hobbs table.');
      console.log('Example:');
      console.log('');
      console.log('UPDATE aircraft_hobbs SET aircraft_id = \'new-uuid-here\' WHERE aircraft_id = \'old-text-id-here\';');
      console.log('');
      console.log('After manual updates, run:');
      console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN aircraft_id TYPE uuid USING aircraft_id::uuid;');
      console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraft_id_fkey" FOREIGN KEY (aircraft_id) REFERENCES aircraft(id);');
      return;
    }

    // Step 4: Update aircraft_hobbs with new UUIDs
    console.log('\n🔄 Step 4: Updating aircraft_hobbs with new UUIDs...');
    
    let updatedCount = 0;
    let errorCount = 0;

    for (const hobbsRecord of aircraftHobbs) {
      try {
        const oldId = hobbsRecord.aircraft_id;
        const newId = idMapping.get(oldId);

        if (!newId) {
          console.log(`⚠️ No mapping found for aircraft_hobbs record ${hobbsRecord.id} with aircraft_id ${oldId}`);
          errorCount++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('aircraft_hobbs')
          .update({ aircraft_id: newId })
          .eq('id', hobbsRecord.id);

        if (updateError) {
          console.error(`❌ Error updating aircraft_hobbs ${hobbsRecord.id}:`, updateError);
          errorCount++;
        } else {
          updatedCount++;
          console.log(`✅ Updated aircraft_hobbs ${hobbsRecord.id}: ${oldId} → ${newId}`);
        }

      } catch (error) {
        console.error(`❌ Error processing aircraft_hobbs ${hobbsRecord.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} aircraft_hobbs records`);
    console.log(`❌ Errors: ${errorCount} records`);

    // Step 5: Now convert column type to UUID
    console.log('\n🔄 Step 5: Converting column type to UUID...');
    console.log('');
    console.log('After the updates above, run these SQL commands:');
    console.log('');
    console.log('-- Drop the foreign key constraint');
    console.log('ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_aircraft_id_fkey";');
    console.log('');
    console.log('-- Convert column type to UUID');
    console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN aircraft_id TYPE uuid USING aircraft_id::uuid;');
    console.log('');
    console.log('-- Recreate the foreign key constraint');
    console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraft_id_fkey" FOREIGN KEY (aircraft_id) REFERENCES aircraft(id);');
    console.log('');

    // Step 6: Summary
    console.log('\n📊 Step 6: Summary');
    console.log('==================');
    console.log(`✅ aircraft_hobbs records: ${aircraftHobbs.length}`);
    console.log(`✅ Updated records: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🔗 ID mappings: ${idMapping.size}`);
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Verify the updates above');
    console.log('2. Run the SQL commands to convert column type');
    console.log('3. Test the foreign key relationships');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixAircraftHobbsUUIDMapping(); 