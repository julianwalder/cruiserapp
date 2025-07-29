-- Password Reset Service Database Setup
-- This script creates the necessary table, indexes, and RLS policies for password reset functionality

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens(used);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_password_reset_tokens_updated_at ON password_reset_tokens;
CREATE TRIGGER update_password_reset_tokens_updated_at
    BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only see their own reset tokens
DROP POLICY IF EXISTS "Users can view own reset tokens" ON password_reset_tokens;
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own reset tokens
DROP POLICY IF EXISTS "Users can insert own reset tokens" ON password_reset_tokens;
CREATE POLICY "Users can insert own reset tokens" ON password_reset_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reset tokens
DROP POLICY IF EXISTS "Users can update own reset tokens" ON password_reset_tokens;
CREATE POLICY "Users can update own reset tokens" ON password_reset_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own reset tokens
DROP POLICY IF EXISTS "Users can delete own reset tokens" ON password_reset_tokens;
CREATE POLICY "Users can delete own reset tokens" ON password_reset_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Service role can manage all reset tokens (for cleanup operations)
DROP POLICY IF EXISTS "Service role can manage all reset tokens" ON password_reset_tokens;
CREATE POLICY "Service role can manage all reset tokens" ON password_reset_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON password_reset_tokens TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_password_reset_tokens() TO anon, authenticated;

-- Insert some sample data for testing (optional - remove in production)
-- INSERT INTO password_reset_tokens (user_id, token, expires_at) 
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     'test-token-123',
--     NOW() + INTERVAL '1 hour'
-- );

-- Display setup completion message
SELECT 'Password reset service database setup completed successfully!' as status; 