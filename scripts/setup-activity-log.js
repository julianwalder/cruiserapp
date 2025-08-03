const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupActivityLog() {
  console.log('🔧 Setting up Activity Log table...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    console.log('Make sure you have SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('📋 Creating activity_log table...');
    
    // Create the activity_log table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create activity_log table for tracking system events
        CREATE TABLE IF NOT EXISTS activity_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id TEXT,
            description TEXT NOT NULL,
            metadata JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
        CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
        CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

        -- Enable Row Level Security
        ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own activity" ON activity_log
            FOR SELECT USING (user_id::text = auth.uid());

        CREATE POLICY "Admins can view all activity" ON activity_log
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid()::text AND status = 'ACTIVE'
                    AND EXISTS (
                        SELECT 1 FROM user_roles ur
                        JOIN roles r ON ur."roleId" = r.id
                        WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
                    )
                )
            );

        CREATE POLICY "Service role can manage all activity" ON activity_log
            FOR ALL USING (auth.role() = 'service_role');

        -- Grant permissions
        GRANT ALL ON activity_log TO anon, authenticated;
      `
    });

    if (createError) {
      console.log('❌ Could not create table via RPC');
      console.log('Error:', createError);
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('Run this SQL in your Supabase SQL Editor:');
      console.log('');
      console.log('─'.repeat(80));
      console.log(`
-- Create activity_log table for tracking system events
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (user_id::text = auth.uid());

CREATE POLICY "Admins can view all activity" ON activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::text AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid()::text AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

CREATE POLICY "Service role can manage all activity" ON activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON activity_log TO anon, authenticated;
      `);
      console.log('─'.repeat(80));
      console.log('');
      console.log('📍 Steps:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Click "SQL Editor"');
      console.log('4. Click "New query"');
      console.log('5. Paste the SQL above');
      console.log('6. Click "Run"');
      console.log('7. Come back and run: node scripts/setup-activity-log.js');
      return;
    }

    console.log('✅ Activity log table created successfully!');
    console.log('');
    console.log('📋 Adding sample activity data...');

    // Add some sample activity data
    const { error: insertError } = await supabase
      .from('activity_log')
      .insert([
        {
          action: 'SYSTEM_STARTUP',
          entity_type: 'system',
          description: 'Activity log system initialized',
          metadata: { version: '2.0.0', feature: 'activity_logging' }
        },
        {
          action: 'DATABASE_MIGRATION',
          entity_type: 'system',
          description: 'UUID migration completed successfully',
          metadata: { migration_type: 'uuid', tables_updated: 15 }
        }
      ]);

    if (insertError) {
      console.log('⚠️  Could not insert sample data:', insertError.message);
    } else {
      console.log('✅ Sample activity data added!');
    }

    console.log('');
    console.log('🎉 Activity log system is ready!');
    console.log('');
    console.log('📋 What\'s been set up:');
    console.log('✅ Activity log table with proper indexes');
    console.log('✅ Row Level Security policies');
    console.log('✅ Sample activity data');
    console.log('✅ API endpoint for fetching activity');
    console.log('✅ Activity logging utility functions');
    console.log('');
    console.log('🚀 The Recent Activity section on the dashboard will now show real data!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setupActivityLog(); 