-- Add CRUZ type designator to ICAO reference types
-- This will add the Cessna 152 information to the icao_reference_type table

-- First, check if CRUZ already exists
SELECT * FROM icao_reference_type WHERE "typeDesignator" = 'CRUZ';

-- Add CRUZ if it doesn't exist
INSERT INTO icao_reference_type ("typeDesignator", model, manufacturer)
VALUES ('CRUZ', 'Cessna 152', 'Cessna')
ON CONFLICT ("typeDesignator") DO NOTHING;

-- Verify the insertion
SELECT * FROM icao_reference_type WHERE "typeDesignator" = 'CRUZ';

-- Now update the aircraft to use the CRUZ type designator
UPDATE aircraft 
SET "icaoReferenceType" = jsonb_build_object(
  'model', 'Cessna 152',
  'manufacturer', 'Cessna',
  'typeDesignator', 'CRUZ'
)
WHERE "callSign" = 'YR-CRU';

-- Verify the aircraft update
SELECT id, "callSign", "icaoReferenceType" FROM aircraft WHERE "callSign" = 'YR-CRU';
