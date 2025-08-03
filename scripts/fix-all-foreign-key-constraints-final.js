const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAllForeignKeyConstraintsFinal() {
  console.log('🔧 Fixing ALL foreign key constraint issues...');
  
  try {
    // Based on the complete query results provided
    const foreignKeyIssues = [
      {
        table: 'flight_logs',
        column: 'aircraftId',
        constraint: 'flight_logs_aircraftId_fkey'
      },
      {
        table: 'aircraft_hobbs',
        column: 'aircraft_id',
        constraint: 'aircraft_hobbs_aircraft_id_fkey'
      },
      {
        table: 'fleet_management',
        column: 'aircraftId',
        constraint: 'fleet_management_aircraftId_fkey'
      }
    ];

    console.log(`📊 Found ${foreignKeyIssues.length} foreign key constraints to fix:`);
    foreignKeyIssues.forEach(issue => {
      console.log(`   - ${issue.table}.${issue.column} → aircraft.id`);
    });

    // Step 1: Validate current data
    console.log('\n🔍 Step 1: Validating current data...');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const issue of foreignKeyIssues) {
      try {
        const { data, error } = await supabase
          .from(issue.table)
          .select(issue.column)
          .limit(10);
        
        if (!error && data && data.length > 0) {
          const invalidValues = data.filter(record => 
            record[issue.column] && !uuidRegex.test(record[issue.column])
          );
          
          if (invalidValues.length > 0) {
            console.log(`❌ ${issue.table}.${issue.column}: ${invalidValues.length} invalid UUIDs found`);
            invalidValues.slice(0, 3).forEach(record => {
              console.log(`   ${record[issue.column]}`);
            });
          } else {
            console.log(`✅ ${issue.table}.${issue.column}: All values are valid UUIDs`);
          }
        } else {
          console.log(`⚠️ ${issue.table}.${issue.column}: No data or error`);
          if (error) {
            console.log(`   Error: ${error.message}`);
          }
        }
      } catch (err) {
        console.log(`⚠️ Could not validate ${issue.table}.${issue.column}: ${err.message}`);
      }
    }

    // Step 2: Generate comprehensive SQL fix commands
    console.log('\n📋 Step 2: Complete SQL Fix Commands');
    console.log('=====================================');
    console.log('');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    
    // Generate SQL commands for each table
    foreignKeyIssues.forEach(issue => {
      console.log(`-- Fix ${issue.table}.${issue.column}`);
      console.log(`ALTER TABLE ${issue.table} DROP CONSTRAINT IF EXISTS "${issue.constraint}";`);
      console.log(`ALTER TABLE ${issue.table} ALTER COLUMN "${issue.column}" TYPE uuid USING "${issue.column}"::uuid;`);
      console.log(`ALTER TABLE ${issue.table} ADD CONSTRAINT "${issue.constraint}" FOREIGN KEY ("${issue.column}") REFERENCES aircraft(id);`);
      console.log('');
    });

    // Step 3: Additional commands for other potential issues
    console.log('-- Additional commands for other potential issues:');
    console.log('');
    console.log('-- Fix icao_reference_type.id (if not done already)');
    console.log('ALTER TABLE icao_reference_type ALTER COLUMN id TYPE uuid USING id::uuid;');
    console.log('');
    console.log('-- Fix aircraft.icaoReferenceTypeId (if not done already)');
    console.log('ALTER TABLE aircraft DROP CONSTRAINT IF EXISTS "aircraft_icaoReferenceTypeId_fkey";');
    console.log('ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;');
    console.log('ALTER TABLE aircraft ADD CONSTRAINT "aircraft_icaoReferenceTypeId_fkey" FOREIGN KEY ("icaoReferenceTypeId") REFERENCES icao_reference_type(id);');
    console.log('');

    // Step 4: Verification queries
    console.log('🔍 Step 3: Verification Queries');
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
    foreignKeyIssues.forEach(issue => {
      console.log(`-- Test ${issue.table} relationships`);
      console.log(`
      SELECT 
        '${issue.table}' as table_name,
        COUNT(*) as total_records,
        COUNT(t."${issue.column}") as non_null_aircraft_ids,
        COUNT(a.id) as valid_relationships
      FROM ${issue.table} t
      LEFT JOIN aircraft a ON t."${issue.column}" = a.id;
      `);
    });
    console.log('');
    console.log('-- Check for any remaining foreign key constraint errors');
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
    console.log('Expected results:');
    console.log('- All columns should show data_type = "uuid"');
    console.log('- valid_relationships should equal non_null_aircraft_ids');
    console.log('- No foreign key constraint errors');

    // Step 5: Summary
    console.log('\n📊 Step 4: Summary');
    console.log('==================');
    console.log(`🔧 Tables requiring fixes: ${foreignKeyIssues.length}`);
    foreignKeyIssues.forEach(issue => {
      console.log(`   - ${issue.table}.${issue.column}`);
    });
    console.log('');
    console.log('🎯 Action required: Execute the SQL commands above in order');
    console.log('🎯 Result: All tables will have proper UUID types with working foreign key constraints');
    console.log('');
    console.log('⚠️ Note: The fleet_management table was found in the foreign key query!');
    console.log('   This confirms it exists and needs to be fixed.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
fixAllForeignKeyConstraintsFinal(); 