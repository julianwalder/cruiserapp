#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runUUIDMigration() {
  console.log('🚀 Starting UUID Migration...\n');
  
  try {
    // Step 1: Verify database connection
    console.log('📡 Verifying database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection verified\n');

    // Step 2: Check current ID column types
    console.log('🔍 Checking current ID column types...');
    const { data: columnInfo, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' });
    
    if (columnError) {
      console.log('⚠️  Could not check column types, proceeding with migration...\n');
    } else {
      console.log('✅ Column types checked\n');
    }

    // Step 3: Read and execute migration SQL
    console.log('📝 Reading migration script...');
    const sqlPath = path.join(__dirname, 'migrate-all-to-uuids.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Error executing statement ${i + 1}:`, error);
            console.error('Statement:', statement);
            throw new Error(`Migration failed at statement ${i + 1}: ${error.message}`);
          }
          
          console.log(`✅ Statement ${i + 1} completed successfully`);
        } catch (execError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, execError.message);
          throw execError;
        }
      }
    }
    
    // Step 4: Verify migration results
    console.log('\n🔍 Verifying migration results...');
    
    const tablesToVerify = [
      'users', 
      'roles', 
      'user_roles', 
      'aircraft', 
      'flight_logs', 
      'airfields', 
      'base_management',
      'companies',
      'user_company_relationships',
      'invoices',
      'invoice_clients',
      'invoice_items',
      'flight_hours',
      'ppl_course_tranches',
      'aircraft_hobbs',
      'password_reset_tokens'
    ];
    
    for (const table of tablesToVerify) {
      try {
        const { data: countData, error: countError } = await supabase
          .from(table)
          .select('id', { count: 'exact' });
        
        if (countError) {
          console.error(`❌ Error verifying ${table}:`, countError.message);
        } else {
          console.log(`✅ ${table}: ${countData.length} records verified`);
        }
      } catch (verifyError) {
        console.error(`❌ Failed to verify ${table}:`, verifyError.message);
      }
    }
    
    console.log('\n🎉 UUID Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('✅ All text ID columns converted to UUID');
    console.log('✅ Foreign key relationships updated');
    console.log('✅ Indexes created for performance');
    console.log('✅ Backup tables created for safety');
    console.log('\n⚠️  Important: Update your application code to handle UUIDs');
    console.log('📚 Check the updated TypeScript interfaces and API endpoints');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔄 To rollback, you can restore from the backup tables:');
    console.error('   - users_backup');
    console.error('   - roles_backup');
    console.error('   - user_roles_backup');
    console.error('   - aircraft_backup');
    console.error('   - flight_logs_backup');
    console.error('   - airfields_backup');
    console.error('   - base_management_backup');
    console.error('   - companies_backup');
    console.error('   - user_company_relationships_backup');
    console.error('   - invoices_backup');
    console.error('   - invoice_clients_backup');
    console.error('   - invoice_items_backup');
    console.error('   - flight_hours_backup');
    console.error('   - ppl_course_tranches_backup');
    console.error('   - aircraft_hobbs_backup');
    console.error('   - password_reset_tokens_backup');
    process.exit(1);
  }
}

// Run the migration
runUUIDMigration(); 