const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixIcaoReferenceTypesCompleteUUID() {
  console.log('🔧 Converting ICAO reference types to proper UUID type (complete solution)...');
  
  try {
    // Step 1: Check current state
    console.log('📊 Step 1: Checking current state...');
    const { data: icaoTypes, error: icaoError } = await supabase
      .from('icao_reference_type')
      .select('*');

    if (icaoError) {
      console.error('❌ Error fetching ICAO types:', icaoError);
      return;
    }

    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('*');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${icaoTypes.length} ICAO reference types`);
    console.log(`📊 Found ${aircraft.length} aircraft records`);

    // Step 2: Validate all IDs are proper UUIDs
    console.log('\n🔍 Step 2: Validating UUID format...');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const invalidIcaoIds = icaoTypes.filter(type => !uuidRegex.test(type.id));
    const invalidAircraftIds = aircraft.filter(aircraft => 
      aircraft.icaoReferenceTypeId && !uuidRegex.test(aircraft.icaoReferenceTypeId)
    );

    if (invalidIcaoIds.length > 0) {
      console.error('❌ Found invalid ICAO type IDs:');
      invalidIcaoIds.forEach(type => {
        console.error(`   ${type.manufacturer} ${type.model}: ${type.id}`);
      });
      return;
    }

    if (invalidAircraftIds.length > 0) {
      console.error('❌ Found invalid aircraft ICAO reference IDs:');
      invalidAircraftIds.forEach(aircraft => {
        console.error(`   ${aircraft.callSign}: ${aircraft.icaoReferenceTypeId}`);
      });
      return;
    }

    console.log('✅ All IDs are valid UUIDs');

    // Step 3: Provide SQL commands to fix the issue
    console.log('\n📋 Step 3: SQL Commands to Execute');
    console.log('===================================');
    console.log('');
    console.log('The issue is that both tables need to be converted to UUID type.');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    console.log('1. First, drop the foreign key constraint:');
    console.log('   ALTER TABLE aircraft DROP CONSTRAINT IF EXISTS "aircraft_icaoReferenceTypeId_fkey";');
    console.log('');
    console.log('2. Convert icao_reference_type.id to UUID:');
    console.log('   ALTER TABLE icao_reference_type ALTER COLUMN id TYPE uuid USING id::uuid;');
    console.log('');
    console.log('3. Convert aircraft.icaoReferenceTypeId to UUID:');
    console.log('   ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;');
    console.log('');
    console.log('4. Recreate the foreign key constraint:');
    console.log('   ALTER TABLE aircraft ADD CONSTRAINT "aircraft_icaoReferenceTypeId_fkey" FOREIGN KEY ("icaoReferenceTypeId") REFERENCES icao_reference_type(id);');
    console.log('');

    // Step 4: Show current relationships
    console.log('\n📋 Step 4: Current Relationships');
    console.log('================================');
    
    const relationships = aircraft.map(aircraft => {
      const icaoType = icaoTypes.find(type => type.id === aircraft.icaoReferenceTypeId);
      return {
        aircraftId: aircraft.id,
        callSign: aircraft.callSign,
        icaoReferenceTypeId: aircraft.icaoReferenceTypeId,
        icaoType: icaoType ? `${icaoType.manufacturer} ${icaoType.model}` : 'NOT FOUND'
      };
    });

    console.log('Current aircraft to ICAO type relationships:');
    relationships.forEach(rel => {
      console.log(`   ${rel.callSign}: ${rel.icaoReferenceTypeId} → ${rel.icaoType}`);
    });

    // Step 5: Verification queries
    console.log('\n🔍 Step 5: Verification Queries');
    console.log('===============================');
    console.log('After running the SQL commands, use these queries to verify:');
    console.log('');
    console.log('1. Check icao_reference_type column type:');
    console.log(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'icao_reference_type' 
      AND column_name = 'id';
    `);
    console.log('');
    console.log('2. Check aircraft column type:');
    console.log(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'aircraft' 
      AND column_name = 'icaoReferenceTypeId';
    `);
    console.log('');
    console.log('3. Test the foreign key relationship:');
    console.log(`
      SELECT 
        a.id,
        a."callSign",
        a."icaoReferenceTypeId",
        icao.manufacturer,
        icao.model,
        icao."typeDesignator"
      FROM aircraft a
      LEFT JOIN icao_reference_type icao ON a."icaoReferenceTypeId" = icao.id
      LIMIT 5;
    `);
    console.log('');
    console.log('Expected results:');
    console.log('- Both columns should show data_type = "uuid"');
    console.log('- The JOIN query should return proper relationships');
    console.log('- No foreign key constraint errors');

    // Step 6: Summary
    console.log('\n📊 Step 6: Summary');
    console.log('==================');
    console.log(`✅ ICAO reference types: ${icaoTypes.length} (all valid UUIDs)`);
    console.log(`✅ Aircraft records: ${aircraft.length} (all valid UUIDs)`);
    console.log(`✅ Relationships: ${relationships.filter(r => r.icaoType !== 'NOT FOUND').length}/${aircraft.length} valid`);
    console.log('');
    console.log('🔧 Action required: Execute the 4 SQL commands above in order');
    console.log('🎯 Result: Both tables will have proper UUID types with working foreign key constraints');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixIcaoReferenceTypesCompleteUUID(); 