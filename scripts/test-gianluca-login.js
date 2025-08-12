const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGianlucaLogin() {
  try {
    console.log('🔍 Testing Gianluca\'s login and billing access...\n');

    // Gianluca's credentials
    const gianlucaEmail = 'giandipinto@gmail.com';
    const gianlucaPassword = 'password123'; // You might need to adjust this

    // First, let's check if Gianluca exists and get his user ID
    const { data: gianluca, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('email', gianlucaEmail)
      .single();

    if (userError || !gianluca) {
      console.error('❌ Error finding Gianluca:', userError);
      return;
    }

    console.log('👤 Gianluca found:');
    console.log(`  - Name: ${gianluca.firstName} ${gianluca.lastName}`);
    console.log(`  - Email: ${gianluca.email}`);
    console.log(`  - Status: ${gianluca.status}`);
    console.log(`  - Roles: ${gianluca.user_roles.map(ur => ur.roles.name).join(', ')}`);
    console.log('');

    // Test the login API
    console.log('🔐 Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: gianlucaEmail,
        password: gianlucaPassword,
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log(`  - Token: ${loginData.token ? 'Present' : 'Missing'}`);
      console.log(`  - User ID: ${loginData.user?.id || 'Missing'}`);
      console.log('');

      // Test billing page access with token
      console.log('📄 Testing billing page access...');
      const billingResponse = await fetch('http://localhost:3000/billing', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
        },
      });

      console.log(`  - Billing page status: ${billingResponse.status}`);
      if (billingResponse.status === 200) {
        console.log('✅ Billing page accessible');
      } else {
        console.log('❌ Billing page not accessible');
        const billingText = await billingResponse.text();
        console.log(`  - Response: ${billingText.substring(0, 200)}...`);
      }

      // Test the all-invoices API
      console.log('\n🔍 Testing all-invoices API...');
      const invoicesResponse = await fetch(`http://localhost:3000/api/users/${gianluca.id}/all-invoices`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
        },
      });

      console.log(`  - Invoices API status: ${invoicesResponse.status}`);
      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        console.log(`  - Found ${invoicesData.invoices?.length || 0} invoices`);
        console.log(`  - Summary: ${invoicesData.summary ? 'Present' : 'Missing'}`);
      } else {
        console.log('❌ Invoices API not accessible');
        const invoicesText = await invoicesResponse.text();
        console.log(`  - Response: ${invoicesText.substring(0, 200)}...`);
      }

    } else {
      console.log('❌ Login failed');
      const loginText = await loginResponse.text();
      console.log(`  - Status: ${loginResponse.status}`);
      console.log(`  - Response: ${loginText.substring(0, 200)}...`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGianlucaLogin();
