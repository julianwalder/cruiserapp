-- Add missing columns to normalized_addresses table
-- This script adds the columns that are needed for the address normalization system

-- Add processing_notes column
ALTER TABLE normalized_addresses 
ADD COLUMN IF NOT EXISTS processing_notes TEXT;

-- Add phone column for storing phone numbers from invoice clients
ALTER TABLE normalized_addresses 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add cnp column for storing CNP/VAT codes from invoice clients
ALTER TABLE normalized_addresses 
ADD COLUMN IF NOT EXISTS cnp TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN normalized_addresses.processing_notes IS 'Notes about the address normalization process';
COMMENT ON COLUMN normalized_addresses.phone IS 'Phone number from invoice client data';
COMMENT ON COLUMN normalized_addresses.cnp IS 'CNP/VAT code from invoice client data (used as CNP for individual users)';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'normalized_addresses' 
ORDER BY ordinal_position;
