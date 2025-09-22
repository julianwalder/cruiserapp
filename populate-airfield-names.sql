-- Script to populate airfield table with full country and province names
-- This script updates the airfield table by joining with reference_countries and reference_regions tables

-- First, let's see what we're working with
SELECT 
    'Current airfield data sample' as info,
    id,
    name,
    code,
    city,
    state,
    country,
    created_at
FROM airfields 
ORDER BY created_at DESC 
LIMIT 10;

-- Check reference countries data
SELECT 
    'Reference countries sample' as info,
    code,
    name
FROM reference_countries 
ORDER BY name 
LIMIT 10;

-- Check reference regions data  
SELECT 
    'Reference regions sample' as info,
    code,
    name
FROM reference_regions 
ORDER BY name 
LIMIT 10;

-- Update airfields with full country names
-- This updates the country field to use the full name from reference_countries
UPDATE airfields 
SET country = rc.name
FROM reference_countries rc
WHERE airfields.country = rc.code
  AND airfields.country IS NOT NULL
  AND airfields.country != '';

-- Update airfields with full province/region names
-- This updates the state field to use the full name from reference_regions
-- Note: The state field might contain codes like "RO-CT", so we need to extract the region part
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != '';

-- Handle cases where state contains country prefix (e.g., "RO-CT" -> "CT")
-- Extract the region code after the dash and update with full region name
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state LIKE '%-%'
  AND SPLIT_PART(airfields.state, '-', 2) = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != '';

-- Show the results after updates
SELECT 
    'Updated airfield data sample' as info,
    id,
    name,
    code,
    city,
    state,
    country,
    created_at
FROM airfields 
ORDER BY created_at DESC 
LIMIT 10;

-- Show summary of updates
SELECT 
    'Update summary' as info,
    COUNT(*) as total_airfields,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as airfields_with_country,
    COUNT(CASE WHEN state IS NOT NULL AND state != '' THEN 1 END) as airfields_with_state
FROM airfields;

-- Show any airfields that still have codes instead of names
SELECT 
    'Airfields with remaining codes' as info,
    id,
    name,
    code,
    city,
    state,
    country
FROM airfields 
WHERE (country ~ '^[A-Z]{2}$' OR state ~ '^[A-Z]{2}-[A-Z]{2}$')
ORDER BY created_at DESC;
