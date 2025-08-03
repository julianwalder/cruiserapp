-- Add missing PPL columns to invoices table
-- This script adds the is_ppl and ppl_hours_paid columns that are referenced in the code

-- Add is_ppl column (boolean flag to indicate if this is a PPL course invoice)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS is_ppl BOOLEAN DEFAULT FALSE;

-- Add ppl_hours_paid column (number of hours paid for PPL course)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ppl_hours_paid DECIMAL(5,2) DEFAULT 0;

-- Add other missing columns that might be referenced in the code
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS original_xml_content TEXT;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS edited_xml_content TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN invoices.is_ppl IS 'Flag indicating if this invoice is for a PPL course';
COMMENT ON COLUMN invoices.ppl_hours_paid IS 'Number of hours paid for PPL course';
COMMENT ON COLUMN invoices.original_xml_content IS 'Original XML content before any edits';
COMMENT ON COLUMN invoices.edited_xml_content IS 'Edited XML content after modifications';

-- Create index on is_ppl for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_is_ppl ON invoices(is_ppl);

-- Update existing invoices to set is_ppl based on content analysis
-- This is a placeholder - you may want to run a more sophisticated analysis
-- UPDATE invoices SET is_ppl = TRUE WHERE xml_content ILIKE '%ppl%' OR xml_content ILIKE '%pilot%license%';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('is_ppl', 'ppl_hours_paid', 'original_xml_content', 'edited_xml_content')
ORDER BY column_name; 