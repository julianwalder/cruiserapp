const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSpecificAircraftForeignKeys() {
  console.log('🔧 Fixing specific aircraft foreign key constraint issues...');
  
  try {
    // Step 1: Check current state of problematic tables
    console.log('📊 Step 1: Checking current state...');
    
    // Check aircraft_hobbs table
    const { data: aircraftHobbs, error: hobbsError } = await supabase
      .from('aircraft_hobbs')
      .select('*')
      .limit(5);

    if (!hobbsError && aircraftHobbs && aircraftHobbs.length > 0) {
      console.log('📋 aircraft_hobbs table:');
      console.log(`   Columns: ${Object.keys(aircraftHobbs[0]).join(', ')}`);
      console.log(`   Records: ${aircraftHobbs.length}`);
      console.log(`   Sample aircraft_id: ${aircraftHobbs[0].aircraft_id}`);
      console.log(`   Type: ${typeof aircraftHobbs[0].aircraft_id}`);
    }

    // Check flight_logs table
    const { data: flightLogs, error: logsError } = await supabase
      .from('flight_logs')
      .select('*')
      .limit(5);

    if (!logsError && flightLogs && flightLogs.length > 0) {
      console.log('📋 flight_logs table:');
      console.log(`   Columns: ${Object.keys(flightLogs[0]).join(', ')}`);
      console.log(`   Records: ${flightLogs.length}`);
      console.log(`   Sample aircraftId: ${flightLogs[0].aircraftId}`);
      console.log(`   Type: ${typeof flightLogs[0].aircraftId}`);
    }

    // Step 2: Validate UUID format
    console.log('\n🔍 Step 2: Validating UUID format...');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let allValid = true;
    
    if (aircraftHobbs && aircraftHobbs.length > 0) {
      const invalidHobbs = aircraftHobbs.filter(record => 
        record.aircraft_id && !uuidRegex.test(record.aircraft_id)
      );
      if (invalidHobbs.length > 0) {
        console.error('❌ Invalid UUIDs in aircraft_hobbs:');
        invalidHobbs.forEach(record => {
          console.error(`   aircraft_id: ${record.aircraft_id}`);
        });
        allValid = false;
      } else {
        console.log('✅ All aircraft_hobbs.aircraft_id values are valid UUIDs');
      }
    }

    if (flightLogs && flightLogs.length > 0) {
      const invalidLogs = flightLogs.filter(record => 
        record.aircraftId && !uuidRegex.test(record.aircraftId)
      );
      if (invalidLogs.length > 0) {
        console.error('❌ Invalid UUIDs in flight_logs:');
        invalidLogs.forEach(record => {
          console.error(`   aircraftId: ${record.aircraftId}`);
        });
        allValid = false;
      } else {
        console.log('✅ All flight_logs.aircraftId values are valid UUIDs');
      }
    }

    if (!allValid) {
      console.log('❌ Cannot proceed - some values are not valid UUIDs');
      return;
    }

    // Step 3: Provide targeted SQL fix
    console.log('\n📋 Step 3: Targeted SQL Fix Commands');
    console.log('=====================================');
    console.log('');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    console.log('-- Step 1: Drop the specific foreign key constraints');
    console.log('ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_aircraft_id_fkey";');
    console.log('ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS "flight_logs_aircraftId_fkey";');
    console.log('');
    console.log('-- Step 2: Convert the specific columns to UUID type');
    console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN aircraft_id TYPE uuid USING aircraft_id::uuid;');
    console.log('ALTER TABLE flight_logs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('');
    console.log('-- Step 3: Recreate the foreign key constraints');
    console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraft_id_fkey" FOREIGN KEY (aircraft_id) REFERENCES aircraft(id);');
    console.log('ALTER TABLE flight_logs ADD CONSTRAINT "flight_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('');

    // Step 4: Verification queries
    console.log('🔍 Step 4: Verification Queries');
    console.log('===============================');
    console.log('After running the SQL commands, use these queries to verify:');
    console.log('');
    console.log('-- Check column types');
    console.log(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE (table_name = 'aircraft_hobbs' AND column_name = 'aircraft_id')
         OR (table_name = 'flight_logs' AND column_name = 'aircraftId')
      ORDER BY table_name, column_name;
    `);
    console.log('');
    console.log('-- Test foreign key relationships');
    console.log(`
      SELECT 
        'aircraft_hobbs' as table_name,
        COUNT(*) as total_records,
        COUNT(ah.aircraft_id) as non_null_aircraft_ids,
        COUNT(a.id) as valid_relationships
      FROM aircraft_hobbs ah
      LEFT JOIN aircraft a ON ah.aircraft_id = a.id
      UNION ALL
      SELECT 
        'flight_logs' as table_name,
        COUNT(*) as total_records,
        COUNT(fl."aircraftId") as non_null_aircraft_ids,
        COUNT(a.id) as valid_relationships
      FROM flight_logs fl
      LEFT JOIN aircraft a ON fl."aircraftId" = a.id;
    `);
    console.log('');
    console.log('Expected results:');
    console.log('- Both columns should show data_type = "uuid"');
    console.log('- valid_relationships should equal non_null_aircraft_ids');
    console.log('- No foreign key constraint errors');

    // Step 5: Summary
    console.log('\n📊 Step 5: Summary');
    console.log('==================');
    console.log(`✅ aircraft_hobbs: ${aircraftHobbs?.length || 0} records`);
    console.log(`✅ flight_logs: ${flightLogs?.length || 0} records`);
    console.log('🔧 Action required: Execute the 6 SQL commands above in order');
    console.log('🎯 Result: Both tables will have proper UUID types with working foreign key constraints');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixSpecificAircraftForeignKeys(); 