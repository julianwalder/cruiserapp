const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createSimpleTable() {
  console.log('🔧 Creating password_reset_tokens table (simple approach)...\n');

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
    // Let's try to use the REST API to create the table
    console.log('📋 Trying REST API approach...');
    
    // First, let's check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.log('⚠️  Could not check existing tables:', tablesError.message);
    } else {
      console.log('📋 Existing tables:', tables.map(t => t.table_name).join(', '));
    }

    // Try to create the table using a different method
    console.log('📋 Attempting table creation via direct SQL...');
    
    // Let's try using the pg_catalog to create the table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE TABLE IF NOT EXISTS password_reset_tokens (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL, token VARCHAR(255) NOT NULL UNIQUE, expires_at TIMESTAMP WITH TIME ZONE NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());'
    });

    if (createError) {
      console.log('❌ exec_sql failed:', createError.message);
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('The table needs to be created manually in your Supabase dashboard.');
      console.log('');
      console.log('📋 Quick SQL to run in Supabase SQL Editor:');
      console.log('');
      console.log(`
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    }

    console.log('✅ Table creation attempted successfully!');
    console.log('');
    console.log('🔍 Verifying table exists...');
    
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Table verification failed:', error);
    } else {
      console.log('✅ password_reset_tokens table exists and is accessible!');
      console.log('🎉 Password reset service is now ready to use!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createSimpleTable(); 