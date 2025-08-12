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
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id AND is_deleted = FALSE);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications (soft delete)
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications for any user
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

      -- Admins can view all notifications
      CREATE POLICY "Admins can view all notifications" ON notifications
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM user_roles ur 
                  JOIN roles r ON ur."roleId" = r.id 
                  WHERE ur."userId" = auth.uid() 
                  AND r.name IN ('SUPER_ADMIN', 'ADMIN')
              )
          );

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'User-specific notifications with read/unread status';
COMMENT ON COLUMN notifications.user_id IS 'User who should receive this notification';
COMMENT ON COLUMN notifications.title IS 'Notification title';
COMMENT ON COLUMN notifications.message IS 'Notification message';
COMMENT ON COLUMN notifications.type IS 'Type of notification (system, flight, billing, etc.)';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';
COMMENT ON COLUMN notifications.is_deleted IS 'Whether the notification has been deleted (soft delete)';
COMMENT ON COLUMN notifications.metadata IS 'Additional data like entity_id, action, etc.';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp when notification was marked as read';
COMMENT ON COLUMN notifications.deleted_at IS 'Timestamp when notification was deleted';
