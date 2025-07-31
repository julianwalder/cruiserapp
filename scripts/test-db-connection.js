#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

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

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and checking tables...\n');

  try {
    // Test basic connection
    console.log('📋 Testing basic connection...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Failed to connect to users table:', usersError.message);
      return;
    }
    console.log('✅ Users table accessible');

    // Check invoices table
    console.log('📋 Checking invoices table...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);

    if (invoicesError) {
      console.error('❌ Invoices table error:', invoicesError.message);
    } else {
      console.log('✅ Invoices table accessible');
    }

    // Check invoice_clients table
    console.log('📋 Checking invoice_clients table...');
    const { data: invoiceClients, error: invoiceClientsError } = await supabase
      .from('invoice_clients')
      .select('id, company_id')
      .limit(1);

    if (invoiceClientsError) {
      console.error('❌ Invoice_clients table error:', invoiceClientsError.message);
    } else {
      console.log('✅ Invoice_clients table accessible');
      if (invoiceClients && invoiceClients.length > 0) {
        console.log('   - Has company_id column:', !!invoiceClients[0].company_id);
      }
    }

    // Check invoice_items table
    console.log('📋 Checking invoice_items table...');
    const { data: invoiceItems, error: invoiceItemsError } = await supabase
      .from('invoice_items')
      .select('id')
      .limit(1);

    if (invoiceItemsError) {
      console.error('❌ Invoice_items table error:', invoiceItemsError.message);
    } else {
      console.log('✅ Invoice_items table accessible');
    }

    // Check flight_hours table
    console.log('📋 Checking flight_hours table...');
    const { data: flightHours, error: flightHoursError } = await supabase
      .from('flight_hours')
      .select('id, company_id')
      .limit(1);

    if (flightHoursError) {
      console.error('❌ Flight_hours table error:', flightHoursError.message);
    } else {
      console.log('✅ Flight_hours table accessible');
      if (flightHours && flightHours.length > 0) {
        console.log('   - Has company_id column:', !!flightHours[0].company_id);
      }
    }

    // Check companies table
    console.log('📋 Checking companies table...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError) {
      console.error('❌ Companies table error:', companiesError.message);
      console.log('   - Companies table does not exist yet');
    } else {
      console.log('✅ Companies table accessible');
    }

    // Check user_company_relationships table
    console.log('📋 Checking user_company_relationships table...');
    const { data: relationships, error: relationshipsError } = await supabase
      .from('user_company_relationships')
      .select('id')
      .limit(1);

    if (relationshipsError) {
      console.error('❌ User_company_relationships table error:', relationshipsError.message);
      console.log('   - User_company_relationships table does not exist yet');
    } else {
      console.log('✅ User_company_relationships table accessible');
    }

    console.log('\n📊 Summary:');
    console.log('✅ Users table: OK');
    console.log(invoicesError ? '❌ Invoices table: ERROR' : '✅ Invoices table: OK');
    console.log(invoiceClientsError ? '❌ Invoice_clients table: ERROR' : '✅ Invoice_clients table: OK');
    console.log(invoiceItemsError ? '❌ Invoice_items table: ERROR' : '✅ Invoice_items table: OK');
    console.log(flightHoursError ? '❌ Flight_hours table: ERROR' : '✅ Flight_hours table: OK');
    console.log(companiesError ? '❌ Companies table: MISSING' : '✅ Companies table: OK');
    console.log(relationshipsError ? '❌ User_company_relationships table: MISSING' : '✅ User_company_relationships table: OK');

    if (companiesError || relationshipsError) {
      console.log('\n🔧 Next Steps:');
      console.log('1. Run the manual SQL setup in Supabase dashboard');
      console.log('2. Use the SQL from scripts/manual-setup.sql');
      console.log('3. Or run: node scripts/setup-invoices-simple.js');
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabaseConnection(); 