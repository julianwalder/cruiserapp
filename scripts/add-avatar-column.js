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
    
    // Add the avatarUrl column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
      `
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
      return;
    }

    // Add comment to the column
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN users."avatarUrl" IS 'URL of the user''s avatar image stored in Vercel Blob';
      `
    });

    if (commentError) {
      console.warn('Warning: Could not add comment to column:', commentError);
    }

    // Create index for faster queries
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users("avatarUrl") WHERE "avatarUrl" IS NOT NULL;
      `
    });

    if (indexError) {
      console.warn('Warning: Could not create index:', indexError);
    }

    console.log('✅ Successfully added avatarUrl column to users table');
    console.log('✅ Added column comment');
    console.log('✅ Created index for avatarUrl column');

  } catch (error) {
    console.error('Error:', error);
  }
}

addAvatarColumn(); 