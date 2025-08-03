const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSkippedFlightHours() {
  console.log('🔍 Checking skipped flight hours records...');
  
  try {
    // Get all current flight hours records
    const { data: currentFlightHours, error: currentFlightHoursError } = await supabase
      .from('flight_hours')
      .select(`
        id,
        invoice_id,
        user_id,
        total_hours,
        aircraft_type,
        flight_date,
        pilot_name,
        instructor_name,
        flight_type,
        created_at
      `);

    if (currentFlightHoursError) {
      console.error('❌ Error fetching current flight hours:', currentFlightHoursError);
      return;
    }

    // Get all invoices to map invoice_id to smartbill_id
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, smartbill_id');

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return;
    }

    // Create mapping from invoice_id to smartbill_id
    const invoiceToSmartbill = new Map();
    invoices.forEach(invoice => {
      invoiceToSmartbill.set(invoice.id, invoice.smartbill_id);
    });

    // Get users to map user_id to email
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    // Create mapping from user_id to user info
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, user);
    });

    console.log(`📊 Found ${currentFlightHours.length} current flight hours records`);
    console.log('\n📋 Skipped flight hours records (already existed):\n');

    // Display each skipped record with details
    currentFlightHours.forEach((record, index) => {
      const smartbillId = invoiceToSmartbill.get(record.invoice_id);
      const user = userMap.get(record.user_id);
      
      console.log(`${index + 1}. Invoice: ${smartbillId || 'Unknown'} (${record.invoice_id})`);
      console.log(`   User: ${user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Unknown'} (${record.user_id})`);
      console.log(`   Hours: ${record.total_hours || 0}`);
      console.log(`   Aircraft: ${record.aircraft_type || 'N/A'}`);
      console.log(`   Flight Date: ${record.flight_date || 'N/A'}`);
      console.log(`   Pilot: ${record.pilot_name || 'N/A'}`);
      console.log(`   Instructor: ${record.instructor_name || 'N/A'}`);
      console.log(`   Flight Type: ${record.flight_type || 'N/A'}`);
      console.log(`   Created: ${record.created_at || 'N/A'}`);
      console.log('');
    });

    // Summary statistics
    console.log('📊 Summary:');
    console.log(`   Total skipped records: ${currentFlightHours.length}`);
    
    // Count by user
    const userCounts = {};
    currentFlightHours.forEach(record => {
      const user = userMap.get(record.user_id);
      const userKey = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
      userCounts[userKey] = (userCounts[userKey] || 0) + 1;
    });

    console.log('\n👥 Records by user:');
    Object.entries(userCounts).forEach(([user, count]) => {
      console.log(`   ${user}: ${count} records`);
    });

    // Count by aircraft type
    const aircraftCounts = {};
    currentFlightHours.forEach(record => {
      const aircraft = record.aircraft_type || 'N/A';
      aircraftCounts[aircraft] = (aircraftCounts[aircraft] || 0) + 1;
    });

    console.log('\n✈️ Records by aircraft type:');
    Object.entries(aircraftCounts).forEach(([aircraft, count]) => {
      console.log(`   ${aircraft}: ${count} records`);
    });

    // Total hours
    const totalHours = currentFlightHours.reduce((sum, record) => sum + (record.total_hours || 0), 0);
    console.log(`\n🕐 Total flight hours: ${totalHours.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkSkippedFlightHours(); 