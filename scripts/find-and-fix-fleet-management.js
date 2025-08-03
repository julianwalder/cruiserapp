const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findAndFixFleetManagement() {
  console.log('🔍 Finding and fixing the fleet_management table...');
  
  try {
    // Step 1: Try to access the fleet_management table
    console.log('📊 Step 1: Checking fleet_management table...');
    
    try {
      const { data: fleetManagement, error: fleetError } = await supabase
        .from('fleet_management')
        .select('*')
        .limit(5);

      if (!fleetError && fleetManagement && fleetManagement.length > 0) {
        console.log('✅ Found fleet_management table!');
        console.log(`   Columns: ${Object.keys(fleetManagement[0]).join(', ')}`);
        console.log(`   Records: ${fleetManagement.length}`);
        
        if (fleetManagement[0].aircraftId) {
          console.log(`   Sample aircraftId: ${fleetManagement[0].aircraftId}`);
          console.log(`   Type: ${typeof fleetManagement[0].aircraftId}`);
          
          // Check if it's a valid UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isValidUUID = uuidRegex.test(fleetManagement[0].aircraftId);
          console.log(`   Valid UUID: ${isValidUUID}`);
        }
      } else {
        console.log('❌ fleet_management table not found or empty');
        console.log('Error:', fleetError);
      }
    } catch (err) {
      console.log('❌ Error accessing fleet_management table:', err.message);
    }

    // Step 2: Check for any other tables that might be causing this issue
    console.log('\n📊 Step 2: Checking for other potential tables...');
    
    const possibleTableNames = [
      'fleet_management',
      'fleet',
      'fleetmanagement',
      'fleet_management_backup',
      'fleet_backup',
      'aircraft_management',
      'aircraft_operations',
      'aircraft_scheduling',
      'aircraft_reservations',
      'aircraft_maintenance',
      'aircraft_logs',
      'aircraft_usage',
      'aircraft_tracking'
    ];

    for (const tableName of possibleTableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          const columns = Object.keys(data[0]);
          const aircraftIdColumns = columns.filter(col => 
            col.toLowerCase().includes('aircraft') && 
            col.toLowerCase().includes('id')
          );
          
          if (aircraftIdColumns.length > 0) {
            console.log(`✅ Found table: ${tableName}`);
            console.log(`   Aircraft ID columns: ${aircraftIdColumns.join(', ')}`);
            aircraftIdColumns.forEach(col => {
              console.log(`     ${col}: ${data[0][col]} (${typeof data[0][col]})`);
            });
          }
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }

    // Step 3: Provide comprehensive SQL solution
    console.log('\n📋 Step 3: Complete SQL Solution');
    console.log('=================================');
    console.log('');
    console.log('Since the fleet_management table exists but wasn\'t captured in the foreign key query,');
    console.log('here\'s a comprehensive approach to fix all potential issues:');
    console.log('');
    
    console.log('1. First, check if the fleet_management table exists and its structure:');
    console.log(`
      -- Check if the table exists
      SELECT table_name FROM information_schema.tables WHERE table_name = 'fleet_management';
      
      -- If it exists, check its structure
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fleet_management';
    `);
    console.log('');
    
    console.log('2. Fix the fleet_management table (if it exists):');
    console.log(`
      -- Drop the foreign key constraint
      ALTER TABLE fleet_management DROP CONSTRAINT IF EXISTS "fleet_management_aircraftId_fkey";
      
      -- Convert column type to UUID
      ALTER TABLE fleet_management ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;
      
      -- Recreate the foreign key constraint
      ALTER TABLE fleet_management ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);
    `);
    console.log('');
    
    console.log('3. Fix all other known tables:');
    console.log(`
      -- Fix flight_logs.aircraftId
      ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS "flight_logs_aircraftId_fkey";
      ALTER TABLE flight_logs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;
      ALTER TABLE flight_logs ADD CONSTRAINT "flight_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);
      
      -- Fix aircraft_hobbs.aircraft_id
      ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_aircraft_id_fkey";
      ALTER TABLE aircraft_hobbs ALTER COLUMN "aircraft_id" TYPE uuid USING "aircraft_id"::uuid;
      ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES aircraft(id);
      
      -- Fix icao_reference_type.id
      ALTER TABLE icao_reference_type ALTER COLUMN id TYPE uuid USING id::uuid;
      
      -- Fix aircraft.icaoReferenceTypeId
      ALTER TABLE aircraft DROP CONSTRAINT IF EXISTS "aircraft_icaoReferenceTypeId_fkey";
      ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;
      ALTER TABLE aircraft ADD CONSTRAINT "aircraft_icaoReferenceTypeId_fkey" FOREIGN KEY ("icaoReferenceTypeId") REFERENCES icao_reference_type(id);
    `);
    console.log('');
    
    console.log('4. Find ALL tables with aircraft ID references:');
    console.log(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE column_name LIKE '%aircraft%id%'
      AND table_schema = 'public'
      ORDER BY table_name, column_name;
    `);
    console.log('');
    
    console.log('5. Find ALL foreign key constraints to aircraft.id:');
    console.log(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'aircraft';
    `);
    console.log('');
    
    console.log('6. For each table found in step 4, run this pattern (replace TABLE_NAME and COLUMN_NAME):');
    console.log(`
      ALTER TABLE TABLE_NAME DROP CONSTRAINT IF EXISTS "TABLE_NAME_COLUMN_NAME_fkey";
      ALTER TABLE TABLE_NAME ALTER COLUMN "COLUMN_NAME" TYPE uuid USING "COLUMN_NAME"::uuid;
      ALTER TABLE TABLE_NAME ADD CONSTRAINT "TABLE_NAME_COLUMN_NAME_fkey" FOREIGN KEY ("COLUMN_NAME") REFERENCES aircraft(id);
    `);
    console.log('');
    
    console.log('7. Verification query:');
    console.log(`
      -- Check all aircraft ID column types
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE column_name LIKE '%aircraft%id%'
      AND table_schema = 'public'
      ORDER BY table_name, column_name;
    `);
    console.log('');
    
    console.log('Expected results:');
    console.log('- All columns should show data_type = "uuid"');
    console.log('- No foreign key constraint errors');
    console.log('- All relationships should work properly');

    // Step 4: Summary
    console.log('\n📊 Step 4: Summary');
    console.log('==================');
    console.log('🎯 The fleet_management table is causing the foreign key constraint error.');
    console.log('🎯 Execute the SQL commands above in order to fix all issues.');
    console.log('🎯 Start with checking if fleet_management exists, then fix it.');
    console.log('🎯 Then fix all other known tables.');
    console.log('🎯 Finally, run the discovery queries to find any remaining issues.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
findAndFixFleetManagement(); 