const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFlightLogsColumns() {
  console.log('🔍 Checking flight_logs table structure...');
  
  try {
    // Get a sample flight log to see the structure
    const { data: sampleFlight, error: sampleError } = await supabase
      .from('flight_logs')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.log('❌ Error fetching sample flight log:', sampleError.message);
      return;
    }
    
    if (sampleFlight && sampleFlight.length > 0) {
      console.log('📋 Flight log columns:');
      const flight = sampleFlight[0];
      Object.keys(flight).forEach(key => {
        console.log(`   - ${key}: ${typeof flight[key]} (${flight[key]})`);
      });
    } else {
      console.log('❌ No flight logs found');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkFlightLogsColumns(); 