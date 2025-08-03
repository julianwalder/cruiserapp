const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentConstraints() {
  console.log('🔍 CHECKING CURRENT CONSTRAINT STATE...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check if user_roles table exists and has data
    console.log('📋 Checking user_roles table...');
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);

    if (userRolesError) {
      console.error('❌ Error accessing user_roles table:', userRolesError);
      return;
    }

    console.log('✅ user_roles table accessible');
    if (userRoles.length > 0) {
      console.log('Sample record:', userRoles[0]);
    }
    console.log('');

    // Check if users table exists
    console.log('📋 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (usersError) {
      console.error('❌ Error accessing users table:', usersError);
      return;
    }

    console.log('✅ users table accessible');
    if (users.length > 0) {
      console.log('Sample user:', users[0]);
    }
    console.log('');

    // Check if roles table exists
    console.log('📋 Checking roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')
      .limit(1);

    if (rolesError) {
      console.error('❌ Error accessing roles table:', rolesError);
      return;
    }

    console.log('✅ roles table accessible');
    if (roles.length > 0) {
      console.log('Sample role:', roles[0]);
    }
    console.log('');

    // Test the exact query that's failing
    console.log('📋 Testing the failing query...');
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        password,
        status,
        user_roles!user_roles_userId_fkey (
          roles (
            name
          )
        )
      `)
      .eq('email', 'admin@cruiserapp.com')
      .single();

    if (error) {
      console.log('❌ Query still failing:', error.message);
      console.log('');
      console.log('🔧 POSSIBLE ISSUES:');
      console.log('1. The SQL might not have executed successfully');
      console.log('2. There might be a syntax error in the SQL');
      console.log('3. The constraint names might be different than expected');
      console.log('');
      console.log('📋 NEXT STEPS:');
      console.log('1. Go back to Supabase SQL Editor');
      console.log('2. Check if there were any error messages when you ran the SQL');
      console.log('3. Try running this query to see current constraints:');
      console.log('');
      console.log('─'.repeat(60));
      console.log(`
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user_roles'
ORDER BY tc.constraint_name;
      `);
      console.log('─'.repeat(60));
      console.log('');
      console.log('4. Share the results with me so I can help further');
    } else {
      console.log('✅ Query succeeded! The fix worked!');
      console.log('User data:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.user_roles?.map(ur => ur.roles.name) || []
      });
      console.log('');
      console.log('🎉 Your login should now work!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentConstraints(); 