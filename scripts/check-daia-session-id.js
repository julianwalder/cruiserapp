require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDaiaSessionId() {
  console.log('🔍 Checking Daia\'s session ID...\n');

  try {
    // Get Daia's current data
    const { data: daiaUser, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        "firstName",
        "lastName",
        veriffSessionId,
        veriffWebhookData
      `)
      .eq('email', 'ops@cruiseraviation.ro')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching Daia\'s data:', fetchError);
      return;
    }

    if (!daiaUser) {
      console.error('❌ Daia\'s user record not found');
      return;
    }

    console.log('👤 Daia\'s Current Session Information:');
    console.log(`   Name: ${daiaUser.firstName} ${daiaUser.lastName}`);
    console.log(`   Email: ${daiaUser.email}`);
    console.log(`   Current Session ID: ${daiaUser.veriffSessionId || 'Not set'}`);

    // Check webhook data for session ID
    if (daiaUser.veriffWebhookData) {
      console.log('\n📄 Session ID from Webhook Data:');
      console.log(`   Session ID: ${daiaUser.veriffWebhookData.sessionId || 'Not found'}`);
      console.log(`   Raw Session ID: ${daiaUser.veriffWebhookData.rawPayload?.id || 'Not found'}`);
    }

    // Update session ID if it's missing
    const sessionId = daiaUser.veriffWebhookData?.sessionId || daiaUser.veriffWebhookData?.rawPayload?.id;
    
    if (sessionId && !daiaUser.veriffSessionId) {
      console.log('\n🔄 Updating session ID...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          veriffSessionId: sessionId,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', daiaUser.id);

      if (updateError) {
        console.error('❌ Error updating session ID:', updateError);
      } else {
        console.log('✅ Session ID updated successfully!');
        console.log(`   New Session ID: ${sessionId}`);
      }
    } else if (daiaUser.veriffSessionId) {
      console.log('\n✅ Session ID is already set correctly');
    } else {
      console.log('\n⚠️  No session ID found in webhook data');
    }

  } catch (error) {
    console.error('❌ Error checking Daia\'s session ID:', error);
  }
}

checkDaiaSessionId(); 