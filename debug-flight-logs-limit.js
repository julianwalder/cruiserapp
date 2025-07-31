#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugFlightLogsLimit() {
  console.log('🔍 Debugging flight logs limit for stefanalexandru97@yahoo.com...\n');

  try {
    // First, find the user ID for stefanalexandru97@yahoo.com
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .eq('email', 'stefanalexandru97@yahoo.com')
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', userError?.message || 'User does not exist');
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Test 1: Direct query for all flight logs where this user is the pilot
    console.log('🔍 Test 1: Direct query for all pilot flights...');
    const { data: allPilotFlights, error: allPilotError } = await supabase
      .from('flight_logs')
      .select('id, totalHours, date, flightType')
      .eq('pilotId', user.id)
      .order('date', { ascending: false });

    if (allPilotError) {
      console.error('❌ Error fetching all pilot flights:', allPilotError);
      return;
    }

    console.log(`   Total flights found: ${allPilotFlights?.length || 0}`);
    const totalHours = allPilotFlights?.reduce((sum, flight) => sum + (flight.totalHours || 0), 0) || 0;
    console.log(`   Total hours: ${totalHours.toFixed(2)}`);
    console.log('');

    // Test 2: Query with the same structure as client hours API
    console.log('🔍 Test 2: Query with same structure as client hours API...');
    const { data: flightLogs, error: flightLogsError } = await supabase
      .from('flight_logs')
      .select(`
        id,
        pilotId,
        instructorId,
        totalHours,
        date,
        flightType
      `)
      .order('date', { ascending: false });

    if (flightLogsError) {
      console.error('❌ Error fetching flight logs:', flightLogsError);
      return;
    }

    console.log(`   Total flight logs in database: ${flightLogs?.length || 0}`);

    // Get pilot and instructor information for flight logs
    const pilotIds = Array.from(new Set(flightLogs?.map((log) => log.pilotId).filter(Boolean) || []));
    const instructorIds = Array.from(new Set(flightLogs?.map((log) => log.instructorId).filter(Boolean) || []));
    const allUserIds = Array.from(new Set([...pilotIds, ...instructorIds]));
    
    console.log(`   Unique pilot IDs: ${pilotIds.length}`);
    console.log(`   Unique instructor IDs: ${instructorIds.length}`);
    console.log(`   Total unique user IDs: ${allUserIds.length}`);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, firstName, lastName')
      .in('id', allUserIds);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`   Users found: ${users?.length || 0}`);
    console.log('');

    // Create user lookup map
    const userMap = new Map(users?.map((user) => [user.id, user]) || []);

    // Process flight logs to find Stefan's flights
    const stefanFlights = [];
    let stefanHours = 0;

    flightLogs?.forEach((log) => {
      const pilot = userMap.get(log.pilotId);
      const instructor = log.instructorId ? userMap.get(log.instructorId) : null;
      
      // If Stefan is the pilot, count their hours
      if (pilot?.email === 'stefanalexandru97@yahoo.com') {
        stefanFlights.push({
          id: log.id,
          pilotId: log.pilotId,
          totalHours: log.totalHours,
          date: log.date,
          flightType: log.flightType,
          role: 'PIC'
        });
        stefanHours += log.totalHours || 0;
      }
      
      // If Stefan is the instructor and it's dual training, update the flight log
      if (instructor?.email === 'stefanalexandru97@yahoo.com' && log.instructorId) {
        // Find the existing log for this flight
        const existingLog = stefanFlights.find(fl => fl.id === log.id);
        if (existingLog) {
          existingLog.role = 'Dual Training';
          existingLog.instructorId = log.instructorId;
        }
      }
    });

    console.log(`🔍 Stefan's flights found in processed data:`);
    console.log(`   Total flights: ${stefanFlights.length}`);
    console.log(`   Total hours: ${stefanHours.toFixed(2)}`);
    console.log('');

    // Test 3: Check if Stefan's user ID is in the userMap
    console.log('🔍 Test 3: Checking user lookup...');
    const stefanInMap = userMap.get(user.id);
    console.log(`   Stefan in userMap: ${stefanInMap ? 'YES' : 'NO'}`);
    if (stefanInMap) {
      console.log(`   Stefan's email in map: ${stefanInMap.email}`);
    }
    console.log('');

    // Test 4: Check if there are any flight logs with Stefan's ID that weren't found
    console.log('🔍 Test 4: Checking for missing flights...');
    const stefanFlightLogs = flightLogs?.filter(log => log.pilotId === user.id) || [];
    console.log(`   Flight logs with Stefan's ID: ${stefanFlightLogs.length}`);
    
    if (stefanFlightLogs.length !== allPilotFlights.length) {
      console.log('   ⚠️  DISCREPANCY FOUND!');
      console.log(`   Direct query found: ${allPilotFlights.length} flights`);
      console.log(`   Processed query found: ${stefanFlightLogs.length} flights`);
      
      // Check the first few flights from each
      console.log('\n   First 5 flights from direct query:');
      allPilotFlights.slice(0, 5).forEach((flight, index) => {
        console.log(`     ${index + 1}. ID: ${flight.id}, Date: ${flight.date}, Hours: ${flight.totalHours}`);
      });
      
      console.log('\n   First 5 flights from processed query:');
      stefanFlightLogs.slice(0, 5).forEach((flight, index) => {
        console.log(`     ${index + 1}. ID: ${flight.id}, Date: ${flight.date}, Hours: ${flight.totalHours}`);
      });
    } else {
      console.log('   ✅ No discrepancy found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFlightLogsLimit(); 