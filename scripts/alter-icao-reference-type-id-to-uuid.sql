-- Alter icaoReferenceTypeId column from text to UUID type
-- This will ensure the column is properly typed as UUID in the database

-- First, let's check the current column type
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'aircraft' 
AND column_name = 'icaoReferenceTypeId';

-- Alter the column to UUID type
-- This will validate that all existing values are valid UUIDs
ALTER TABLE aircraft 
ALTER COLUMN "icaoReferenceTypeId" TYPE uuid USING "icaoReferenceTypeId"::uuid;

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'aircraft' 
AND column_name = 'icaoReferenceTypeId';

-- Test that the foreign key relationship still works
SELECT 
    a.id,
    a."callSign",
    a."icaoReferenceTypeId",
    icao.manufacturer,
    icao.model,
    icao."typeDesignator"
FROM aircraft a
LEFT JOIN icao_reference_type icao ON a."icaoReferenceTypeId" = icao.id
LIMIT 5; 