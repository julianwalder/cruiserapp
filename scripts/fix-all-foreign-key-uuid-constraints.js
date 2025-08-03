const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllForeignKeyUUIDConstraints() {
  console.log('🔧 Fixing all foreign key UUID constraint issues...');
  
  try {
    // Step 1: Check all tables that might reference aircraft.id
    console.log('📊 Step 1: Identifying tables that reference aircraft.id...');
    
    const tablesToCheck = [
      'fleet_management',
      'aircraft_hobbs',
      'flight_logs',
      'maintenance_logs',
      'scheduling',
      'reservations'
    ];

    const foreignKeyIssues = [];

    for (const tableName of tablesToCheck) {
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
            foreignKeyIssues.push({
              table: tableName,
              columns: aircraftIdColumns,
              sampleValue: data[0][aircraftIdColumns[0]]
            });
          }
        }
      } catch (err) {
        // Table doesn't exist or other error, continue
      }
    }

    console.log(`📊 Found ${foreignKeyIssues.length} tables with potential aircraft ID references:`);
    foreignKeyIssues.forEach(issue => {
      console.log(`   ${issue.table}: ${issue.columns.join(', ')}`);
      if (issue.sampleValue) {
        console.log(`     Sample value: ${issue.sampleValue}`);
      }
    });

    // Step 2: Check specific tables we know about
    console.log('\n📊 Step 2: Checking specific known tables...');
    
    // Check fleet_management table
    try {
      const { data: fleetManagement, error: fleetError } = await supabase
        .from('fleet_management')
        .select('*')
        .limit(5);

      if (!fleetError && fleetManagement && fleetManagement.length > 0) {
        console.log('📋 fleet_management table:');
        console.log(`   Columns: ${Object.keys(fleetManagement[0]).join(', ')}`);
        console.log(`   Records: ${fleetManagement.length}`);
        
        if (fleetManagement[0].aircraftId) {
          console.log(`   Sample aircraftId: ${fleetManagement[0].aircraftId}`);
          console.log(`   Type: ${typeof fleetManagement[0].aircraftId}`);
        }
      }
    } catch (err) {
      console.log('   fleet_management table not found or error');
    }

    // Check aircraft_hobbs table
    try {
      const { data: aircraftHobbs, error: hobbsError } = await supabase
        .from('aircraft_hobbs')
        .select('*')
        .limit(5);

      if (!hobbsError && aircraftHobbs && aircraftHobbs.length > 0) {
        console.log('📋 aircraft_hobbs table:');
        console.log(`   Columns: ${Object.keys(aircraftHobbs[0]).join(', ')}`);
        console.log(`   Records: ${aircraftHobbs.length}`);
        
        if (aircraftHobbs[0].aircraftId) {
          console.log(`   Sample aircraftId: ${aircraftHobbs[0].aircraftId}`);
          console.log(`   Type: ${typeof aircraftHobbs[0].aircraftId}`);
        }
      }
    } catch (err) {
      console.log('   aircraft_hobbs table not found or error');
    }

    // Step 3: Provide comprehensive SQL fix
    console.log('\n📋 Step 3: Complete SQL Fix Commands');
    console.log('=====================================');
    console.log('');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    console.log('-- Step 1: Drop all foreign key constraints that reference aircraft.id');
    console.log('ALTER TABLE fleet_management DROP CONSTRAINT IF EXISTS "fleet_management_aircraftId_fkey";');
    console.log('ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_aircraftId_fkey";');
    console.log('ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS "flight_logs_aircraftId_fkey";');
    console.log('ALTER TABLE maintenance_logs DROP CONSTRAINT IF EXISTS "maintenance_logs_aircraftId_fkey";');
    console.log('ALTER TABLE scheduling DROP CONSTRAINT IF EXISTS "scheduling_aircraftId_fkey";');
    console.log('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS "reservations_aircraftId_fkey";');
    console.log('');
    console.log('-- Step 2: Convert all aircraft ID columns to UUID type');
    console.log('ALTER TABLE fleet_management ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE flight_logs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE maintenance_logs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE scheduling ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE reservations ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('');
    console.log('-- Step 3: Recreate all foreign key constraints');
    console.log('ALTER TABLE fleet_management ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('ALTER TABLE flight_logs ADD CONSTRAINT "flight_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('ALTER TABLE maintenance_logs ADD CONSTRAINT "maintenance_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('ALTER TABLE scheduling ADD CONSTRAINT "scheduling_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('ALTER TABLE reservations ADD CONSTRAINT "reservations_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('');

    // Step 4: Verification queries
    console.log('🔍 Step 4: Verification Queries');
    console.log('===============================');
    console.log('After running the SQL commands, use these queries to verify:');
    console.log('');
    console.log('-- Check all aircraft ID column types');
    console.log(`
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
    console.log('-- Test foreign key relationships');
    console.log(`
      SELECT 
        'fleet_management' as table_name,
        COUNT(*) as record_count,
        COUNT(fm."aircraftId") as non_null_count
      FROM fleet_management fm
      LEFT JOIN aircraft a ON fm."aircraftId" = a.id
      WHERE a.id IS NOT NULL
      UNION ALL
      SELECT 
        'aircraft_hobbs' as table_name,
        COUNT(*) as record_count,
        COUNT(ah."aircraftId") as non_null_count
      FROM aircraft_hobbs ah
      LEFT JOIN aircraft a ON ah."aircraftId" = a.id
      WHERE a.id IS NOT NULL;
    `);
    console.log('');
    console.log('Expected results:');
    console.log('- All aircraft ID columns should show data_type = "uuid"');
    console.log('- All foreign key relationships should work without errors');
    console.log('- Record counts should match expected values');

    // Step 5: Summary
    console.log('\n📊 Step 5: Summary');
    console.log('==================');
    console.log('🔧 Action required: Execute the SQL commands above in order');
    console.log('🎯 Result: All tables will have proper UUID types with working foreign key constraints');
    console.log('⚠️ Note: This will fix all aircraft ID foreign key constraint issues');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixAllForeignKeyUUIDConstraints(); 