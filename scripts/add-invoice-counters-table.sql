-- Create invoice counters table for persistent counter storage
CREATE TABLE IF NOT EXISTS invoice_counters (
  id SERIAL PRIMARY KEY,
  series VARCHAR(10) NOT NULL UNIQUE,
  current_counter INTEGER NOT NULL,
  start_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial counter values
INSERT INTO invoice_counters (series, current_counter, start_number) VALUES
  ('PROF', 1000, 1000),
  ('FISC', 1000, 1000)
ON CONFLICT (series) DO NOTHING;

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_invoice_counters_updated_at 
  BEFORE UPDATE ON invoice_counters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to invoice counters" ON invoice_counters
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow update access to authenticated users (for counter increments)
CREATE POLICY "Allow update access to invoice counters" ON invoice_counters
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT, UPDATE ON invoice_counters TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoice_counters_id_seq TO authenticated;
