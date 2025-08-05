-- Add avatarUrl column to users table
-- This column will store the URL of the user's avatar image from Vercel Blob

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Add comment to document the column
COMMENT ON COLUMN users."avatarUrl" IS 'URL of the user''s avatar image stored in Vercel Blob';

-- Create index for faster queries (optional)
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users("avatarUrl") WHERE "avatarUrl" IS NOT NULL; 