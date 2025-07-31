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

async function testUpdatedAPI() {
  console.log('🔍 Testing updated client hours API logic...\n');

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

    // Fetch ALL flight logs using chunked queries (same as updated API)
    console.log('🔍 Fetching all flight logs in chunks...');
    let allFlightLogs = [];
    let offset = 0;
    const chunkSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: flightLogsChunk, error: flightLogsError } = await supabase
        .from('flight_logs')
        .select(`
          id,
          pilotId,
          instructorId,
          totalHours,
          date,
          flightType
        `)
        .order('date', { ascending: false })
        .range(offset, offset + chunkSize - 1);

      if (flightLogsError) {
        console.error('❌ Error fetching flight logs chunk:', flightLogsError);
        return;
      }

      if (!flightLogsChunk || flightLogsChunk.length === 0) {
        hasMore = false;
      } else {
        allFlightLogs = allFlightLogs.concat(flightLogsChunk);
        offset += chunkSize;
        console.log(`   Chunk ${Math.floor(offset / chunkSize)}: ${flightLogsChunk.length} records (total: ${allFlightLogs.length})`);
      }
    }

    console.log(`✅ Total flight logs fetched: ${allFlightLogs.length}\n`);

    // Get pilot and instructor information for flight logs
    const pilotIds = Array.from(new Set(allFlightLogs?.map((log) => log.pilotId).filter(Boolean) || []));
    const instructorIds = Array.from(new Set(allFlightLogs?.map((log) => log.instructorId).filter(Boolean) || []));
    const allUserIds = Array.from(new Set([...pilotIds, ...instructorIds]));
    
    console.log(`📊 User statistics:`);
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

    console.log(`   Users found: ${users?.length || 0}\n`);

    // Create user lookup map
    const userMap = new Map(users?.map((user) => [user.id, user]) || []);

    // Process flight logs to find Stefan's flights (same logic as updated API)
    const stefanFlights = [];
    let stefanHours = 0;

    allFlightLogs?.forEach((log) => {
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

    console.log(`🎯 Stefan's flight results with updated API logic:`);
    console.log(`   Total flights found: ${stefanFlights.length}`);
    console.log(`   Total hours: ${stefanHours.toFixed(2)}`);
    console.log('');

    // Show recent flights
    if (stefanFlights.length > 0) {
      console.log('🛩️  Recent flights (last 10):');
      stefanFlights.slice(0, 10).forEach((flight, index) => {
        const date = new Date(flight.date).toLocaleDateString('ro-RO');
        console.log(`   ${index + 1}. ${date} - ${flight.flightType} - ${flight.totalHours} hours - ${flight.role}`);
      });
      console.log('');
    }

    // Compare with direct query result
    console.log('📊 Comparison with direct query:');
    const { data: directFlights, error: directError } = await supabase
      .from('flight_logs')
      .select('id, totalHours, date, flightType')
      .eq('pilotId', user.id)
      .order('date', { ascending: false });

    if (directError) {
      console.error('❌ Error in direct query:', directError);
    } else {
      const directHours = directFlights?.reduce((sum, flight) => sum + (flight.totalHours || 0), 0) || 0;
      console.log(`   Direct query: ${directFlights?.length || 0} flights, ${directHours.toFixed(2)} hours`);
      console.log(`   Updated API: ${stefanFlights.length} flights, ${stefanHours.toFixed(2)} hours`);
      
      if (stefanFlights.length === directFlights?.length && Math.abs(stefanHours - directHours) < 0.01) {
        console.log('   ✅ MATCH! Updated API is working correctly');
      } else {
        console.log('   ❌ MISMATCH! There is still an issue');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpdatedAPI(); 