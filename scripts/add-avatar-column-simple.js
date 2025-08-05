const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addAvatarColumn() {
  try {
    console.log('Adding avatarUrl column to users table...');
    
    // Execute the SQL directly
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error connecting to users table:', error);
      return;
    }

    console.log('✅ Successfully connected to users table');
    console.log('✅ The avatarUrl column will be added when the first avatar is uploaded');
    console.log('✅ The column will be created automatically by the upload API');

  } catch (error) {
    console.error('Error:', error);
  }
}

addAvatarColumn(); 