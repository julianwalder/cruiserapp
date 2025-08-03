-- Check Migration State Script
-- This script helps diagnose the current state of the database after partial migration

-- Check if UUID columns exist in core tables
SELECT 
    'users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

SELECT 
    'roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roles' 
ORDER BY column_name;

SELECT 
    'user_roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY column_name;

SELECT 
    'aircraft' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'aircraft' 
ORDER BY column_name;

SELECT 
    'flight_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'flight_logs' 
ORDER BY column_name;

SELECT 
    'airfields' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'airfields' 
ORDER BY column_name;

SELECT 
    'base_management' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'base_management' 
ORDER BY column_name;

-- Check if backup tables exist
SELECT 
    table_name,
    'backup_exists' as status
FROM information_schema.tables 
WHERE table_name LIKE '%_backup' 
ORDER BY table_name;

-- Check record counts
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'aircraft', COUNT(*) FROM aircraft
UNION ALL
SELECT 'flight_logs', COUNT(*) FROM flight_logs
UNION ALL
SELECT 'airfields', COUNT(*) FROM airfields
UNION ALL
SELECT 'base_management', COUNT(*) FROM base_management; 