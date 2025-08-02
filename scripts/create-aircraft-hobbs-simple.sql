-- Simple aircraft_hobbs table creation with TEXT foreign keys
-- This works with the existing database structure

CREATE TABLE IF NOT EXISTS aircraft_hobbs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aircraft_id TEXT NOT NULL,
  last_hobbs_reading DECIMAL(10,2),
  last_hobbs_date DATE,
  last_flight_log_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(aircraft_id)
);

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