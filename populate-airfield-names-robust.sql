-- Robust script to populate airfield table with full country and province names
-- This script safely updates the airfield table by joining with reference tables

-- =============================================================================
-- STEP 1: Analysis and Validation
-- =============================================================================

-- Check current airfield data structure
SELECT 
    'Current airfield data analysis' as step,
    COUNT(*) as total_airfields,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' THEN 1 END) as with_country,
    COUNT(CASE WHEN state IS NOT NULL AND state != '' THEN 1 END) as with_state,
    COUNT(CASE WHEN country ~ '^[A-Z]{2}$' THEN 1 END) as country_codes,
    COUNT(CASE WHEN state ~ '^[A-Z]{2}-[A-Z]{2}$' THEN 1 END) as state_codes_with_prefix,
    COUNT(CASE WHEN state ~ '^[A-Z]{2}$' THEN 1 END) as state_codes_simple
FROM airfields;

-- Sample current data
SELECT 
    'Sample current airfield data' as step,
    id,
    name,
    code,
    city,
    state,
    country
FROM airfields 
ORDER BY created_at DESC 
LIMIT 5;

-- Check reference data availability
SELECT 
    'Reference countries count' as step,
    COUNT(*) as total_countries
FROM reference_countries;

SELECT 
    'Reference regions count' as step,
    COUNT(*) as total_regions
FROM reference_regions;

-- =============================================================================
-- STEP 2: Backup current data (optional - for safety)
-- =============================================================================

-- Create a backup table with current airfield data
-- Uncomment the following lines if you want to create a backup
-- CREATE TABLE IF NOT EXISTS airfields_backup AS 
-- SELECT * FROM airfields;

-- =============================================================================
-- STEP 3: Update country names
-- =============================================================================

-- Update countries that are simple 2-letter codes
UPDATE airfields 
SET country = rc.name
FROM reference_countries rc
WHERE airfields.country = rc.code
  AND airfields.country IS NOT NULL
  AND airfields.country != ''
  AND LENGTH(airfields.country) = 2
  AND airfields.country ~ '^[A-Z]{2}$';

-- Show progress for country updates
SELECT 
    'Country updates completed' as step,
    COUNT(*) as airfields_with_full_country_names
FROM airfields 
WHERE country IS NOT NULL 
  AND country != '' 
  AND LENGTH(country) > 2;

-- =============================================================================
-- STEP 4: Update state/province names
-- =============================================================================

-- Update states that are simple region codes (e.g., "CT" -> "Constanța")
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != ''
  AND LENGTH(airfields.state) = 2
  AND airfields.state ~ '^[A-Z]{2}$';

-- Update states that have country prefix (e.g., "RO-CT" -> "Constanța")
UPDATE airfields 
SET state = rr.name
FROM reference_regions rr
WHERE airfields.state LIKE '%-%'
  AND SPLIT_PART(airfields.state, '-', 2) = rr.code
  AND airfields.state IS NOT NULL
  AND airfields.state != ''
  AND LENGTH(SPLIT_PART(airfields.state, '-', 2)) = 2;

-- Show progress for state updates
SELECT 
    'State updates completed' as step,
    COUNT(*) as airfields_with_full_state_names
FROM airfields 
WHERE state IS NOT NULL 
  AND state != '' 
  AND LENGTH(state) > 2;

-- =============================================================================
-- STEP 5: Results and Validation
-- =============================================================================

-- Show final results
SELECT 
    'Final airfield data sample' as step,
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

-- Show summary statistics
SELECT 
    'Final summary' as step,
    COUNT(*) as total_airfields,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' AND LENGTH(country) > 2 THEN 1 END) as airfields_with_full_country,
    COUNT(CASE WHEN state IS NOT NULL AND state != '' AND LENGTH(state) > 2 THEN 1 END) as airfields_with_full_state,
    COUNT(CASE WHEN country IS NOT NULL AND country != '' AND LENGTH(country) = 2 THEN 1 END) as airfields_with_country_codes,
    COUNT(CASE WHEN state IS NOT NULL AND state != '' AND (LENGTH(state) = 2 OR state LIKE '%-%') THEN 1 END) as airfields_with_state_codes
FROM airfields;

-- Show any remaining issues
SELECT 
    'Remaining codes to review' as step,
    id,
    name,
    code,
    city,
    state,
    country,
    CASE 
        WHEN country ~ '^[A-Z]{2}$' THEN 'Country code not found in reference'
        WHEN state ~ '^[A-Z]{2}-[A-Z]{2}$' THEN 'State code with prefix not found'
        WHEN state ~ '^[A-Z]{2}$' THEN 'State code not found in reference'
        ELSE 'OK'
    END as issue
FROM airfields 
WHERE country ~ '^[A-Z]{2}$' 
   OR state ~ '^[A-Z]{2}-[A-Z]{2}$' 
   OR state ~ '^[A-Z]{2}$'
ORDER BY created_at DESC;

-- =============================================================================
-- STEP 6: Verification queries
-- =============================================================================

-- Verify country mappings
SELECT 
    'Country mapping verification' as step,
    a.country as airfield_country,
    rc.name as reference_name,
    rc.code as reference_code,
    COUNT(*) as count
FROM airfields a
LEFT JOIN reference_countries rc ON a.country = rc.name
WHERE a.country IS NOT NULL AND a.country != ''
GROUP BY a.country, rc.name, rc.code
ORDER BY count DESC
LIMIT 10;

-- Verify state mappings
SELECT 
    'State mapping verification' as step,
    a.state as airfield_state,
    rr.name as reference_name,
    rr.code as reference_code,
    COUNT(*) as count
FROM airfields a
LEFT JOIN reference_regions rr ON a.state = rr.name
WHERE a.state IS NOT NULL AND a.state != ''
GROUP BY a.state, rr.name, rr.code
ORDER BY count DESC
LIMIT 10;
