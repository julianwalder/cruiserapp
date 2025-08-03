-- Check Column State Script
-- This script shows what columns currently exist in each table

-- Check users table columns
SELECT 
    'users' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- Check roles table columns
SELECT 
    'roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'roles' 
ORDER BY column_name;

-- Check user_roles table columns
SELECT 
    'user_roles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY column_name;

-- Check aircraft table columns
SELECT 
    'aircraft' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'aircraft' 
ORDER BY column_name;

-- Check flight_logs table columns
SELECT 
    'flight_logs' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'flight_logs' 
ORDER BY column_name;

-- Check airfields table columns
SELECT 
    'airfields' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'airfields' 
ORDER BY column_name;

-- Check base_management table columns
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