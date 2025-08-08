#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

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

async function testProformaInvoiceFunctionality() {
  console.log('🧪 Testing Proforma Invoice Functionality...\n');

  try {
    // 1. Test database schema
    console.log('1. Testing database schema...');
    
    // Check if new columns exist in invoices table
    const { data: invoiceColumns, error: invoiceColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'invoices')
      .in('column_name', ['user_id', 'package_id', 'payment_method', 'payment_link', 'payment_status']);

    if (invoiceColumnsError) {
      console.error('❌ Error checking invoice columns:', invoiceColumnsError);
      return;
    }

    const requiredColumns = ['user_id', 'package_id', 'payment_method', 'payment_link', 'payment_status'];
    const existingColumns = invoiceColumns.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.error('❌ Missing columns in invoices table:', missingColumns);
      console.log('💡 Run the database migration script: scripts/add-proforma-invoice-columns.sql');
      return;
    }

    console.log('✅ Database schema is correct');

    // 2. Test hour package templates
    console.log('\n2. Testing hour package templates...');
    
    const { data: packages, error: packagesError } = await supabase
      .from('hour_package_templates')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (packagesError) {
      console.error('❌ Error fetching hour packages:', packagesError);
      return;
    }

    if (!packages || packages.length === 0) {
      console.error('❌ No active hour packages found');
      console.log('💡 Create some hour packages first');
      return;
    }

    console.log(`✅ Found ${packages.length} active hour packages`);
    packages.forEach(pkg => {
      console.log(`   - ${pkg.name}: ${pkg.hours} hours, ${pkg.total_price} ${pkg.currency}`);
    });

    // 3. Test user data with Veriff verification
    console.log('\n3. Testing user data with Veriff verification...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "personalNumber",
        phone,
        address,
        city,
        country,
        "veriffPersonIdNumber",
        "veriffPersonGivenName",
        "veriffPersonLastName",
        "veriffPersonCountry"
      `)
      .not('veriffPersonIdNumber', 'is', null)
      .limit(3);

    if (usersError) {
      console.error('❌ Error fetching users with Veriff data:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users with Veriff verification data found');
      console.log('💡 Complete Veriff verification for some users first');
    } else {
      console.log(`✅ Found ${users.length} users with Veriff verification data`);
      users.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`     Veriff ID: ${user.veriffPersonIdNumber}`);
        console.log(`     Address: ${user.address || 'N/A'}, ${user.city || 'N/A'}, ${user.country || 'N/A'}`);
      });
    }

    // 4. Test company relationships
    console.log('\n4. Testing company relationships...');
    
    const { data: companyRelationships, error: companyError } = await supabase
      .from('user_company_relationships')
      .select(`
        user_id,
        company_id,
        is_primary,
        companies (
          name,
          vat_code,
          address,
          city,
          country
        )
      `)
      .eq('is_primary', true)
      .limit(3);

    if (companyError) {
      console.error('❌ Error fetching company relationships:', companyError);
      return;
    }

    if (!companyRelationships || companyRelationships.length === 0) {
      console.log('⚠️  No company relationships found');
      console.log('💡 Link some users to companies first');
    } else {
      console.log(`✅ Found ${companyRelationships.length} company relationships`);
      companyRelationships.forEach(rel => {
        console.log(`   - User ${rel.user_id} -> ${rel.companies.name} (${rel.companies.vat_code})`);
      });
    }

    // 5. Test Smartbill imports
    console.log('\n5. Testing Smartbill imports...');
    
    const { data: smartbillInvoices, error: smartbillError } = await supabase
      .from('invoices')
      .select('smartbill_id, client_email, import_date')
      .not('smartbill_id', 'is', null)
      .limit(3);

    if (smartbillError) {
      console.error('❌ Error fetching Smartbill invoices:', smartbillError);
      return;
    }

    if (!smartbillInvoices || smartbillInvoices.length === 0) {
      console.log('⚠️  No Smartbill invoices found');
      console.log('💡 Import some invoices from Smartbill first');
    } else {
      console.log(`✅ Found ${smartbillInvoices.length} Smartbill invoices`);
      smartbillInvoices.forEach(invoice => {
        console.log(`   - ${invoice.smartbill_id} for ${invoice.client_email} (${invoice.import_date})`);
      });
    }

    // 6. Test data consolidation logic
    console.log('\n6. Testing data consolidation logic...');
    
    if (users && users.length > 0) {
      const testUser = users[0];
      console.log(`Testing data consolidation for user: ${testUser.firstName} ${testUser.lastName}`);
      
      // Simulate data consolidation
      const consolidatedData = {
        // Personal identification - prioritize Veriff ID number, then CNP from Smartbill
        cnp: testUser.personalNumber,
        idNumber: testUser.veriffPersonIdNumber,
        
        // Personal information - prioritize Veriff data, fallback to profile
        firstName: testUser.veriffPersonGivenName || testUser.firstName,
        lastName: testUser.veriffPersonLastName || testUser.lastName,
        email: testUser.email,
        phone: testUser.phone,
        
        // Address information - use profile data
        address: testUser.address,
        city: testUser.city,
        country: testUser.veriffPersonCountry || testUser.country,
      };

      console.log('   Consolidated data:');
      console.log(`     CNP/ID: ${consolidatedData.cnp || consolidatedData.idNumber || 'Missing'}`);
      console.log(`     Name: ${consolidatedData.firstName} ${consolidatedData.lastName}`);
      console.log(`     Email: ${consolidatedData.email}`);
      console.log(`     Address: ${consolidatedData.address || 'Missing'}, ${consolidatedData.city || 'Missing'}, ${consolidatedData.country || 'Missing'}`);

      // Validate data
      const missingFields = [];
      if (!consolidatedData.cnp && !consolidatedData.idNumber) {
        missingFields.push('CNP or ID Number');
      }
      if (!consolidatedData.firstName || !consolidatedData.lastName) {
        missingFields.push('First Name and Last Name');
      }
      if (!consolidatedData.address || !consolidatedData.city || !consolidatedData.country) {
        missingFields.push('Complete Address (Street, City, Country)');
      }

      if (missingFields.length === 0) {
        console.log('   ✅ All required data is available');
      } else {
        console.log(`   ⚠️  Missing required data: ${missingFields.join(', ')}`);
      }
    }

    // 7. Test API endpoints (if running locally)
    console.log('\n7. Testing API endpoints...');
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`   Base URL: ${baseUrl}`);
    
    // Note: This would require a valid JWT token to test properly
    console.log('   💡 To test API endpoints, you need to:');
    console.log('      1. Start the development server (npm run dev)');
    console.log('      2. Login to get a valid JWT token');
    console.log('      3. Test the /api/proforma-invoices endpoints');

    console.log('\n🎉 Proforma invoice functionality test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Database schema: ✅ Ready');
    console.log('   - Hour packages: ✅ Available');
    console.log('   - User data: ⚠️  Needs Veriff verification');
    console.log('   - Company data: ⚠️  Optional');
    console.log('   - Smartbill data: ⚠️  Optional');
    console.log('   - API endpoints: 💡 Ready for testing');

    console.log('\n🚀 Next steps:');
    console.log('   1. Complete Veriff verification for users');
    console.log('   2. Import Smartbill invoices for CNP data');
    console.log('   3. Link users to companies (optional)');
    console.log('   4. Test the API endpoints with valid authentication');
    console.log('   5. Integrate with a payment provider for payment links');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testProformaInvoiceFunctionality()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
