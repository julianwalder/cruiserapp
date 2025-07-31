#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

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

async function setupInvoiceDatabase() {
  console.log('🚀 Setting up invoice database with company-user relationships...\n');

  try {
    // Check if companies table exists
    console.log('📋 Checking companies table...');
    const { data: companiesCheck, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError && companiesError.code === '42P01') {
      console.log('❌ Companies table does not exist. Creating...');
      
      // Create companies table using raw SQL
      const { error: createCompaniesError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE TABLE companies (
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

      if (createCompaniesError) {
        console.log('⚠️  Could not create companies table via RPC, trying alternative approach...');
        // Try to create via direct insert (this will fail but might create the table)
        try {
          await supabase
            .from('companies')
            .insert({
              name: 'Test Company',
              vat_code: 'TEST123',
              status: 'Active'
            });
        } catch (insertError) {
          console.log('⚠️  Companies table creation failed. You may need to create it manually in Supabase dashboard.');
        }
      } else {
        console.log('✅ Companies table created successfully');
      }
    } else {
      console.log('✅ Companies table already exists');
    }

    // Check if user_company_relationships table exists
    console.log('📋 Checking user_company_relationships table...');
    const { data: relationshipsCheck, error: relationshipsError } = await supabase
      .from('user_company_relationships')
      .select('id')
      .limit(1);

    if (relationshipsError && relationshipsError.code === '42P01') {
      console.log('❌ User company relationships table does not exist. Creating...');
      
      const { error: createRelationshipsError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE TABLE user_company_relationships (
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

      if (createRelationshipsError) {
        console.log('⚠️  Could not create user_company_relationships table via RPC');
      } else {
        console.log('✅ User company relationships table created successfully');
      }
    } else {
      console.log('✅ User company relationships table already exists');
    }

    // Check if invoice_clients table exists and has company_id column
    console.log('📋 Checking invoice_clients table...');
    const { data: invoiceClientsCheck, error: invoiceClientsError } = await supabase
      .from('invoice_clients')
      .select('id, company_id')
      .limit(1);

    if (invoiceClientsError && invoiceClientsError.code === '42P01') {
      console.log('❌ Invoice clients table does not exist. Creating...');
      
      const { error: createInvoiceClientsError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE TABLE invoice_clients (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255),
              phone VARCHAR(50),
              vat_code VARCHAR(50),
              address TEXT,
              city VARCHAR(100),
              country VARCHAR(100) DEFAULT 'Romania',
              user_id TEXT REFERENCES users(id),
              company_id UUID REFERENCES companies(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });

      if (createInvoiceClientsError) {
        console.log('⚠️  Could not create invoice_clients table via RPC');
      } else {
        console.log('✅ Invoice clients table created successfully');
      }
    } else if (invoiceClientsCheck && !invoiceClientsCheck[0]?.company_id) {
      console.log('📋 Adding company_id column to invoice_clients...');
      
      const { error: alterError } = await supabase
        .rpc('exec_sql', {
          sql: `
            ALTER TABLE invoice_clients 
            ADD COLUMN company_id UUID REFERENCES companies(id);
          `
        });

      if (alterError) {
        console.log('⚠️  Could not add company_id column via RPC');
      } else {
        console.log('✅ Company_id column added to invoice_clients');
      }
    } else {
      console.log('✅ Invoice clients table exists with company_id column');
    }

    // Check if flight_hours table exists and has company_id column
    console.log('📋 Checking flight_hours table...');
    const { data: flightHoursCheck, error: flightHoursError } = await supabase
      .from('flight_hours')
      .select('id, company_id')
      .limit(1);

    if (flightHoursError && flightHoursError.code === '42P01') {
      console.log('❌ Flight hours table does not exist. Creating...');
      
      const { error: createFlightHoursError } = await supabase
        .rpc('exec_sql', {
          sql: `
            CREATE TABLE flight_hours (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
              user_id TEXT REFERENCES users(id),
              company_id UUID REFERENCES companies(id),
              invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE CASCADE,
              flight_date DATE NOT NULL,
              hours_regular DECIMAL(5,2) DEFAULT 0,
              hours_promotional DECIMAL(5,2) DEFAULT 0,
              total_hours DECIMAL(5,2) NOT NULL,
              rate_per_hour DECIMAL(10,2) NOT NULL,
              total_amount DECIMAL(10,2) NOT NULL,
              notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });

      if (createFlightHoursError) {
        console.log('⚠️  Could not create flight_hours table via RPC');
      } else {
        console.log('✅ Flight hours table created successfully');
      }
    } else if (flightHoursCheck && !flightHoursCheck[0]?.company_id) {
      console.log('📋 Adding company_id column to flight_hours...');
      
      const { error: alterError } = await supabase
        .rpc('exec_sql', {
          sql: `
            ALTER TABLE flight_hours 
            ADD COLUMN company_id UUID REFERENCES companies(id);
          `
        });

      if (alterError) {
        console.log('⚠️  Could not add company_id column via RPC');
      } else {
        console.log('✅ Company_id column added to flight_hours');
      }
    } else {
      console.log('✅ Flight hours table exists with company_id column');
    }

    console.log('\n🎉 Database setup completed!');
    console.log('📋 Features available:');
    console.log('   • Companies table for tracking company information');
    console.log('   • User-company relationships table');
    console.log('   • Enhanced invoice import with automatic company-user linking');
    console.log('   • Improved email matching for user identification');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL commands:');
    console.log(`
-- Create companies table
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

-- Create user_company_relationships table
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

-- Add company_id to invoice_clients if it doesn't exist
ALTER TABLE invoice_clients 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to flight_hours if it doesn't exist
ALTER TABLE flight_hours 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
    `);
  }
}

setupInvoiceDatabase(); 