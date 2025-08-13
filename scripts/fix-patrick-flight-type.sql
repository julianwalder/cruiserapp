-- Fix Patrick-Nicolae Pană's flight log to have the correct flight type
-- This script will update the flight log that was incorrectly set to "SCHOOL"

-- First, let's see the current flight log
SELECT 
  id,
  "pilotId",
  "flightType",
  date,
  "departureTime",
  "arrivalTime",
  "totalHours",
  "createdAt"
FROM flight_logs 
WHERE "pilotId" = 'f5604501-664d-4cba-bf52-b491aee1b7e7'
ORDER BY "createdAt" DESC
LIMIT 1;

-- Update the flight log to have the correct flight type
UPDATE flight_logs
SET 
  "flightType" = 'INVOICED',
  "updatedAt" = NOW(),
  "updatedBy" = '40da1775-2106-4ac9-8f79-facf4566ff5e' -- Super Admin ID
WHERE 
  "pilotId" = 'f5604501-664d-4cba-bf52-b491aee1b7e7'
  AND "flightType" = 'SCHOOL'
  AND date = '2025-08-13';

-- Verify the update
SELECT 
  id,
  "pilotId",
  "flightType",
  date,
  "departureTime",
  "arrivalTime",
  "totalHours",
  "updatedAt",
  "updatedBy"
FROM flight_logs 
WHERE "pilotId" = 'f5604501-664d-4cba-bf52-b491aee1b7e7'
ORDER BY "createdAt" DESC
LIMIT 1;
