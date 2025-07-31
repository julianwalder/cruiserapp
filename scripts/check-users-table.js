const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersTable() {
  console.log('🔍 Checking users table structure...');
  
  try {
    // Check if there are any users and their ID types
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(3);
    
    if (usersError) {
      console.log('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log('📋 Sample users:');
    users?.forEach(user => {
      console.log(`   - ${user.email}: id type = ${typeof user.id}, value = ${user.id}`);
    });
    
    // Try to get table structure using a different approach
    console.log('\n📋 Checking table structure via direct query...');
    
    // Check if ppl_course_tranches table exists
    const { data: pplCheck, error: pplError } = await supabase
      .from('ppl_course_tranches')
      .select('id')
      .limit(1);
    
    if (pplError && pplError.code === '42P01') {
      console.log('✅ PPL course table does not exist yet (this is expected)');
    } else if (pplError) {
      console.log('❌ Error checking PPL course table:', pplError);
    } else {
      console.log('✅ PPL course table exists');
    }
    
    // Let's also check the companies table to see the pattern
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);
    
    if (companiesError) {
      console.log('❌ Error checking companies table:', companiesError);
    } else {
      console.log('\n📋 Sample company:');
      companies?.forEach(company => {
        console.log(`   - ${company.name}: id type = ${typeof company.id}, value = ${company.id}`);
      });
    }
    
    // Based on the error message, it seems the users table has TEXT IDs, not UUID
    console.log('\n💡 Analysis:');
    console.log('The error suggests that the users table has TEXT IDs, not UUID.');
    console.log('This means we need to change the PPL course table to use TEXT for user_id.');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkUsersTable(); 