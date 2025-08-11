-- Phase 2 Security Fixes - Refresh Token System
-- WP2.3 — Implement refresh token flow

-- Create refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    "accessTokenId" TEXT NOT NULL, -- JWT ID (jti) of the access token
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ NULL,
    "revokedBy" UUID NULL REFERENCES users(id),
    "revokedReason" TEXT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "userAgent" TEXT NULL,
    "ipAddress" INET NULL,
    "deviceInfo" JSONB NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens("expiresAt");
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at ON refresh_tokens("revokedAt");

-- Enable RLS on refresh_tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for refresh_tokens
CREATE POLICY "Users can view own refresh tokens" ON refresh_tokens
    FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can insert own refresh tokens" ON refresh_tokens
    FOR INSERT WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update own refresh tokens" ON refresh_tokens
    FOR UPDATE USING ("userId" = auth.uid());

CREATE POLICY "Service role can manage all refresh tokens" ON refresh_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens 
    WHERE "expiresAt" < NOW() 
    OR "revokedAt" IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke all tokens for a user
CREATE OR REPLACE FUNCTION revoke_user_refresh_tokens(
    target_user_id UUID,
    revoke_reason TEXT DEFAULT 'User session termination'
)
RETURNS INTEGER AS $$
DECLARE
    revoked_count INTEGER;
BEGIN
    UPDATE refresh_tokens 
    SET 
        "revokedAt" = NOW(),
        "revokedBy" = auth.uid(),
        "revokedReason" = revoke_reason,
        "updatedAt" = NOW()
    WHERE "userId" = target_user_id 
    AND "revokedAt" IS NULL;
    
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke a specific token
CREATE OR REPLACE FUNCTION revoke_refresh_token(
    token_hash_param TEXT,
    revoke_reason TEXT DEFAULT 'Token revocation'
)
RETURNS BOOLEAN AS $$
DECLARE
    token_exists BOOLEAN;
BEGIN
    UPDATE refresh_tokens 
    SET 
        "revokedAt" = NOW(),
        "revokedBy" = auth.uid(),
        "revokedReason" = revoke_reason,
        "updatedAt" = NOW()
    WHERE token_hash = token_hash_param 
    AND "revokedAt" IS NULL;
    
    GET DIAGNOSTICS token_exists = ROW_COUNT;
    RETURN token_exists > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate refresh token
CREATE OR REPLACE FUNCTION validate_refresh_token(
    token_hash_param TEXT,
    user_id_param UUID
)
RETURNS TABLE (
    is_valid BOOLEAN,
    token_id UUID,
    access_token_id TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt."revokedAt" IS NULL AND rt."expiresAt" > NOW() as is_valid,
        rt.id as token_id,
        rt."accessTokenId" as access_token_id,
        rt."expiresAt" as expires_at
    FROM refresh_tokens rt
    WHERE rt.token_hash = token_hash_param 
    AND rt."userId" = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_refresh_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_user_refresh_tokens(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_refresh_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_refresh_token(TEXT, UUID) TO authenticated;

-- Create a cron job function to clean up expired tokens (runs daily)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_refresh_tokens();');

-- Add comments
COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for JWT authentication with rotation and revocation support';
COMMENT ON FUNCTION cleanup_expired_refresh_tokens() IS 'Clean up expired and revoked refresh tokens';
COMMENT ON FUNCTION revoke_user_refresh_tokens(UUID, TEXT) IS 'Revoke all refresh tokens for a specific user';
COMMENT ON FUNCTION revoke_refresh_token(TEXT, TEXT) IS 'Revoke a specific refresh token';
COMMENT ON FUNCTION validate_refresh_token(TEXT, UUID) IS 'Validate a refresh token and return its status';
