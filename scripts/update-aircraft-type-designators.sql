-- Update aircraft type designators
-- This script will add the icaoReferenceType information to aircraft records

-- First, let's see what aircraft we have
SELECT id, "callSign", "icaoReferenceType" FROM aircraft;

-- Update aircraft with callSign 'YR-CRU' to have the correct type designator
UPDATE aircraft 
SET "icaoReferenceType" = jsonb_build_object(
  'model', 'Cessna 152',
  'manufacturer', 'Cessna',
  'typeDesignator', 'CRUZ'
)
WHERE "callSign" = 'YR-CRU';

-- If you have other aircraft, you can add them here:
-- UPDATE aircraft 
-- SET "icaoReferenceType" = jsonb_build_object(
--   'model', 'Cessna 172',
--   'manufacturer', 'Cessna', 
--   'typeDesignator', 'C172'
-- )
-- WHERE "callSign" = 'YR-ABC';

-- Verify the update
SELECT id, "callSign", "icaoReferenceType" FROM aircraft WHERE "callSign" = 'YR-CRU';
