-- Create activity_log table for tracking system events (Final version)
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

-- Create RLS policies with proper type casting
CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (user_id::text = auth.uid());

CREATE POLICY "Admins can view all activity" ON activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND status = 'ACTIVE'
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId"::text = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
            )
        )
    );

CREATE POLICY "Service role can manage all activity" ON activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON activity_log TO anon, authenticated;

-- Display completion message
SELECT 'Activity log table created successfully!' as status; 