const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreFlightHoursComplete() {
  console.log('🔧 Restoring flight_hours table with proper foreign key relationships...');
  
  try {
    // Step 1: Get all backup data
    console.log('📊 Step 1: Fetching backup data...');
    
    const { data: backupFlightHours, error: backupFlightHoursError } = await supabase
      .from('flight_hours_backup')
      .select('*');

    if (backupFlightHoursError) {
      console.error('❌ Error fetching backup flight hours:', backupFlightHoursError);
      return;
    }

    const { data: backupInvoices, error: backupInvoicesError } = await supabase
      .from('invoices_backup')
      .select('id, smartbill_id');

    if (backupInvoicesError) {
      console.error('❌ Error fetching backup invoices:', backupInvoicesError);
      return;
    }

    const { data: currentInvoices, error: currentInvoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (currentInvoicesError) {
      console.error('❌ Error fetching current invoices:', currentInvoicesError);
      return;
    }

    console.log(`✅ Found ${backupFlightHours.length} backup flight hours`);
    console.log(`✅ Found ${backupInvoices.length} backup invoices`);
    console.log(`✅ Found ${currentInvoices.length} current invoices`);

    // Step 2: Create mapping from backup invoice ID to SmartBill ID
    console.log('📊 Step 2: Creating invoice ID mappings...');
    
    const backupInvoiceToSmartBill = new Map();
    backupInvoices.forEach(invoice => {
      backupInvoiceToSmartBill.set(invoice.id, invoice.smartbill_id);
    });

    const smartbillToCurrentUUID = new Map();
    currentInvoices.forEach(invoice => {
      smartbillToCurrentUUID.set(invoice.smartbill_id, invoice.id);
    });

    // Step 3: Process each backup flight hours record
    console.log('📊 Step 3: Processing backup flight hours...');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const backupFlightHour of backupFlightHours) {
      try {
        // Get the SmartBill ID for this backup flight hours' invoice
        const smartbillId = backupInvoiceToSmartBill.get(backupFlightHour.invoice_id);
        
        if (!smartbillId) {
          console.log(`   ⚠️  No SmartBill ID found for backup invoice ${backupFlightHour.invoice_id}`);
          skippedCount++;
          continue;
        }

        // Get the current invoice UUID for this SmartBill ID
        const currentInvoiceId = smartbillToCurrentUUID.get(smartbillId);
        
        if (!currentInvoiceId) {
          console.log(`   ⚠️  No current invoice found for SmartBill ID ${smartbillId}`);
          skippedCount++;
          continue;
        }

        console.log(`📝 Processing ${smartbillId} -> Flight Hours Record`);

        // Check if flight hours record already exists for this invoice
        const { data: existingFlightHours } = await supabase
          .from('flight_hours')
          .select('id')
          .eq('invoice_id', currentInvoiceId)
          .limit(1);

        if (existingFlightHours && existingFlightHours.length > 0) {
          console.log(`   ⏭️  Flight hours record already exists for ${smartbillId}`);
          skippedCount++;
          continue;
        }

        // Insert the flight hours record with the new invoice UUID
        const { error: insertError } = await supabase
          .from('flight_hours')
          .insert({
            invoice_id: currentInvoiceId,
            hours_regular: backupFlightHour.hours_regular,
            hours_promotional: backupFlightHour.hours_promotional,
            total_hours: backupFlightHour.total_hours,
            rate_per_hour: backupFlightHour.rate_per_hour,
            total_amount: backupFlightHour.total_amount,
            notes: backupFlightHour.notes,
            aircraft_type: backupFlightHour.aircraft_type,
            flight_date: backupFlightHour.flight_date,
            pilot_name: backupFlightHour.pilot_name,
            instructor_name: backupFlightHour.instructor_name,
            flight_type: backupFlightHour.flight_type,
            created_at: backupFlightHour.created_at,
            updated_at: backupFlightHour.updated_at
          });

        if (insertError) {
          console.error(`   ❌ Error inserting flight hours for ${smartbillId}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Restored flight hours: ${backupFlightHour.total_hours || 0} hours (${backupFlightHour.aircraft_type || 'N/A'})`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing backup flight hours ${backupFlightHour.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully restored: ${successCount} flight hours records`);
    console.log(`   ❌ Errors: ${errorCount} flight hours records`);
    console.log(`   ⏭️  Skipped: ${skippedCount} flight hours records`);
    console.log(`   📝 Total processed: ${successCount + errorCount + skippedCount} flight hours records`);

    // Step 4: Verify the results
    console.log('\n🔍 Step 4: Verifying results...');
    const { data: flightHoursCount, error: countError } = await supabase
      .from('flight_hours')
      .select('id');

    if (countError) {
      console.error('❌ Error counting flight hours:', countError);
    } else {
      console.log(`✅ Total flight hours records in database: ${flightHoursCount.length}`);
    }

    // Step 5: Test the API endpoint
    console.log('\n🔍 Step 5: Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/smartbill/import-xml');
    if (response.ok) {
      const data = await response.json();
      const firstInvoice = data.invoices?.[0];
      if (firstInvoice && firstInvoice.flight_hours && firstInvoice.flight_hours.length > 0) {
        console.log('✅ API endpoint now returns flight hours data correctly');
        console.log(`   Sample invoice has ${firstInvoice.flight_hours.length} flight hours records`);
        const firstFlightHour = firstInvoice.flight_hours[0];
        console.log(`   Sample flight hours: ${firstFlightHour.total_hours || 0} hours (${firstFlightHour.aircraft_type || 'N/A'})`);
      } else {
        console.log('❌ API endpoint still not returning flight hours data');
      }
    } else {
      console.log('❌ API endpoint not responding');
    }

    // Step 6: Show some statistics
    console.log('\n📊 Step 6: Flight hours statistics...');
    const { data: flightHoursStats, error: statsError } = await supabase
      .from('flight_hours')
      .select('total_hours, total_amount, aircraft_type, flight_type');

    if (!statsError && flightHoursStats) {
      const totalHours = flightHoursStats.reduce((sum, record) => sum + (record.total_hours || 0), 0);
      const totalAmount = flightHoursStats.reduce((sum, record) => sum + (record.total_amount || 0), 0);
      const aircraftTypes = [...new Set(flightHoursStats.map(record => record.aircraft_type).filter(Boolean))];
      const flightTypes = [...new Set(flightHoursStats.map(record => record.flight_type).filter(Boolean))];
      
      console.log(`   🕐 Total flight hours: ${totalHours.toFixed(2)}`);
      console.log(`   💰 Total amount: ${totalAmount.toFixed(2)}`);
      console.log(`   ✈️  Aircraft types: ${aircraftTypes.join(', ') || 'N/A'}`);
      console.log(`   🎯 Flight types: ${flightTypes.join(', ') || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
restoreFlightHoursComplete(); 