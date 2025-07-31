const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCompanyCIF() {
  try {
    console.log('🔍 Updating company CIF...');
    
    // Update the company with the CIF value
    const { data, error } = await supabase
      .from('companies')
      .update({ vat_code: '36729443' })
      .eq('name', 'ASOCIATIA CLUB SPORTIV GO RACING')
      .select();
    
    if (error) {
      console.error('Error updating company:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Company updated successfully:');
      console.log('Name:', data[0].name);
      console.log('VAT Code:', data[0].vat_code);
      console.log('ID:', data[0].id);
    } else {
      console.log('❌ No company found to update');
    }
    
  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateCompanyCIF(); 