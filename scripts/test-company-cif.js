const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompanyCIF() {
  try {
    console.log('🔍 Testing company CIF field...');
    
    // First, let's see what columns exist in the companies table
    const { data: columns, error: columnsError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('Error fetching companies:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('📋 Available columns in companies table:');
      console.log(Object.keys(columns[0]));
    }
    
    // Now let's search for the specific company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%ASOCIATIA CLUB SPORTIV GO RACING%')
      .single();
    
    if (companyError) {
      console.error('Error fetching company:', companyError);
      return;
    }
    
    if (company) {
      console.log('✅ Found company:');
      console.log('Name:', company.name);
      console.log('ID:', company.id);
      console.log('vat_code:', company.vat_code);
      console.log('cif:', company.cif);
      console.log('email:', company.email);
      console.log('Full record:', JSON.stringify(company, null, 2));
    } else {
      console.log('❌ Company not found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCompanyCIF(); 