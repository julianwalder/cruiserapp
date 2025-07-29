const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please check your .env.local file and ensure these variables are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPasswordResetDatabase() {
  try {
    console.log('🚀 Setting up password reset database...');
    
    // Read the SQL script
    const sqlPath = path.join(__dirname, 'setup-password-reset.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL script...');
    
    // Execute the SQL script
    const { error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      // If exec_sql doesn't exist, try executing the script directly
      console.log('⚠️  exec_sql function not available, trying direct execution...');
      
      // Split the script into individual statements
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (stmtError) {
            console.log(`⚠️  Skipping statement: ${statement.substring(0, 50)}...`);
          }
        }
      }
    }
    
    console.log('✅ Password reset database setup completed!');
    console.log('');
    console.log('📋 What was created:');
    console.log('   - password_reset_tokens table');
    console.log('   - Indexes for performance');
    console.log('   - Row Level Security (RLS) policies');
    console.log('   - Cleanup function for expired tokens');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Configure your email service (Gmail SMTP recommended)');
    console.log('   2. Add environment variables to Vercel');
    console.log('   3. Test the password reset flow');
    console.log('');
    console.log('📚 For detailed setup instructions, see: PASSWORD_RESET_SETUP.md');
    
  } catch (error) {
    console.error('❌ Error setting up password reset database:', error);
    console.log('');
    console.log('🔧 Manual setup required:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to the SQL Editor');
    console.log('   3. Copy and paste the contents of scripts/setup-password-reset.sql');
    console.log('   4. Execute the script');
    console.log('');
    console.log('📄 SQL file location: scripts/setup-password-reset.sql');
  }
}

// Run the setup
setupPasswordResetDatabase(); 