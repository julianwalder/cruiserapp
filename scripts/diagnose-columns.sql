-- Diagnostic script to check actual column structure

-- Check column structure of user_company_relationships
SELECT 'user_company_relationships columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_company_relationships'
ORDER BY ordinal_position;

-- Check column structure of users table
SELECT 'users table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check column structure of invoice_clients
SELECT 'invoice_clients columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoice_clients'
ORDER BY ordinal_position;

-- Check column structure of flight_hours
SELECT 'flight_hours columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'flight_hours'
ORDER BY ordinal_position;

-- Check column structure of password_reset_tokens
SELECT 'password_reset_tokens columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'password_reset_tokens'
ORDER BY ordinal_position;

-- Check column structure of ppl_course_tranches
SELECT 'ppl_course_tranches columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ppl_course_tranches'
ORDER BY ordinal_position;

-- Check if user_company_relationships has any data
SELECT 'user_company_relationships data sample:' as info;
SELECT * FROM user_company_relationships LIMIT 5;

-- Check if users table has UUID or text id
SELECT 'Users table id column type:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id';

-- Count records in key tables
SELECT 'Record counts:' as info;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_company_relationships', COUNT(*) FROM user_company_relationships
UNION ALL
SELECT 'invoice_clients', COUNT(*) FROM invoice_clients
UNION ALL
SELECT 'flight_hours', COUNT(*) FROM flight_hours
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens
UNION ALL
SELECT 'ppl_course_tranches', COUNT(*) FROM ppl_course_tranches; 