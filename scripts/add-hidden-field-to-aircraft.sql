-- Add hidden field to aircraft table for superadmin functionality
-- This allows superadmins to hide aircraft from other user roles

-- Add the hidden column with default value false
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Create an index for better performance when filtering hidden aircraft
CREATE INDEX IF NOT EXISTS idx_aircraft_hidden ON aircraft(hidden);

-- Add a comment to document the purpose of this field
COMMENT ON COLUMN aircraft.hidden IS 'When true, aircraft is hidden from non-superadmin users and excluded from statistics';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'aircraft' 
AND column_name = 'hidden';
