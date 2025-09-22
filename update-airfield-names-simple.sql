-- Simple script to populate airfield table with full country and province names
-- Run this in Supabase SQL Editor

-- Step 1: Update country names from reference_countries table
UPDATE airfields 
SET country = rc.name
FROM reference_countries rc
WHERE airfields.country = rc.code
  AND airfields.country IS NOT NULL
  AND airfields.country != ''
  AND LENGTH(airfields.country) = 2
  AND airfields.country ~ '^[A-Z]{2}$';

-- Step 2: Update state names from reference_regions table (simple codes)
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != ''
  AND LENGTH(airfields.state) = 2
  AND airfields.state ~ '^[A-Z]{2}$';

-- Step 3: Update state names with country prefix (e.g., "RO-CT" -> "Constanța")
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state LIKE '%-%'
  AND SPLIT_PART(airfields.state, '-', 2) = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != ''
  AND LENGTH(SPLIT_PART(airfields.state, '-', 2)) = 2;

-- Step 4: Show results
SELECT 
    'Updated airfield data' as info,
    id,
    name,
    code,
    city,
    state,
    country
FROM airfields 
ORDER BY created_at DESC 
LIMIT 10;

-- Step 5: Show summary
SELECT 
    'Summary' as info,
    COUNT(*) as total_airfields,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' AND LENGTH(country) > 2 THEN 1 END) as with_full_country,
    COUNT(CASE WHEN state IS NOT NULL AND state != '' AND LENGTH(state) > 2 THEN 1 END) as with_full_state,
    COUNT(CASE WHEN country ~ '^[A-Z]{2}$' THEN 1 END) as remaining_country_codes,
    COUNT(CASE WHEN state ~ '^[A-Z]{2}$' OR state LIKE '%-%' THEN 1 END) as remaining_state_codes
FROM airfields;
