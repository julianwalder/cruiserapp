const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIcaoReferenceTypes() {
  console.log('🔍 Checking ICAO reference types table...');
  
  try {
    // Check current icao_reference_types
    console.log('\n📋 Current icao_reference_types table:');
    const { data: currentIcaoTypes, error: currentError } = await supabase
      .from('icao_reference_types')
      .select('*')
      .limit(5);

    if (currentError) {
      console.error('❌ Error fetching current icao_reference_types:', currentError);
    } else {
      if (currentIcaoTypes && currentIcaoTypes.length > 0) {
        console.log('Available columns:');
        Object.keys(currentIcaoTypes[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample current records:');
        currentIcaoTypes.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'NULL'}`);
          });
        });
      } else {
        console.log('📊 Current table is empty');
      }
    }

    // Check backup icao_reference_types
    console.log('\n📋 Backup icao_reference_types_backup table:');
    const { data: backupIcaoTypes, error: backupError } = await supabase
      .from('icao_reference_types_backup')
      .select('*')
      .limit(5);

    if (backupError) {
      console.error('❌ Error fetching backup icao_reference_types:', backupError);
    } else {
      if (backupIcaoTypes && backupIcaoTypes.length > 0) {
        console.log('Available columns:');
        Object.keys(backupIcaoTypes[0]).forEach(column => {
          console.log(`   - ${column}`);
        });

        console.log('\n📊 Sample backup records:');
        backupIcaoTypes.forEach((record, index) => {
          console.log(`\nRecord ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`   ${key}: ${value || 'NULL'}`);
          });
        });
      } else {
        console.log('📊 Backup table is empty');
      }
    }

    // Check aircraft table to see how it references icao_reference_types
    console.log('\n📋 Aircraft table icao_reference_type_id references:');
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id, icao_reference_type_id, registration, type')
      .limit(10);

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
    } else {
      if (aircraft && aircraft.length > 0) {
        console.log('\n📊 Sample aircraft records:');
        aircraft.forEach((record, index) => {
          console.log(`\nAircraft ${index + 1}:`);
          console.log(`   id: ${record.id}`);
          console.log(`   icao_reference_type_id: ${record.icao_reference_type_id}`);
          console.log(`   registration: ${record.registration}`);
          console.log(`   type: ${record.type}`);
        });
      } else {
        console.log('📊 Aircraft table is empty');
      }
    }

    // Check if there are any foreign key constraint issues
    console.log('\n🔍 Checking for foreign key constraint issues...');
    const { data: constraintTest, error: constraintError } = await supabase
      .from('aircraft')
      .select(`
        id,
        icao_reference_type_id,
        icao_reference_types (
          id,
          icao_code,
          manufacturer,
          model
        )
      `)
      .limit(3);

    if (constraintError) {
      console.error('❌ Foreign key constraint error:', constraintError);
    } else {
      console.log('✅ Foreign key relationship test:');
      if (constraintTest && constraintTest.length > 0) {
        constraintTest.forEach((record, index) => {
          console.log(`\nAircraft ${index + 1}:`);
          console.log(`   aircraft_id: ${record.id}`);
          console.log(`   icao_reference_type_id: ${record.icao_reference_type_id}`);
          if (record.icao_reference_types) {
            console.log(`   icao_reference_type: ${record.icao_reference_types.icao_code} - ${record.icao_reference_types.manufacturer} ${record.icao_reference_types.model}`);
          } else {
            console.log(`   icao_reference_type: NULL (broken relationship)`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkIcaoReferenceTypes(); 