const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCorrectIcaoTables() {
  console.log('🔍 Checking correct ICAO table names and structure...');
  
  try {
    // First, let's see what tables exist with "icao" in the name
    console.log('\n📋 Checking for ICAO-related tables...');
    
    // Try different possible table names
    const possibleTables = [
      'icao_reference_types',
      'icao_reference_type',
      'icao_reference_types_backup',
      'icao_reference_type_backup',
      'aircraft_types',
      'aircraft_type',
      'aircraft_types_backup',
      'aircraft_type_backup'
    ];

    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Table "${tableName}" exists`);
          if (data && data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
            console.log(`   Sample record:`, data[0]);
          }
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }

    // Check aircraft table structure
    console.log('\n📋 Checking aircraft table structure...');
    const { data: aircraftSample, error: aircraftError } = await supabase
      .from('aircraft')
      .select('*')
      .limit(1);

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
    } else {
      if (aircraftSample && aircraftSample.length > 0) {
        console.log('Aircraft table columns:');
        Object.keys(aircraftSample[0]).forEach(column => {
          console.log(`   - ${column}`);
        });
        console.log('\nSample aircraft record:');
        Object.entries(aircraftSample[0]).forEach(([key, value]) => {
          console.log(`   ${key}: ${value || 'NULL'}`);
        });
      } else {
        console.log('📊 Aircraft table is empty');
      }
    }

    // Check if there are any backup tables
    console.log('\n📋 Checking for backup tables...');
    const backupTables = [
      'aircraft_backup',
      'aircraft_types_backup',
      'aircraft_type_backup'
    ];

    for (const tableName of backupTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Backup table "${tableName}" exists`);
          if (data && data.length > 0) {
            console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        // Table doesn't exist, continue
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkCorrectIcaoTables(); 