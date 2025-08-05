-- Add veriffSessionUrl column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "veriffSessionUrl" TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'veriffSessionUrl'; 