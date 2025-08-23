const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testImpersonation() {
  try {
    console.log('🔍 Testing impersonation setup...');
    
    // First, let's find a SUPER_ADMIN user
    const { data: superAdmins, error: superAdminError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('user_roles.roles.name', 'SUPER_ADMIN');

    if (superAdminError) {
      console.error('Error finding SUPER_ADMIN users:', superAdminError);
      return;
    }

    console.log('SUPER_ADMIN users found:', superAdmins?.length || 0);
    if (superAdmins && superAdmins.length > 0) {
      console.log('First SUPER_ADMIN:', {
        id: superAdmins[0].id,
        email: superAdmins[0].email,
        name: `${superAdmins[0].firstName} ${superAdmins[0].lastName}`,
        roles: superAdmins[0].user_roles?.map(ur => ur.roles.name) || []
      });
    }

    // Now let's find Bogdan Luca
    const { data: bogdanLuca, error: bogdanError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        firstName,
        lastName,
        status,
        user_roles (
          roles (
            name
          )
        )
      `)
      .eq('email', 'bogdan.luca@gmail.com')
      .single();

    if (bogdanError) {
      console.error('Error finding Bogdan Luca:', bogdanError);
      return;
    }

    console.log('Bogdan Luca found:', {
      id: bogdanLuca.id,
      email: bogdanLuca.email,
      name: `${bogdanLuca.firstName} ${bogdanLuca.lastName}`,
      status: bogdanLuca.status,
      roles: bogdanLuca.user_roles?.map(ur => ur.roles.name) || []
    });

    // Test the user_roles relationship
    console.log('\n🔍 Testing user_roles relationship...');
    
    if (superAdmins && superAdmins.length > 0) {
      const testUser = superAdmins[0];
      console.log('Test user user_roles structure:', JSON.stringify(testUser.user_roles, null, 2));
      
      const hasSuperAdminRole = testUser.user_roles?.some(ur => ur.roles.name === 'SUPER_ADMIN');
      console.log('Has SUPER_ADMIN role:', hasSuperAdminRole);
    }

  } catch (error) {
    console.error('Error in test:', error);
  }
}

testImpersonation();
