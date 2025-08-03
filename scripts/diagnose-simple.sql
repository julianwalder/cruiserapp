-- Simple diagnostic script for current database state

-- Check current state of user_company_relationships
SELECT 'Current user_company_relationships columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_company_relationships'
ORDER BY ordinal_position;

-- Check current state of user_company_relationships data
SELECT 'Current user_company_relationships data:' as info;
SELECT 
    user_id,
    company_id,
    role,
    created_at
FROM user_company_relationships 
LIMIT 10;

-- Check for orphaned records (user_id values that don't exist in users table)
SELECT 'Orphaned user_company_relationships records:' as info;
SELECT 
    ucr.user_id,
    ucr.company_id,
    ucr.role,
    ucr.created_at
FROM user_company_relationships ucr
LEFT JOIN users u ON ucr.user_id::text = u.id::text
WHERE u.id IS NULL;

-- Check what user_id values exist in user_company_relationships
SELECT 'Unique user_id values in user_company_relationships:' as info;
SELECT DISTINCT user_id 
FROM user_company_relationships 
ORDER BY user_id
LIMIT 20;

-- Check what id values exist in users table
SELECT 'Sample user IDs from users table:' as info;
SELECT id 
FROM users 
LIMIT 10;

-- Check if there are any user_id values that are already UUIDs
SELECT 'user_id values that look like UUIDs:' as info;
SELECT DISTINCT user_id 
FROM user_company_relationships 
WHERE user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Check if there are any user_id values that are not UUIDs
SELECT 'user_id values that are NOT UUIDs:' as info;
SELECT DISTINCT user_id 
FROM user_company_relationships 
WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Count total records
SELECT 'Record counts:' as info;
SELECT 'user_company_relationships' as table_name, COUNT(*) as count FROM user_company_relationships
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Check if users table has UUID or text id
SELECT 'Users table id column type:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id'; 