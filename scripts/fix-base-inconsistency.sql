-- Fix base inconsistency: Reset airfields that are marked as bases but have no base_management record
-- This script will set isBase = false for airfields that don't have corresponding base_management records

-- First, let's see what the inconsistency looks like
SELECT 
    a.id,
    a.name,
    a.code,
    a."isBase",
    CASE WHEN bm.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as base_management_status
FROM airfields a
LEFT JOIN base_management bm ON a.id = bm."airfieldId"
WHERE a."isBase" = true;

-- Now fix the inconsistency by setting isBase = false for airfields without base_management records
UPDATE airfields 
SET "isBase" = false 
WHERE id IN (
    SELECT a.id
    FROM airfields a
    LEFT JOIN base_management bm ON a.id = bm."airfieldId"
    WHERE a."isBase" = true AND bm.id IS NULL
);

-- Verify the fix
SELECT 
    a.id,
    a.name,
    a.code,
    a."isBase",
    CASE WHEN bm.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as base_management_status
FROM airfields a
LEFT JOIN base_management bm ON a.id = bm."airfieldId"
WHERE a."isBase" = true;
