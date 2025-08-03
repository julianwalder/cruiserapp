const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function fixIcaoReferenceTypesDirect() {
  console.log('🔧 Converting ICAO reference types from text IDs to UUIDs (direct approach)...');
  
  try {
    // Step 1: Get all current ICAO reference types
    console.log('📊 Step 1: Fetching current ICAO reference types...');
    const { data: currentIcaoTypes, error: currentError } = await supabase
      .from('icao_reference_type')
      .select('*');

    if (currentError) {
      console.error('❌ Error fetching current ICAO reference types:', currentError);
      return;
    }

    console.log(`📊 Found ${currentIcaoTypes.length} ICAO reference types`);

    // Step 2: Get all aircraft records
    console.log('\n📊 Step 2: Fetching aircraft records...');
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('*');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraft.length} aircraft records`);

    // Step 3: Create mapping from old text IDs to new UUIDs
    console.log('\n🔗 Step 3: Creating ID mapping...');
    const idMapping = new Map();

    currentIcaoTypes.forEach(icaoType => {
      const newUUID = generateUUID();
      idMapping.set(icaoType.id, newUUID);
      console.log(`   ${icaoType.manufacturer} ${icaoType.model}: ${icaoType.id} → ${newUUID}`);
    });

    console.log(`🔗 Created ${idMapping.size} ID mappings`);

    // Step 4: Temporarily disable foreign key constraints and update ICAO types
    console.log('\n🔄 Step 4: Updating ICAO reference types...');
    
    // Since we can't easily disable constraints via Supabase client, let's try a different approach
    // We'll update the ICAO types one by one with a temporary ID first
    
    let updatedIcaoCount = 0;
    for (const icaoType of currentIcaoTypes) {
      try {
        const newUUID = idMapping.get(icaoType.id);
        
        // Update the ICAO type with the new UUID
        const { error: updateError } = await supabase
          .from('icao_reference_type')
          .update({ id: newUUID })
          .eq('id', icaoType.id);

        if (updateError) {
          console.error(`❌ Error updating ICAO type ${icaoType.id}:`, updateError);
        } else {
          updatedIcaoCount++;
          console.log(`✅ Updated ICAO type: ${icaoType.manufacturer} ${icaoType.model} (${icaoType.id} → ${newUUID})`);
        }

      } catch (error) {
        console.error(`❌ Error processing ICAO type ${icaoType.id}:`, error);
      }
    }

    console.log(`✅ Updated ${updatedIcaoCount} ICAO reference types`);

    // Step 5: Update aircraft references
    console.log('\n🔄 Step 5: Updating aircraft references...');
    let updatedAircraftCount = 0;
    let errorCount = 0;

    for (const aircraftRecord of aircraft) {
      try {
        const oldIcaoId = aircraftRecord.icaoReferenceTypeId;
        const newIcaoId = idMapping.get(oldIcaoId);

        if (!newIcaoId) {
          console.log(`⚠️ No mapping found for aircraft ${aircraftRecord.id} with icaoReferenceTypeId ${oldIcaoId}`);
          errorCount++;
          continue;
        }

        const { error: updateError } = await supabase
          .from('aircraft')
          .update({ icaoReferenceTypeId: newIcaoId })
          .eq('id', aircraftRecord.id);

        if (updateError) {
          console.error(`❌ Error updating aircraft ${aircraftRecord.id}:`, updateError);
          errorCount++;
        } else {
          updatedAircraftCount++;
          console.log(`✅ Updated aircraft ${aircraftRecord.callSign}: ${oldIcaoId} → ${newIcaoId}`);
        }

      } catch (error) {
        console.error(`❌ Error processing aircraft ${aircraftRecord.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Updated ${updatedAircraftCount} aircraft references`);

    // Step 6: Verification
    console.log('\n🔍 Step 6: Verification...');
    
    // Check ICAO reference types
    const { data: finalIcaoTypes, error: finalIcaoError } = await supabase
      .from('icao_reference_type')
      .select('*');

    if (finalIcaoError) {
      console.error('❌ Error fetching final ICAO reference types:', finalIcaoError);
    } else {
      console.log(`📊 Final ICAO reference types count: ${finalIcaoTypes.length}`);
      
      // Check if they have UUID format
      const uuidFormatCount = finalIcaoTypes.filter(type => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(type.id)
      ).length;
      
      console.log(`✅ ICAO reference types with UUID format: ${uuidFormatCount}/${finalIcaoTypes.length}`);
      
      if (uuidFormatCount === finalIcaoTypes.length) {
        console.log('🎉 All ICAO reference types now have UUID format!');
      } else {
        console.log('⚠️ Some ICAO reference types still have non-UUID format');
      }
    }

    // Check aircraft relationships
    const { data: finalAircraft, error: finalAircraftError } = await supabase
      .from('aircraft')
      .select(`
        id,
        icaoReferenceTypeId,
        callSign,
        icao_reference_type (
          id,
          manufacturer,
          model,
          typeDesignator
        )
      `);

    if (finalAircraftError) {
      console.error('❌ Error fetching final aircraft:', finalAircraftError);
    } else {
      console.log(`📊 Final aircraft count: ${finalAircraft.length}`);
      
      const workingRelationships = finalAircraft.filter(aircraft => 
        aircraft.icao_reference_type !== null
      ).length;
      
      console.log(`✅ Aircraft with working relationships: ${workingRelationships}/${finalAircraft.length}`);
      
      if (workingRelationships === finalAircraft.length) {
        console.log('🎉 All aircraft now have working ICAO reference type relationships!');
      } else {
        console.log('⚠️ Some aircraft have broken relationships');
      }

      // Show sample relationships
      console.log('\n📋 Sample aircraft relationships:');
      finalAircraft.slice(0, 3).forEach((aircraft, index) => {
        console.log(`\nAircraft ${index + 1}:`);
        console.log(`   id: ${aircraft.id}`);
        console.log(`   callSign: ${aircraft.callSign}`);
        console.log(`   icaoReferenceTypeId: ${aircraft.icaoReferenceTypeId}`);
        if (aircraft.icao_reference_type) {
          console.log(`   icao_reference_type: ${aircraft.icao_reference_type.manufacturer} ${aircraft.icao_reference_type.model} (${aircraft.icao_reference_type.typeDesignator})`);
        } else {
          console.log(`   icao_reference_type: NULL (broken relationship)`);
        }
      });
    }

    // Step 7: Summary
    console.log('\n📊 Step 7: Migration Summary');
    console.log('================================');
    console.log(`✅ ICAO reference types converted: ${updatedIcaoCount}`);
    console.log(`✅ Aircraft references updated: ${updatedAircraftCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total aircraft processed: ${aircraft.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixIcaoReferenceTypesDirect(); 