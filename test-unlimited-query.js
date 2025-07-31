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

async function testUnlimitedQuery() {
  console.log('🔍 Testing unlimited flight logs query...\n');

  try {
    // Test 1: Basic query without any limits
    console.log('🔍 Test 1: Basic query without limits...');
    const { data: flightLogs1, error: error1 } = await supabase
      .from('flight_logs')
      .select('id, pilotId, totalHours, date')
      .order('date', { ascending: false });

    console.log(`   Result: ${flightLogs1?.length || 0} records`);
    if (error1) console.log(`   Error: ${error1.message}`);
    console.log('');

    // Test 2: Query with explicit limit
    console.log('🔍 Test 2: Query with explicit large limit...');
    const { data: flightLogs2, error: error2 } = await supabase
      .from('flight_logs')
      .select('id, pilotId, totalHours, date')
      .order('date', { ascending: false })
      .limit(10000);

    console.log(`   Result: ${flightLogs2?.length || 0} records`);
    if (error2) console.log(`   Error: ${error2.message}`);
    console.log('');

    // Test 3: Query using range
    console.log('🔍 Test 3: Query using range...');
    const { data: flightLogs3, error: error3 } = await supabase
      .from('flight_logs')
      .select('id, pilotId, totalHours, date')
      .order('date', { ascending: false })
      .range(0, 9999);

    console.log(`   Result: ${flightLogs3?.length || 0} records`);
    if (error3) console.log(`   Error: ${error3.message}`);
    console.log('');

    // Test 4: Count total records
    console.log('🔍 Test 4: Count total records...');
    const { count: totalCount, error: countError } = await supabase
      .from('flight_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total records in table: ${totalCount || 0}`);
    if (countError) console.log(`   Error: ${countError.message}`);
    console.log('');

    // Test 5: Query for Stefan's flights specifically
    console.log('🔍 Test 5: Query for Stefan\'s flights specifically...');
    const { data: stefanFlights, error: stefanError } = await supabase
      .from('flight_logs')
      .select('id, pilotId, totalHours, date')
      .eq('pilotId', 'cmdko3yci009ww0jcvgovy87t')
      .order('date', { ascending: false });

    console.log(`   Stefan's flights: ${stefanFlights?.length || 0} records`);
    const stefanHours = stefanFlights?.reduce((sum, flight) => sum + (flight.totalHours || 0), 0) || 0;
    console.log(`   Stefan's total hours: ${stefanHours.toFixed(2)}`);
    if (stefanError) console.log(`   Error: ${stefanError.message}`);
    console.log('');

    // Test 6: Check if there are any RLS policies affecting this
    console.log('🔍 Test 6: Check RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'flight_logs';" 
      });

    if (policiesError) {
      console.log(`   Could not check policies: ${policiesError.message}`);
    } else {
      console.log(`   RLS policies found: ${policies?.length || 0}`);
      policies?.forEach((policy, index) => {
        console.log(`     ${index + 1}. ${policy.policyname} - ${policy.cmd} - ${policy.qual}`);
      });
    }
    console.log('');

    // Test 7: Try to get all records in chunks
    console.log('🔍 Test 7: Get all records in chunks...');
    let allRecords = [];
    let offset = 0;
    const chunkSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: chunk, error: chunkError } = await supabase
        .from('flight_logs')
        .select('id, pilotId, totalHours, date')
        .order('date', { ascending: false })
        .range(offset, offset + chunkSize - 1);

      if (chunkError) {
        console.log(`   Error at offset ${offset}: ${chunkError.message}`);
        break;
      }

      if (!chunk || chunk.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(chunk);
        offset += chunkSize;
        console.log(`   Chunk ${Math.floor(offset / chunkSize)}: ${chunk.length} records (total: ${allRecords.length})`);
      }
    }

    console.log(`   Total records collected: ${allRecords.length}`);
    
    // Count Stefan's flights in all records
    const stefanFlightsInAll = allRecords.filter(flight => flight.pilotId === 'cmdko3yci009ww0jcvgovy87t');
    const stefanHoursInAll = stefanFlightsInAll.reduce((sum, flight) => sum + (flight.totalHours || 0), 0);
    console.log(`   Stefan's flights in all records: ${stefanFlightsInAll.length}`);
    console.log(`   Stefan's hours in all records: ${stefanHoursInAll.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUnlimitedQuery(); 