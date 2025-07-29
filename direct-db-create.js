const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTableDirectly() {
  console.log('🔧 Attempting to create table directly...\n');

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
    // Let's try to use the REST API to create the table by attempting to insert
    console.log('📋 Testing table access...');
    
    // Get a real user ID first
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError || !users.length) {
      console.error('❌ Cannot access users table:', usersError);
      return;
    }

    const userId = users[0].id;
    console.log(`✅ Got user ID: ${userId}`);

    // Try to insert a test record to see if table exists
    const testToken = 'test-token-' + Date.now();
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        token: testToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        used: false
      });

    if (insertError) {
      if (insertError.code === '42P01') {
        console.log('❌ Table does not exist. Cannot create via API.');
        console.log('');
        console.log('🔧 MANUAL SETUP REQUIRED:');
        console.log('');
        console.log('The password_reset_tokens table needs to be created manually.');
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
        console.log('⚠️  Table exists but has different structure:', insertError.message);
        return;
      }
    }

    console.log('✅ Table exists and is accessible!');
    console.log('🧹 Cleaning up test record...');
    
    // Clean up the test record
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', testToken);
    
    console.log('🎉 Password reset table is ready!');
    console.log('');
    console.log('✅ You can now test the password reset functionality!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTableDirectly(); 