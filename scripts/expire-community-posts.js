const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function expireOldPosts() {
  console.log('🕐 Starting community board post expiration job...');

  try {
    // Call the database function to expire old posts
    const { data, error } = await supabase.rpc('expire_old_posts');

    if (error) {
      console.error('❌ Error expiring posts:', error);
      process.exit(1);
    }

    // Get count of expired posts for reporting
    const { count, error: countError } = await supabase
      .from('help_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 60000).toISOString()); // Posts updated in the last minute

    if (countError) {
      console.error('❌ Error counting expired posts:', countError);
    } else {
      console.log(`✅ Successfully expired ${count || 0} posts`);
    }

    console.log('✅ Community board post expiration job completed successfully!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the function
expireOldPosts();
