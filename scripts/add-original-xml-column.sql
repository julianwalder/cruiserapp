-- Add original_xml_content column to invoices table
-- This will store the original XML content before any edits

ALTER TABLE invoices 
ADD COLUMN original_xml_content TEXT;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN invoices.original_xml_content IS 'Original XML content before any edits were made';

-- Update existing records to set original_xml_content = xml_content
-- (since existing records don't have edits, their xml_content is the original)
UPDATE invoices 
SET original_xml_content = xml_content 
WHERE original_xml_content IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE invoices 
ALTER COLUMN original_xml_content SET NOT NULL; 