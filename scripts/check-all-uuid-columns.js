const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllUUIDColumns() {
  console.log('🔍 Checking all columns that might need UUID conversion...');
  
  try {
    // Step 1: Check aircraft_hobbs table specifically
    console.log('📊 Step 1: Checking aircraft_hobbs table...');
    
    try {
      const { data: aircraftHobbs, error: hobbsError } = await supabase
        .from('aircraft_hobbs')
        .select('*')
        .limit(5);

      if (!hobbsError && aircraftHobbs && aircraftHobbs.length > 0) {
        console.log('✅ aircraft_hobbs table structure:');
        console.log(`   Columns: ${Object.keys(aircraftHobbs[0]).join(', ')}`);
        console.log(`   Records: ${aircraftHobbs.length}`);
        
        // Check for ID columns that might need UUID conversion
        const idColumns = Object.keys(aircraftHobbs[0]).filter(col => 
          col.toLowerCase().includes('id') || 
          col.toLowerCase().includes('uuid')
        );
        
        console.log(`   ID columns found: ${idColumns.join(', ')}`);
        
        idColumns.forEach(col => {
          const sampleValue = aircraftHobbs[0][col];
          const dataType = typeof sampleValue;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const isValidUUID = sampleValue && uuidRegex.test(sampleValue);
          
          console.log(`     ${col}: ${sampleValue} (${dataType}) - Valid UUID: ${isValidUUID}`);
        });
      } else {
        console.log('❌ aircraft_hobbs table not found or empty');
        console.log('Error:', hobbsError);
      }
    } catch (err) {
      console.log('❌ Error accessing aircraft_hobbs table:', err.message);
    }

    // Step 2: Check other tables that might have UUID-related columns
    console.log('\n📊 Step 2: Checking other tables...');
    
    const tablesToCheck = [
      'flight_logs',
      'aircraft',
      'icao_reference_type',
      'users',
      'companies',
      'invoices',
      'invoice_items',
      'flight_hours',
      'ppl_course_tranches',
      'user_company_relationships'
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          const columns = Object.keys(data[0]);
          const idColumns = columns.filter(col => 
            col.toLowerCase().includes('id') || 
            col.toLowerCase().includes('uuid')
          );
          
          if (idColumns.length > 0) {
            console.log(`📋 ${tableName}:`);
            console.log(`   ID columns: ${idColumns.join(', ')}`);
            
            idColumns.forEach(col => {
              const sampleValue = data[0][col];
              const dataType = typeof sampleValue;
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              const isValidUUID = sampleValue && uuidRegex.test(sampleValue);
              
              console.log(`     ${col}: ${sampleValue} (${dataType}) - Valid UUID: ${isValidUUID}`);
            });
          }
        }
      } catch (err) {
        // Table doesn't exist or other error, continue
      }
    }

    // Step 3: Generate comprehensive SQL fix commands
    console.log('\n📋 Step 3: Complete SQL Fix Commands');
    console.log('=====================================');
    console.log('');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    
    console.log('-- Fix aircraft_hobbs.last_flight_log_id (if it exists and needs conversion)');
    console.log('ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_last_flight_log_id_fkey";');
    console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN "last_flight_log_id" TYPE uuid USING "last_flight_log_id"::uuid;');
    console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_last_flight_log_id_fkey" FOREIGN KEY ("last_flight_log_id") REFERENCES flight_logs(id);');
    console.log('');
    
    console.log('-- Fix all known foreign key constraints:');
    console.log('');
    console.log('-- Fix flight_logs.aircraftId');
    console.log('ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS "flight_logs_aircraftId_fkey";');
    console.log('ALTER TABLE flight_logs ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE flight_logs ADD CONSTRAINT "flight_logs_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('');
    
    console.log('-- Fix aircraft_hobbs.aircraft_id');
    console.log('ALTER TABLE aircraft_hobbs DROP CONSTRAINT IF EXISTS "aircraft_hobbs_aircraft_id_fkey";');
    console.log('ALTER TABLE aircraft_hobbs ALTER COLUMN "aircraft_id" TYPE uuid USING "aircraft_id"::uuid;');
    console.log('ALTER TABLE aircraft_hobbs ADD CONSTRAINT "aircraft_hobbs_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES aircraft(id);');
    console.log('');
    
    console.log('-- Fix fleet_management.aircraftId');
    console.log('ALTER TABLE fleet_management DROP CONSTRAINT IF EXISTS "fleet_management_aircraftId_fkey";');
    console.log('ALTER TABLE fleet_management ALTER COLUMN "aircraftId" TYPE uuid USING "aircraftId"::uuid;');
    console.log('ALTER TABLE fleet_management ADD CONSTRAINT "fleet_management_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES aircraft(id);');
    console.log('');
    
    console.log('-- Fix icao_reference_type.id');
    console.log('ALTER TABLE icao_reference_type ALTER COLUMN id TYPE uuid USING id::uuid;');
    console.log('');
    
    console.log('-- Fix aircraft.icaoReferenceTypeId');
    console.log('ALTER TABLE aircraft DROP CONSTRAINT IF EXISTS "aircraft_icaoReferenceTypeId_fkey";');
    console.log('ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;');
    console.log('ALTER TABLE aircraft ADD CONSTRAINT "aircraft_icaoReferenceTypeId_fkey" FOREIGN KEY ("icaoReferenceTypeId") REFERENCES icao_reference_type(id);');
    console.log('');

    // Step 4: Discovery queries
    console.log('🔍 Step 4: Discovery Queries');
    console.log('============================');
    console.log('Run these queries to find all columns that might need UUID conversion:');
    console.log('');
    console.log('-- Find all ID columns in all tables');
    console.log(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE (column_name LIKE '%id%' OR column_name LIKE '%uuid%')
      AND table_schema = 'public'
      AND data_type != 'uuid'
      ORDER BY table_name, column_name;
    `);
    console.log('');
    console.log('-- Find all foreign key constraints');
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
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log('');

    // Step 5: Verification queries
    console.log('🔍 Step 5: Verification Queries');
    console.log('===============================');
    console.log('After running the SQL commands, use these queries to verify:');
    console.log('');
    console.log('-- Check all ID column types');
    console.log(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE (column_name LIKE '%id%' OR column_name LIKE '%uuid%')
      AND table_schema = 'public'
      ORDER BY table_name, column_name;
    `);
    console.log('');
    console.log('-- Test aircraft_hobbs relationships');
    console.log(`
      SELECT 
        'aircraft_hobbs' as table_name,
        COUNT(*) as total_records,
        COUNT(ah.aircraft_id) as non_null_aircraft_ids,
        COUNT(a.id) as valid_aircraft_relationships,
        COUNT(ah.last_flight_log_id) as non_null_flight_log_ids,
        COUNT(fl.id) as valid_flight_log_relationships
      FROM aircraft_hobbs ah
      LEFT JOIN aircraft a ON ah.aircraft_id = a.id
      LEFT JOIN flight_logs fl ON ah.last_flight_log_id = fl.id;
    `);

    // Step 6: Summary
    console.log('\n📊 Step 6: Summary');
    console.log('==================');
    console.log('🎯 The aircraft_hobbs.last_flight_log_id column needs to be converted to UUID.');
    console.log('🎯 Execute the SQL commands above in order to fix all UUID-related issues.');
    console.log('🎯 Use the discovery queries to find any other columns that might need conversion.');
    console.log('🎯 Use the verification queries to confirm everything is working correctly.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkAllUUIDColumns(); 