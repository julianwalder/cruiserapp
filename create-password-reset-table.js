const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createPasswordResetTable() {
  console.log('🔧 Creating password_reset_tokens table...\n');

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
    // Create the table
    console.log('📋 Creating password_reset_tokens table...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.log('⚠️  exec_sql not available, trying alternative approach...');
      
      // Try creating table with direct SQL (this might not work due to RLS)
      console.log('📋 Attempting direct table creation...');
      const { error: directError } = await supabase
        .from('password_reset_tokens')
        .select('*')
        .limit(1);
      
      if (directError && directError.code === '42P01') {
        console.log('❌ Table creation failed. You need to manually create the table.');
        console.log('');
        console.log('🔧 Manual Setup Required:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Navigate to the SQL Editor');
        console.log('   3. Copy and paste the contents of scripts/setup-password-reset.sql');
        console.log('   4. Execute the script');
        console.log('');
        console.log('📄 SQL file location: scripts/setup-password-reset.sql');
        return;
      }
    }

    console.log('✅ Table creation attempted');
    console.log('');
    console.log('🔍 Verifying table exists...');
    
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Table verification failed:', error);
      console.log('');
      console.log('🔧 Manual Setup Required:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to the SQL Editor');
      console.log('   3. Copy and paste the contents of scripts/setup-password-reset.sql');
      console.log('   4. Execute the script');
      return;
    }

    console.log('✅ password_reset_tokens table exists and is accessible!');
    console.log('');
    console.log('🎉 Password reset service is now ready to use!');

  } catch (error) {
    console.error('❌ Error creating table:', error);
    console.log('');
    console.log('🔧 Manual Setup Required:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to the SQL Editor');
    console.log('   3. Copy and paste the contents of scripts/setup-password-reset.sql');
    console.log('   4. Execute the script');
  }
}

createPasswordResetTable(); 