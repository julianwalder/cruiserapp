const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBaseManagers() {
  console.log('🔍 Checking for users with BASE_MANAGER role...\n');

  try {
    // Get all users with their roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        userId,
        roles (
          name
        )
      `);

    if (userRolesError) {
      console.error('❌ Error fetching user roles:', userRolesError);
      return;
    }

    // Filter users with BASE_MANAGER role
    const baseManagers = userRoles.filter(ur => ur.roles.name === 'BASE_MANAGER');
    
    console.log(`📊 Found ${baseManagers.length} users with BASE_MANAGER role:`);
    
    if (baseManagers.length === 0) {
      console.log('❌ No users have the BASE_MANAGER role assigned');
      console.log('\n💡 To fix this, you need to:');
      console.log('1. Assign the BASE_MANAGER role to existing users, or');
      console.log('2. Create new users with the BASE_MANAGER role');
      console.log('\n📋 All available roles:');
      
      // Get all unique roles
      const allRoles = [...new Set(userRoles.map(ur => ur.roles.name))];
      allRoles.forEach(role => {
        const count = userRoles.filter(ur => ur.roles.name === role).length;
        console.log(`   - ${role}: ${count} users`);
      });
    } else {
      // Get user details for base managers
      const userIds = baseManagers.map(bm => bm.userId);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, firstName, lastName')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Error fetching user details:', usersError);
        return;
      }

      baseManagers.forEach(bm => {
        const user = users.find(u => u.id === bm.userId);
        if (user) {
          console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkBaseManagers();
