const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function alterIcaoReferenceTypeIdToUUID() {
  console.log('🔧 Altering icaoReferenceTypeId column from text to UUID type...');
  
  try {
    // Step 1: Check current column type
    console.log('📊 Step 1: Checking current column type...');
    const { data: currentType, error: currentTypeError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'aircraft' 
          AND column_name = 'icaoReferenceTypeId';
        `
      });

    if (currentTypeError) {
      console.error('❌ Error checking current column type:', currentTypeError);
      console.log('⚠️ Trying alternative approach...');
      
      // Alternative: Check via a sample query
      const { data: sampleData, error: sampleError } = await supabase
        .from('aircraft')
        .select('icaoReferenceTypeId')
        .limit(1);
      
      if (sampleError) {
        console.error('❌ Error fetching sample data:', sampleError);
        return;
      }
      
      console.log('📊 Current icaoReferenceTypeId sample:', sampleData[0]?.icaoReferenceTypeId);
      console.log('📊 Type appears to be:', typeof sampleData[0]?.icaoReferenceTypeId);
    } else {
      console.log('📊 Current column type:', currentType);
    }

    // Step 2: Validate that all current values are valid UUIDs
    console.log('\n🔍 Step 2: Validating current UUID values...');
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id, icaoReferenceTypeId, callSign');

    if (aircraftError) {
      console.error('❌ Error fetching aircraft:', aircraftError);
      return;
    }

    console.log(`📊 Found ${aircraft.length} aircraft records`);
    
    // Check if all icaoReferenceTypeId values are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidUUIDs = aircraft.filter(aircraft => 
      aircraft.icaoReferenceTypeId && !uuidRegex.test(aircraft.icaoReferenceTypeId)
    );

    if (invalidUUIDs.length > 0) {
      console.error('❌ Found invalid UUIDs:');
      invalidUUIDs.forEach(aircraft => {
        console.error(`   Aircraft ${aircraft.callSign}: ${aircraft.icaoReferenceTypeId}`);
      });
      return;
    }

    console.log('✅ All current icaoReferenceTypeId values are valid UUIDs');

    // Step 3: Attempt to alter the column type
    console.log('\n🔄 Step 3: Altering column type to UUID...');
    
    // Since we can't easily execute DDL via Supabase client, let's check if we can do this
    // by creating a new column, copying data, and dropping the old one
    
    console.log('⚠️ Direct ALTER TABLE not supported via Supabase client');
    console.log('📋 Manual SQL execution required:');
    console.log('');
    console.log('Run this SQL in your Supabase SQL editor:');
    console.log('');
    console.log('ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;');
    console.log('');
    
    // Step 4: Verify the change would work by testing the conversion
    console.log('\n🔍 Step 4: Testing UUID conversion...');
    const testConversions = aircraft.map(aircraft => ({
      id: aircraft.id,
      callSign: aircraft.callSign,
      originalValue: aircraft.icaoReferenceTypeId,
      convertedValue: aircraft.icaoReferenceTypeId ? aircraft.icaoReferenceTypeId : null,
      isValid: aircraft.icaoReferenceTypeId ? uuidRegex.test(aircraft.icaoReferenceTypeId) : true
    }));

    const failedConversions = testConversions.filter(test => !test.isValid);
    
    if (failedConversions.length > 0) {
      console.error('❌ Some values would fail conversion:');
      failedConversions.forEach(test => {
        console.error(`   Aircraft ${test.callSign}: ${test.originalValue}`);
      });
      return;
    }

    console.log('✅ All values can be successfully converted to UUID type');
    
    // Step 5: Show what the change would look like
    console.log('\n📋 Step 5: Conversion preview:');
    testConversions.slice(0, 5).forEach(test => {
      console.log(`   ${test.callSign}: "${test.originalValue}" → ${test.convertedValue} (UUID)`);
    });

    // Step 6: Instructions for manual execution
    console.log('\n📋 Step 6: Manual execution instructions');
    console.log('==========================================');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL command:');
    console.log('');
    console.log('   ALTER TABLE aircraft ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;');
    console.log('');
    console.log('4. This will:');
    console.log('   - Validate all existing values are valid UUIDs');
    console.log('   - Convert the column type from text to uuid');
    console.log('   - Maintain all existing data and relationships');
    console.log('');
    console.log('5. After execution, the foreign key constraint will be properly typed');
    console.log('6. Your application will benefit from proper UUID type validation');

    // Step 7: Verification query to run after manual execution
    console.log('\n🔍 Step 7: Verification query (run after manual execution)');
    console.log('==========================================================');
    console.log('Run this in Supabase SQL editor to verify the change:');
    console.log('');
    console.log(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'aircraft' 
      AND column_name = 'icaoReferenceTypeId';
    `);
    console.log('');
    console.log('Expected result: data_type should be "uuid"');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
alterIcaoReferenceTypeIdToUUID(); 