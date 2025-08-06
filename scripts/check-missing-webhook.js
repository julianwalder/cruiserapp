require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingWebhook() {
  console.log('🔍 Checking for missing webhooks and recent activity...\n');

  try {
    // 1. Check recent user activity and updates
    console.log('📊 Checking recent user activity...');
    
    const { data: recentUsers, error: recentError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "updatedAt",
        "createdAt",
        veriffStatus,
        veriffSessionId,
        veriffWebhookReceivedAt,
        "identityVerified",
        "identityVerifiedAt"
      `)
      .order('updatedAt', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent users:', recentError);
      return;
    }

    console.log(`📈 Found ${recentUsers.length} recent user updates:\n`);

    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Updated: ${new Date(user.updatedAt).toLocaleString()}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
      console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
      
      if (user.veriffWebhookReceivedAt) {
        console.log(`   Last Webhook: ${new Date(user.veriffWebhookReceivedAt).toLocaleString()}`);
      }
      
      if (user.identityVerifiedAt) {
        console.log(`   Verified At: ${new Date(user.identityVerifiedAt).toLocaleString()}`);
      }
      
      console.log(''); // Empty line
    });

    // 2. Check for any users with recent updates but no webhook data
    console.log('🔍 Checking for users with recent updates but missing webhook data...');
    
    const { data: usersWithUpdates, error: updatesError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "updatedAt",
        veriffStatus,
        veriffSessionId,
        veriffWebhookReceivedAt,
        "identityVerified"
      `)
      .gte('updatedAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('updatedAt', { ascending: false });

    if (updatesError) {
      console.error('❌ Error fetching users with recent updates:', updatesError);
      return;
    }

    const usersWithoutWebhooks = usersWithUpdates.filter(user => 
      !user.veriffWebhookReceivedAt && 
      (user.veriffStatus || user.veriffSessionId || user.identityVerified)
    );

    if (usersWithoutWebhooks.length > 0) {
      console.log(`⚠️  Found ${usersWithoutWebhooks.length} users with recent activity but missing webhook data:\n`);
      
      usersWithoutWebhooks.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Updated: ${new Date(user.updatedAt).toLocaleString()}`);
        console.log(`   Veriff Status: ${user.veriffStatus || 'None'}`);
        console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);
        console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Missing Webhook: ${!user.veriffWebhookReceivedAt ? '❌ Yes' : '✅ No'}`);
        console.log('');
      });
    } else {
      console.log('✅ All users with recent activity have webhook data');
    }

    // 3. Check activity logs for any Veriff-related activity
    console.log('📝 Checking activity logs for Veriff-related activity...');
    
    try {
      const { data: activityLogs, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .or('action.ilike.%veriff%,action.ilike.%verification%')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (activityError) {
        console.log('⚠️  Activity log table may not exist or have different structure');
      } else if (activityLogs && activityLogs.length > 0) {
        console.log(`📋 Found ${activityLogs.length} Veriff-related activity logs:\n`);
        
        activityLogs.forEach((log, index) => {
          console.log(`${index + 1}. ${log.action} - ${log.userId}`);
          console.log(`   Timestamp: ${new Date(log.timestamp).toLocaleString()}`);
          console.log(`   Details: ${JSON.stringify(log.details || {})}`);
          console.log('');
        });
      } else {
        console.log('📭 No Veriff-related activity logs found');
      }
    } catch (error) {
      console.log('⚠️  Could not check activity logs:', error.message);
    }

    // 4. Check for any users who might have completed verification recently
    console.log('🔍 Checking for users who might have completed verification recently...');
    
    const { data: recentlyVerified, error: verifiedError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        "identityVerifiedAt",
        veriffStatus,
        veriffWebhookReceivedAt,
        "updatedAt"
      `)
      .eq('identityVerified', true)
      .order('identityVerifiedAt', { ascending: false })
      .limit(5);

    if (verifiedError) {
      console.error('❌ Error fetching recently verified users:', verifiedError);
      return;
    }

    if (recentlyVerified && recentlyVerified.length > 0) {
      console.log(`✅ Found ${recentlyVerified.length} recently verified users:\n`);
      
      recentlyVerified.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Verified At: ${new Date(user.identityVerifiedAt).toLocaleString()}`);
        console.log(`   Webhook Received: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : '❌ Missing'}`);
        console.log(`   Status: ${user.veriffStatus || 'None'}`);
        console.log(`   Last Updated: ${new Date(user.updatedAt).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('📭 No recently verified users found');
    }

    // 5. Summary and recommendations
    console.log('📋 Summary and Recommendations:');
    console.log('   1. Check if the webhook URL is correctly configured in Veriff dashboard');
    console.log('   2. Verify that the webhook endpoint is publicly accessible');
    console.log('   3. Check server logs for any failed webhook attempts');
    console.log('   4. Verify webhook signature validation is working correctly');
    console.log('   5. Check if there are any network/firewall issues blocking webhooks');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkMissingWebhook(); 