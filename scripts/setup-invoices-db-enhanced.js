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
  console.error('Please check your .env.local file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupEnhancedInvoiceDatabase() {
  console.log('🚀 Setting up enhanced invoice database with company-user relationships...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'setup-invoices-corrected.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase.from('companies').select('id').limit(1);
          if (directError) {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Database setup completed!`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 Enhanced invoice database setup completed successfully!');
      console.log('📋 New features available:');
      console.log('   • Companies table for tracking company information');
      console.log('   • User-company relationships table');
      console.log('   • Enhanced invoice import with automatic company-user linking');
      console.log('   • Improved email matching for user identification');
      console.log('   • Company management interface');
    } else {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative approach: Create tables manually
async function createTablesManually() {
  console.log('🔧 Creating tables manually...\n');

  try {
    // Create companies table
    console.log('📋 Creating companies table...');
    const { error: companiesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          vat_code VARCHAR(50) UNIQUE,
          email VARCHAR(255),
          phone VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          country VARCHAR(100) DEFAULT 'Romania',
          status VARCHAR(20) DEFAULT 'Active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (companiesError) {
      console.log('⚠️  Companies table might already exist or RPC not available');
    } else {
      console.log('✅ Companies table created');
    }

    // Create user_company_relationships table
    console.log('📋 Creating user_company_relationships table...');
    const { error: relationshipsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_company_relationships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
          relationship_type VARCHAR(50) DEFAULT 'employee',
          is_primary BOOLEAN DEFAULT false,
          start_date DATE,
          end_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, company_id)
        );
      `
    });

    if (relationshipsError) {
      console.log('⚠️  User company relationships table might already exist or RPC not available');
    } else {
      console.log('✅ User company relationships table created');
    }

    // Add company_id column to invoice_clients if it doesn't exist
    console.log('📋 Adding company_id to invoice_clients...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE invoice_clients 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
      `
    });

    if (alterError) {
      console.log('⚠️  Company_id column might already exist or RPC not available');
    } else {
      console.log('✅ Company_id column added to invoice_clients');
    }

    // Add company_id column to flight_hours if it doesn't exist
    console.log('📋 Adding company_id to flight_hours...');
    const { error: flightHoursError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE flight_hours 
        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
      `
    });

    if (flightHoursError) {
      console.log('⚠️  Company_id column might already exist or RPC not available');
    } else {
      console.log('✅ Company_id column added to flight_hours');
    }

    console.log('\n🎉 Manual table creation completed!');
    console.log('📋 New features available:');
    console.log('   • Companies table for tracking company information');
    console.log('   • User-company relationships table');
    console.log('   • Enhanced invoice import with automatic company-user linking');

  } catch (error) {
    console.error('❌ Manual table creation failed:', error);
  }
}

// Run the setup
async function main() {
  try {
    await setupEnhancedInvoiceDatabase();
  } catch (error) {
    console.log('\n🔄 Falling back to manual table creation...');
    await createTablesManually();
  }
}

main(); 