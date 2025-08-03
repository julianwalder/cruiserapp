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

async function fixIcaoReferenceTypesUUID() {
  console.log('🔧 Converting ICAO reference types from text IDs to UUIDs...');
  
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
    const newIcaoTypes = [];

    currentIcaoTypes.forEach(icaoType => {
      const newUUID = generateUUID();
      idMapping.set(icaoType.id, newUUID);
      
      newIcaoTypes.push({
        id: newUUID,
        manufacturer: icaoType.manufacturer,
        model: icaoType.model,
        typeDesignator: icaoType.typeDesignator,
        description: icaoType.description,
        engineType: icaoType.engineType,
        engineCount: icaoType.engineCount,
        wtc: icaoType.wtc,
        createdAt: icaoType.createdAt,
        updatedAt: icaoType.updatedAt
      });
    });

    console.log(`🔗 Created ${idMapping.size} ID mappings`);

    // Step 4: Clear existing ICAO reference types
    console.log('\n🗑️ Step 4: Clearing existing ICAO reference types...');
    const { error: deleteError } = await supabase
      .from('icao_reference_type')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error deleting existing ICAO reference types:', deleteError);
      return;
    }

    console.log('✅ Cleared existing ICAO reference types');

    // Step 5: Insert new ICAO reference types with UUIDs
    console.log('\n🔄 Step 5: Inserting new ICAO reference types with UUIDs...');
    const { error: insertError } = await supabase
      .from('icao_reference_type')
      .insert(newIcaoTypes);

    if (insertError) {
      console.error('❌ Error inserting new ICAO reference types:', insertError);
      return;
    }

    console.log(`✅ Inserted ${newIcaoTypes.length} new ICAO reference types with UUIDs`);

    // Step 6: Update aircraft references
    console.log('\n🔄 Step 6: Updating aircraft references...');
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
          if (updatedAircraftCount % 5 === 0) {
            console.log(`✅ Updated ${updatedAircraftCount} aircraft references...`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing aircraft ${aircraftRecord.id}:`, error);
        errorCount++;
      }
    }

    // Step 7: Verification
    console.log('\n🔍 Step 7: Verification...');
    
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

    // Step 8: Summary
    console.log('\n📊 Step 8: Migration Summary');
    console.log('================================');
    console.log(`✅ ICAO reference types converted: ${newIcaoTypes.length}`);
    console.log(`✅ Aircraft references updated: ${updatedAircraftCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total aircraft processed: ${aircraft.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixIcaoReferenceTypesUUID(); 