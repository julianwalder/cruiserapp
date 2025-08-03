const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAllForeignKeyIssues() {
  console.log('🔍 Checking all foreign key constraint issues...');
  
  try {
    // Step 1: Check all tables that might reference aircraft.id
    console.log('📊 Step 1: Checking tables that reference aircraft.id...');
    
    const tablesToCheck = [
      'fleet_management',
      'aircraft_hobbs',
      'flight_logs',
      'maintenance_logs',
      'scheduling',
      'reservations',
      'fleet',
      'aircraft_maintenance',
      'aircraft_scheduling'
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
              sampleValue: data[0][aircraftIdColumns[0]],
              sampleType: typeof data[0][aircraftIdColumns[0]]
            });
          }
        }
      } catch (err) {
        // Table doesn't exist or other error, continue
      }
    }

    console.log(`📊 Found ${foreignKeyIssues.length} tables with aircraft ID references:`);
    foreignKeyIssues.forEach(issue => {
      console.log(`   ${issue.table}: ${issue.columns.join(', ')}`);
      console.log(`     Sample value: ${issue.sampleValue}`);
      console.log(`     Type: ${issue.sampleType}`);
    });

    // Step 2: Check specific tables we know about
    console.log('\n📊 Step 2: Detailed analysis of known tables...');
    
    // Check fleet_management table specifically
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

    // Step 3: Validate UUID format for all found tables
    console.log('\n🔍 Step 3: Validating UUID format...');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const issue of foreignKeyIssues) {
      try {
        const { data, error } = await supabase
          .from(issue.table)
          .select(issue.columns[0])
          .limit(10);
        
        if (!error && data && data.length > 0) {
          const invalidValues = data.filter(record => 
            record[issue.columns[0]] && !uuidRegex.test(record[issue.columns[0]])
          );
          
          if (invalidValues.length > 0) {
            console.log(`❌ ${issue.table}.${issue.columns[0]}: ${invalidValues.length} invalid UUIDs`);
            invalidValues.slice(0, 3).forEach(record => {
              console.log(`   ${record[issue.columns[0]]}`);
            });
          } else {
            console.log(`✅ ${issue.table}.${issue.columns[0]}: All values are valid UUIDs`);
          }
        }
      } catch (err) {
        console.log(`⚠️ Could not validate ${issue.table}.${issue.columns[0]}`);
      }
    }

    // Step 4: Provide comprehensive SQL fix
    console.log('\n📋 Step 4: Complete SQL Fix Commands');
    console.log('=====================================');
    console.log('');
    console.log('Execute these SQL commands in your Supabase SQL editor in order:');
    console.log('');
    
    // Generate SQL commands for each table
    foreignKeyIssues.forEach(issue => {
      const columnName = issue.columns[0];
      const constraintName = `${issue.table}_${columnName}_fkey`;
      
      console.log(`-- Fix ${issue.table}.${columnName}`);
      console.log(`ALTER TABLE ${issue.table} DROP CONSTRAINT IF EXISTS "${constraintName}";`);
      console.log(`ALTER TABLE ${issue.table} ALTER COLUMN "${columnName}" TYPE uuid USING "${columnName}"::uuid;`);
      console.log(`ALTER TABLE ${issue.table} ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${columnName}") REFERENCES aircraft(id);`);
      console.log('');
    });

    // Step 5: Verification queries
    console.log('🔍 Step 5: Verification Queries');
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
      const columnName = issue.columns[0];
      console.log(`-- Test ${issue.table} relationships`);
      console.log(`
      SELECT 
        '${issue.table}' as table_name,
        COUNT(*) as total_records,
        COUNT(t."${columnName}") as non_null_aircraft_ids,
        COUNT(a.id) as valid_relationships
      FROM ${issue.table} t
      LEFT JOIN aircraft a ON t."${columnName}" = a.id;
      `);
    });
    console.log('');
    console.log('Expected results:');
    console.log('- All columns should show data_type = "uuid"');
    console.log('- valid_relationships should equal non_null_aircraft_ids');
    console.log('- No foreign key constraint errors');

    // Step 6: Summary
    console.log('\n📊 Step 6: Summary');
    console.log('==================');
    console.log(`🔧 Tables requiring fixes: ${foreignKeyIssues.length}`);
    foreignKeyIssues.forEach(issue => {
      console.log(`   - ${issue.table}.${issue.columns[0]}`);
    });
    console.log('');
    console.log('🎯 Action required: Execute the SQL commands above in order');
    console.log('🎯 Result: All tables will have proper UUID types with working foreign key constraints');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkAllForeignKeyIssues(); 