const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addVeriffSessionUrlColumn() {
  try {
    console.log('Checking if veriffSessionUrl column exists...');
    
    // Try to select the column to see if it exists
    const { data, error } = await supabase
      .from('users')
      .select('veriffSessionUrl')
      .limit(1);

    if (error) {
      if (error.code === '42703') {
        console.log('❌ veriffSessionUrl column does not exist');
        console.log('Please add it manually via Supabase dashboard with this SQL:');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffSessionUrl" TEXT;');
      } else {
        console.error('Error checking column:', error);
      }
      return;
    }

    console.log('✅ veriffSessionUrl column exists!');
    console.log('Sample data:', data);

  } catch (error) {
    console.error('Script error:', error);
  }
}

addVeriffSessionUrlColumn(); 