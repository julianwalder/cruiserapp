const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createNotificationsTable() {
  try {
    console.log('🔧 Creating notifications table...\n');

    const sql = `
      -- Create notifications table for user-specific notifications
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'system', -- system, flight, billing, fleet, weather, etc.
          is_read BOOLEAN DEFAULT FALSE,
          is_deleted BOOLEAN DEFAULT FALSE,
          metadata JSONB, -- Additional data like entity_id, action, etc.
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          read_at TIMESTAMP WITH TIME ZONE,
          deleted_at TIMESTAMP WITH TIME ZONE
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_deleted ON notifications(is_deleted);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

      -- Add RLS policies
      ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

      -- Users can view their own notifications (not deleted)
      DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
      CREATE POLICY "Users can view their own notifications" ON notifications
          FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

      -- Users can update their own notifications (mark as read)
      DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
      CREATE POLICY "Users can update their own notifications" ON notifications
          FOR UPDATE USING (auth.uid() = user_id);

      -- Users can delete their own notifications (soft delete)
      DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
      CREATE POLICY "Users can delete their own notifications" ON notifications
          FOR UPDATE USING (auth.uid() = user_id);

      -- System can create notifications for any user
      DROP POLICY IF EXISTS "System can create notifications" ON notifications;
      CREATE POLICY "System can create notifications" ON notifications
          FOR INSERT WITH CHECK (true);

      -- Admins can view all notifications
      DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
      CREATE POLICY "Admins can view all notifications" ON notifications
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM user_roles ur 
                  JOIN roles r ON ur."roleId" = r.id 
                  WHERE ur."userId" = auth.uid() 
                  AND r.name IN ('SUPER_ADMIN', 'ADMIN')
              )
          );
    `;

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Error creating notifications table:', error);
      return;
    }

    console.log('✅ Notifications table created successfully!');

    // Verify the table was created
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'notifications');

    if (tableError) {
      console.error('❌ Error verifying table creation:', tableError);
    } else {
      console.log('✅ Table verification successful');
    }

  } catch (error) {
    console.error('❌ Error creating notifications table:', error);
  }
}

createNotificationsTable();
