-- Create activity_log table for tracking system events (Working version)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
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

-- Create simple RLS policies (no type casting needed since both are TEXT)
CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all activity" ON activity_log
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON activity_log TO anon, authenticated;

-- Display completion message
SELECT 'Activity log table created successfully!' as status; 