-- Add company_id columns to existing tables
-- Run this in your Supabase SQL Editor

-- Add company_id column to invoice_clients if it doesn't exist
ALTER TABLE invoice_clients 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id column to flight_hours if it doesn't exist
ALTER TABLE flight_hours 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_invoice_clients_company_id ON invoice_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_flight_hours_company_id ON flight_hours(company_id);

-- Display completion message
SELECT 'Company_id columns added successfully!' as status; 