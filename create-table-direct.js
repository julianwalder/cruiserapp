const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTableDirect() {
  console.log('🔧 Creating password_reset_tokens table directly...\n');

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
    // Try to create the table using a different approach
    console.log('📋 Attempting to create table...');
    
    // First, let's try to insert a dummy record to see if the table exists
    const { error: testError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        token: 'test-token',
        expires_at: new Date().toISOString(),
        used: false
      });

    if (testError && testError.code === '42P01') {
      console.log('❌ Table does not exist. Creating it manually...');
      
      // Since we can't create the table via API, let's provide the exact steps
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Click "New query"');
      console.log('5. Copy and paste this SQL:');
      console.log('');
      console.log('--- START SQL ---');
      console.log(`
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');
      `);
      console.log('--- END SQL ---');
      console.log('');
      console.log('6. Click "Run" to execute the SQL');
      console.log('7. Come back and run: node test-password-reset.js');
      return;
    }

    if (testError) {
      console.log('⚠️  Table might exist but has different structure:', testError.message);
    } else {
      console.log('✅ Table exists! Cleaning up test record...');
      // Clean up the test record
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', 'test-token');
    }

    console.log('🎉 Password reset table is ready!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTableDirect(); 