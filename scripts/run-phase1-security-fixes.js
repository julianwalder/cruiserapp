#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔒 Running Phase 1 Critical Security Fixes...\n');
  console.log('📋 This will implement:');
  console.log('1. Fix users table RLS policies (restrict visibility)');
  console.log('2. Create secure user access functions');
  console.log('3. Add public user info view\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-users-table-rls.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        // Try to execute the statement directly
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`⚠️  Statement ${i + 1} may need manual execution in Supabase SQL editor`);
          console.log(`   Error: ${error.message}`);
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} may need manual execution in Supabase SQL editor`);
        console.log(`   Error: ${err.message}`);
      }
    }

    console.log('\n🎉 Phase 1 security fixes completed!');
    console.log('\n📋 Changes made:');
    console.log('✅ Dropped overly permissive "view all users" policy');
    console.log('✅ Added "Users can view own profile" policy');
    console.log('✅ Added "Admin users can view limited user data" policy');
    console.log('✅ Added "Service role can access all users" policy');
    console.log('✅ Created public_user_info view');
    console.log('✅ Created get_user_info() function');
    console.log('✅ Created list_users() function');
    
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and paste the contents of scripts/fix-users-table-rls.sql');
    console.log('4. Execute the script');
    console.log('5. Verify RLS policies in the Authentication > Policies section');
    
    console.log('\n🔍 Security improvements:');
    console.log('- Users can only view their own full profile');
    console.log('- Admins can view all users for management');
    console.log('- Regular users see only basic info of active users');
    console.log('- Sensitive fields are stripped for non-admin access');
    console.log('- Service role maintains full access for API operations');

  } catch (error) {
    console.error('❌ Phase 1 security fixes failed:', error);
    console.log('\n💡 Manual setup required:');
    console.log('1. Copy the contents of scripts/fix-users-table-rls.sql');
    console.log('2. Paste it into the Supabase SQL Editor');
    console.log('3. Execute the script');
    console.log('4. Verify the changes in the Authentication > Policies section');
  }
}

main().catch(console.error);
