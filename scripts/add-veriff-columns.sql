-- Add Veriff integration columns to users table
-- Run this script in your Supabase SQL editor

-- Add Veriff session and status columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffSessionId" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffStatus" VARCHAR(50);

-- Add Veriff data column (JSONB for storing verification details)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffData" JSONB;

-- Add identity verification columns (if not already present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN users."veriffSessionId" IS 'Veriff session ID for identity verification';
COMMENT ON COLUMN users."veriffStatus" IS 'Current Veriff verification status';
COMMENT ON COLUMN users."veriffData" IS 'Veriff verification data and details';
COMMENT ON COLUMN users."identityVerified" IS 'Whether user identity has been verified';
COMMENT ON COLUMN users."identityVerifiedAt" IS 'Timestamp when identity was verified';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_veriff_session_id ON users("veriffSessionId");
CREATE INDEX IF NOT EXISTS idx_users_identity_verified ON users("identityVerified"); 