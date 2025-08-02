-- Migration script to convert TEXT IDs to UUIDs
-- This script will safely migrate existing data

-- Step 1: Add new UUID columns to aircraft table
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();

-- Step 2: Add new UUID columns to flight_logs table
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS aircraft_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS pilot_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS instructor_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS departure_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS arrival_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS created_by_id_uuid UUID;

-- Step 3: Update flight_logs to link aircraft_id_uuid to aircraft.id_uuid
UPDATE flight_logs 
SET aircraft_id_uuid = aircraft.id_uuid 
FROM aircraft 
WHERE flight_logs."aircraftId" = aircraft.id;

-- Step 4: Create the aircraft_hobbs table with UUID foreign keys
CREATE TABLE IF NOT EXISTS aircraft_hobbs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aircraft_id UUID NOT NULL,
  last_hobbs_reading DECIMAL(10,2),
  last_hobbs_date DATE,
  last_flight_log_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(aircraft_id)
);

-- Step 5: Add foreign key constraints after the UUID migration is complete
-- (We'll add these after confirming the data migration worked)

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aircraft_hobbs_aircraft_id ON aircraft_hobbs(aircraft_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_hobbs_date ON aircraft_hobbs(last_hobbs_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_aircraft_hobbs_updated_at ON aircraft_hobbs;
CREATE TRIGGER update_aircraft_hobbs_updated_at
  BEFORE UPDATE ON aircraft_hobbs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 