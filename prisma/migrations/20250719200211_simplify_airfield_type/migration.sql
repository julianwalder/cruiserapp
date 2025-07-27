/*
  Migration to simplify airfield type by using originalType values and removing the enum constraint
*/

-- First, add a temporary column to store the new type values
ALTER TABLE "airfields" ADD COLUMN "type_new" TEXT;

-- Update the temporary column with originalType values where available
UPDATE "airfields" 
SET "type_new" = "originalType" 
WHERE "originalType" IS NOT NULL;

-- For airfields without originalType, convert the enum values to string equivalents
UPDATE "airfields" 
SET "type_new" = CASE 
  WHEN "type" = 'AIRPORT' THEN 'airport'
  WHEN "type" = 'HELIPORT' THEN 'heliport'
  WHEN "type" = 'SEAPLANE_BASE' THEN 'seaplane_base'
  WHEN "type" = 'BALLOON_PORT' THEN 'balloonport'
  WHEN "type" = 'GLIDER_PORT' THEN 'gliderport'
  WHEN "type" = 'ULTRALIGHT_FIELD' THEN 'ultralight_field'
  ELSE 'airport'
END
WHERE "originalType" IS NULL;

-- Drop the old columns and rename the new one
ALTER TABLE "airfields" DROP COLUMN "type";
ALTER TABLE "airfields" DROP COLUMN "originalType";
ALTER TABLE "airfields" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "airfields" ALTER COLUMN "type" SET NOT NULL;
