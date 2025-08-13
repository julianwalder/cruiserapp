-- Add updatedBy field to flight_logs table
-- This will track who last updated each flight log record

-- Add the updatedBy column
ALTER TABLE flight_logs 
ADD COLUMN "updatedBy" UUID REFERENCES users(id);

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_logs_updatedBy ON flight_logs("updatedBy");

-- Update existing records to set updatedBy to the same as createdBy
-- (since we don't have historical data of who updated them)
UPDATE flight_logs 
SET "updatedBy" = "createdById" 
WHERE "updatedBy" IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE flight_logs 
ALTER COLUMN "updatedBy" SET NOT NULL;

-- Add a comment to document the field
COMMENT ON COLUMN flight_logs."updatedBy" IS 'User ID who last updated this flight log record';
