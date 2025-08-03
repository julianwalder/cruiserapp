const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findFleetManagementTable() {
  console.log('🔍 Finding the fleet_management table or similar...');
  
  try {
    // Step 1: Try different possible table names
    console.log('📊 Step 1: Trying different table names...');
    
    const possibleTableNames = [
      'fleet_management',
      'fleet',
      'fleetmanagement',
      'fleet_management_backup',
      'fleet_backup'
    ];

    for (const tableName of possibleTableNames) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Found table: ${tableName}`);
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          console.log(`   Sample record:`, data[0]);
          
          // Check for aircraft ID columns
          const aircraftIdColumns = Object.keys(data[0]).filter(col => 
            col.toLowerCase().includes('aircraft') && 
            col.toLowerCase().includes('id')
          );
          
          if (aircraftIdColumns.length > 0) {
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

    // Step 2: Check if there are any foreign key constraint errors in the database
    console.log('\n📊 Step 2: Checking for any tables with aircraft ID references...');
    
    // Try to query information_schema to find all tables with aircraft-related columns
    console.log('📋 Checking information_schema for aircraft-related columns...');
    
    // Since we can't easily query information_schema via Supabase client,
    // let's try a different approach - check if the error is coming from a different table
    
    // Step 3: Try to reproduce the error by attempting to create a foreign key
    console.log('\n📊 Step 3: Attempting to identify the problematic table...');
    
    // Let's check if there are any other tables we haven't considered
    const additionalTables = [
      'aircraft_management',
      'aircraft_operations',
      'aircraft_scheduling',
      'aircraft_reservations',
      'aircraft_maintenance',
      'aircraft_logs',
      'aircraft_usage',
      'aircraft_tracking'
    ];

    for (const tableName of additionalTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Found additional table: ${tableName}`);
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          
          const aircraftIdColumns = Object.keys(data[0]).filter(col => 
            col.toLowerCase().includes('aircraft') && 
            col.toLowerCase().includes('id')
          );
          
          if (aircraftIdColumns.length > 0) {
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

    // Step 4: Provide a comprehensive solution
    console.log('\n📋 Step 4: Comprehensive SQL Solution');
    console.log('=======================================');
    console.log('');
    console.log('Since we couldn\'t find the exact fleet_management table, here\'s a comprehensive approach:');
    console.log('');
    console.log('1. First, run this query to find all tables with aircraft ID columns:');
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
    console.log('2. For each table found, run these commands (replace TABLE_NAME and COLUMN_NAME):');
    console.log(`
      -- Drop the foreign key constraint
      ALTER TABLE TABLE_NAME DROP CONSTRAINT IF EXISTS "TABLE_NAME_COLUMN_NAME_fkey";
      
      -- Convert column type to UUID
      ALTER TABLE TABLE_NAME ALTER COLUMN "COLUMN_NAME" TYPE uuid USING "COLUMN_NAME"::uuid;
      
      -- Recreate the foreign key constraint
      ALTER TABLE TABLE_NAME ADD CONSTRAINT "TABLE_NAME_COLUMN_NAME_fkey" FOREIGN KEY ("COLUMN_NAME") REFERENCES aircraft(id);
    `);
    console.log('');
    console.log('3. If you get the specific error about fleet_management, run:');
    console.log(`
      -- Check if the table exists
      SELECT table_name FROM information_schema.tables WHERE table_name = 'fleet_management';
      
      -- If it exists, check its structure
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'fleet_management';
    `);

    // Step 5: Alternative approach - check for any existing foreign key constraints
    console.log('\n🔍 Step 5: Alternative approach');
    console.log('===============================');
    console.log('If the above doesn\'t work, try this approach:');
    console.log('');
    console.log('1. Check all foreign key constraints:');
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
    console.log('2. This will show you exactly which tables have foreign key constraints to aircraft.id');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
findFleetManagementTable(); 