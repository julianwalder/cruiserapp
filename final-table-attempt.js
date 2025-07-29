const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function finalTableAttempt() {
  console.log('🔧 Final attempt to create password_reset_tokens table...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Let's try to use a different approach - maybe the table exists but with different permissions
    console.log('📋 Checking if table exists with different approach...');
    
    // Try to query the table directly
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table definitely does not exist.');
        console.log('');
        console.log('🔧 MANUAL SETUP REQUIRED:');
        console.log('');
        console.log('The password_reset_tokens table needs to be created manually in your Supabase dashboard.');
        console.log('');
        console.log('📋 SQL to run in Supabase SQL Editor:');
        console.log('');
        console.log(`
-- Create the password_reset_tokens table
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used ON password_reset_tokens(used);

-- Enable Row Level Security
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Service role can manage all reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');
        `);
        console.log('');
        console.log('📍 Steps:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Click "SQL Editor"');
        console.log('4. Click "New query"');
        console.log('5. Paste the SQL above');
        console.log('6. Click "Run"');
        console.log('7. Come back and test again');
        return;
      } else {
        console.log('⚠️  Table might exist but has access issues:', error.message);
        return;
      }
    }

    console.log('✅ Table exists and is accessible!');
    console.log('🎉 Password reset table is ready!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

finalTableAttempt(); 