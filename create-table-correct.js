const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createTableWithCorrectSchema() {
  console.log('🔧 Creating password_reset_tokens table with correct schema...\n');

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
    // First, let's check the users table structure
    console.log('📋 Checking users table structure...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError);
      return;
    }

    if (users.length === 0) {
      console.error('❌ No users found in the database');
      return;
    }

    console.log('✅ Users table accessible');
    console.log(`   Sample user ID: ${users[0].id} (type: ${typeof users[0].id})`);
    console.log('');

    // Now let's try to create the password_reset_tokens table
    console.log('📋 Creating password_reset_tokens table...');
    
    // Try to create the table using a direct approach
    const { error: createError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: users[0].id, // Use actual user ID
        token: 'test-token-' + Date.now(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        used: false
      });

    if (createError) {
      if (createError.code === '42P01') {
        console.log('❌ Table does not exist. Creating it...');
        
        // Since we can't create tables via the API, let's provide the exact SQL
        console.log('');
        console.log('🔧 MANUAL SETUP REQUIRED:');
        console.log('');
        console.log('Run this SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('--- START SQL ---');
        console.log(`
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_used ON password_reset_tokens(used);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');
        `);
        console.log('--- END SQL ---');
        console.log('');
        console.log('📍 Steps:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Click "SQL Editor"');
        console.log('4. Click "New query"');
        console.log('5. Paste the SQL above');
        console.log('6. Click "Run"');
        console.log('7. Come back and run: node test-password-reset.js');
        return;
      } else {
        console.log('⚠️  Table might exist but has different structure:', createError.message);
      }
    } else {
      console.log('✅ Table exists and is accessible!');
      
      // Clean up the test record
      console.log('🧹 Cleaning up test record...');
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', 'test-token-' + Date.now());
      
      console.log('🎉 Password reset table is ready!');
      console.log('');
      console.log('✅ You can now test the password reset functionality!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTableWithCorrectSchema(); 