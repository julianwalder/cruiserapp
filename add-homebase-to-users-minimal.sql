-- Minimal SQL to add homebase functionality to users table
-- This only adds the column and index, skipping RLS policies that already exist

-- Add homebase_id column to users table (if it doesn't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS homebase_id UUID REFERENCES airfields(id);

-- Create index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_users_homebase_id ON users(homebase_id);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN users.homebase_id IS 'Designates the user''s home base for statistical purposes';
