const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testBaseManagersAPI() {
  console.log('🔍 Testing base managers API logic...\n');

  try {
    // Simulate the API logic
    const { data: users, error: usersError } = await supabase.rpc('list_users');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Total users found: ${users.length}`);

    // Get role information for the users
    const userIds = users.map(u => u.id);
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        userId,
        roles (
          name
        )
      `)
      .in('userId', userIds);

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError);
      return;
    }

    console.log(`📊 User roles found: ${userRoles.length}`);

    // Create role map
    const roleMap = new Map();
    userRoles.forEach(ur => {
      if (!roleMap.has(ur.userId)) {
        roleMap.set(ur.userId, []);
      }
      roleMap.get(ur.userId).push(ur.roles.name);
    });

    // Add roles to users
    const usersWithRoles = users.map(user => ({
      ...user,
      roles: roleMap.get(user.id) || []
    }));

    // Filter by BASE_MANAGER role
    const baseManagers = usersWithRoles.filter(user => 
      user.roles.includes('BASE_MANAGER')
    );

    console.log(`📊 Base managers found: ${baseManagers.length}`);
    
    if (baseManagers.length > 0) {
      console.log('✅ Base managers:');
      baseManagers.forEach(bm => {
        console.log(`   - ${bm.firstName} ${bm.lastName} (${bm.email}) - Roles: ${bm.roles.join(', ')}`);
      });
    } else {
      console.log('❌ No base managers found');
      console.log('\n📋 All users and their roles:');
      usersWithRoles.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email}) - Roles: ${user.roles.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testBaseManagersAPI();
