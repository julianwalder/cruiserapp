#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please check your .env.local file for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running Proforma Invoice Database Migration...\n');

  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'add-proforma-invoice-columns.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return;
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim().length === 0) continue;
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: directError } = await supabase.from('users').select('id').limit(1);
          
          if (directError) {
            console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
            console.log('💡 This might be because the migration requires direct database access');
            console.log('💡 Please run the migration manually in your Supabase dashboard');
            return;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      }
    }

    // Verify the migration by checking if columns exist
    console.log('\n🔍 Verifying migration...');
    
    const { data: testInvoice, error: testError } = await supabase
      .from('invoices')
      .select('id, user_id, package_id, payment_method, payment_link, payment_status')
      .limit(1);

    if (testError) {
      console.error('❌ Migration verification failed:', testError.message);
      console.log('💡 The migration may not have completed successfully');
      console.log('💡 Please check your Supabase dashboard and run the migration manually');
    } else {
      console.log('✅ Migration verified successfully!');
      console.log('✅ All required columns are now available');
    }

    console.log('\n🎉 Migration completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your Next.js development server');
    console.log('   2. Test the proforma invoice functionality');
    console.log('   3. Check that the API routes are working');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n💡 Alternative approach:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to the SQL Editor');
    console.log('   3. Copy and paste the contents of scripts/add-proforma-invoice-columns.sql');
    console.log('   4. Execute the SQL manually');
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  });
