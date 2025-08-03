const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSkippedFlightHoursCorrected() {
  console.log('🔍 Checking skipped flight hours records...');
  
  try {
    // First, let's check what columns actually exist in the flight_hours table
    const { data: sampleRecord, error: sampleError } = await supabase
      .from('flight_hours')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Error fetching sample flight hours record:', sampleError);
      return;
    }

    console.log('📋 Available columns in flight_hours table:');
    if (sampleRecord && sampleRecord.length > 0) {
      Object.keys(sampleRecord[0]).forEach(column => {
        console.log(`   - ${column}`);
      });
    }

    // Get all current flight hours records with available columns
    const { data: currentFlightHours, error: currentFlightHoursError } = await supabase
      .from('flight_hours')
      .select('*');

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

    console.log(`\n📊 Found ${currentFlightHours.length} current flight hours records`);
    console.log('\n📋 Skipped flight hours records (already existed):\n');

    // Display each skipped record with details
    currentFlightHours.forEach((record, index) => {
      const smartbillId = invoiceToSmartbill.get(record.invoice_id);
      const user = userMap.get(record.user_id);
      
      console.log(`${index + 1}. Invoice: ${smartbillId || 'Unknown'} (${record.invoice_id})`);
      console.log(`   User: ${user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Unknown'} (${record.user_id})`);
      
      // Display all available fields
      Object.entries(record).forEach(([key, value]) => {
        if (key !== 'invoice_id' && key !== 'user_id' && key !== 'id') {
          console.log(`   ${key}: ${value || 'N/A'}`);
        }
      });
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

    // Total hours if the column exists
    if (currentFlightHours.length > 0 && 'total_hours' in currentFlightHours[0]) {
      const totalHours = currentFlightHours.reduce((sum, record) => sum + (record.total_hours || 0), 0);
      console.log(`\n🕐 Total flight hours: ${totalHours.toFixed(2)}`);
    }

    // Show the SmartBill IDs that were skipped
    console.log('\n📄 SmartBill IDs of skipped records:');
    const smartbillIds = currentFlightHours.map(record => {
      const smartbillId = invoiceToSmartbill.get(record.invoice_id);
      return smartbillId || 'Unknown';
    }).filter(id => id !== 'Unknown');
    
    smartbillIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkSkippedFlightHoursCorrected(); 