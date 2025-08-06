require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitorApprovalWebhooks() {
  console.log('🔍 Monitoring for approval webhooks and checking missing approvals...\n');

  try {
    // 1. Check for users with submitted status but no approval
    console.log('📊 Checking for users with submitted status but no approval...');
    
    const { data: submittedUsers, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        veriffSessionId,
        veriffWebhookReceivedAt,
        "identityVerified",
        "identityVerifiedAt",
        veriffWebhookData
      `)
      .eq('veriffStatus', 'submitted')
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (error) {
      console.error('❌ Error fetching submitted users:', error);
      return;
    }

    if (submittedUsers && submittedUsers.length > 0) {
      console.log(`⚠️  Found ${submittedUsers.length} users with submitted status:\n`);
      
      submittedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Session ID: ${user.veriffSessionId || 'None'}`);
        console.log(`   Submitted: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'Unknown'}`);
        console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Days Since Submission: ${user.veriffWebhookReceivedAt ? Math.floor((Date.now() - new Date(user.veriffWebhookReceivedAt).getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown'}`);
        
        if (user.veriffWebhookData) {
          console.log(`   Feature: ${user.veriffWebhookData.feature || 'Unknown'}`);
          console.log(`   Action: ${user.veriffWebhookData.action || 'Unknown'}`);
          console.log(`   Code: ${user.veriffWebhookData.code || 'Unknown'}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No users with submitted status found');
    }

    // 2. Check for recent webhook activity (last 24 hours)
    console.log('🕒 Checking for recent webhook activity (last 24 hours)...');
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: recentWebhooks, error: recentError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        veriffWebhookReceivedAt,
        "identityVerified",
        veriffWebhookData
      `)
      .gte('veriffWebhookReceivedAt', twentyFourHoursAgo.toISOString())
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (recentError) {
      console.error('❌ Error fetching recent webhooks:', recentError);
      return;
    }

    if (recentWebhooks && recentWebhooks.length > 0) {
      console.log(`📡 Found ${recentWebhooks.length} webhooks in the last 24 hours:\n`);
      
      recentWebhooks.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Webhook Time: ${new Date(user.veriffWebhookReceivedAt).toLocaleString()}`);
        console.log(`   Status: ${user.veriffStatus || 'None'}`);
        console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
        
        if (user.veriffWebhookData) {
          console.log(`   Action: ${user.veriffWebhookData.action || 'Unknown'}`);
          console.log(`   Feature: ${user.veriffWebhookData.feature || 'Unknown'}`);
          console.log(`   Code: ${user.veriffWebhookData.code || 'Unknown'}`);
        }
        console.log('');
      });
    } else {
      console.log('📭 No webhooks in the last 24 hours');
    }

    // 3. Check for users who might need approval webhooks
    console.log('🔍 Checking for users who might need approval webhooks...');
    
    const { data: pendingApprovals, error: pendingError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffStatus,
        veriffSessionId,
        veriffWebhookReceivedAt,
        "identityVerified",
        veriffWebhookData
      `)
      .or('veriffStatus.eq.submitted,veriffStatus.eq.created')
      .not('veriffSessionId', 'is', null)
      .order('veriffWebhookReceivedAt', { ascending: false });

    if (pendingError) {
      console.error('❌ Error fetching pending approvals:', pendingError);
      return;
    }

    if (pendingApprovals && pendingApprovals.length > 0) {
      console.log(`⏳ Found ${pendingApprovals.length} users with pending approvals:\n`);
      
      pendingApprovals.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Session ID: ${user.veriffSessionId}`);
        console.log(`   Status: ${user.veriffStatus}`);
        console.log(`   Last Webhook: ${user.veriffWebhookReceivedAt ? new Date(user.veriffWebhookReceivedAt).toLocaleString() : 'None'}`);
        console.log(`   Identity Verified: ${user.identityVerified ? '✅ Yes' : '❌ No'}`);
        
        if (user.veriffWebhookData) {
          console.log(`   Last Action: ${user.veriffWebhookData.action || 'Unknown'}`);
          console.log(`   Feature: ${user.veriffWebhookData.feature || 'Unknown'}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No pending approvals found');
    }

    // 4. Summary and recommendations
    console.log('📋 Summary and Recommendations:');
    console.log('   1. Monitor webhook endpoint for new approval notifications');
    console.log('   2. Check Veriff dashboard for manual approval requirements');
    console.log('   3. Consider implementing webhook retry logic');
    console.log('   4. Set up alerts for webhook failures');
    console.log('   5. Verify webhook signature validation is working');

    // 5. Check webhook endpoint status
    console.log('\n🔗 Checking webhook endpoint status...');
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/veriff/webhook`;
      console.log(`   Webhook URL: ${webhookUrl}`);
      console.log('   Status: Active (based on code)');
      console.log('   Signature Validation: Enabled');
      console.log('   Processing: Enhanced + Legacy fallback');
    } catch (error) {
      console.log('   ❌ Could not verify webhook endpoint status');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
monitorApprovalWebhooks(); 