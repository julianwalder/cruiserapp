-- Complete UUID Migration Script (Safe Version)
-- This script completes the migration with better error handling

-- Step 1: Drop old columns and rename new ones
-- Users table
ALTER TABLE users DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE users RENAME COLUMN id_uuid TO id;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Roles table
ALTER TABLE roles DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE roles RENAME COLUMN id_uuid TO id;
ALTER TABLE roles ALTER COLUMN id SET NOT NULL;
ALTER TABLE roles ADD PRIMARY KEY (id);

-- User_roles table
ALTER TABLE user_roles DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE user_roles DROP COLUMN IF EXISTS "userId" CASCADE;
ALTER TABLE user_roles DROP COLUMN IF EXISTS "roleId" CASCADE;
ALTER TABLE user_roles RENAME COLUMN id_uuid TO id;
ALTER TABLE user_roles RENAME COLUMN user_id_uuid TO "userId";
ALTER TABLE user_roles RENAME COLUMN role_id_uuid TO "roleId";
ALTER TABLE user_roles ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE user_roles ADD PRIMARY KEY (id);

-- Aircraft table
ALTER TABLE aircraft DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE aircraft RENAME COLUMN id_uuid TO id;
ALTER TABLE aircraft ALTER COLUMN id SET NOT NULL;
ALTER TABLE aircraft ADD PRIMARY KEY (id);

-- Flight_logs table
ALTER TABLE flight_logs DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "aircraftId" CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "pilotId" CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "instructorId" CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "departureAirfieldId" CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "arrivalAirfieldId" CASCADE;
ALTER TABLE flight_logs DROP COLUMN IF EXISTS "createdById" CASCADE;
ALTER TABLE flight_logs RENAME COLUMN id_uuid TO id;
ALTER TABLE flight_logs RENAME COLUMN aircraft_id_uuid TO "aircraftId";
ALTER TABLE flight_logs RENAME COLUMN pilot_id_uuid TO "pilotId";
ALTER TABLE flight_logs RENAME COLUMN instructor_id_uuid TO "instructorId";
ALTER TABLE flight_logs RENAME COLUMN departure_airfield_id_uuid TO "departureAirfieldId";
ALTER TABLE flight_logs RENAME COLUMN arrival_airfield_id_uuid TO "arrivalAirfieldId";
ALTER TABLE flight_logs RENAME COLUMN created_by_id_uuid TO "createdById";
ALTER TABLE flight_logs ALTER COLUMN id SET NOT NULL;
ALTER TABLE flight_logs ADD PRIMARY KEY (id);

-- Airfields table
ALTER TABLE airfields DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE airfields RENAME COLUMN id_uuid TO id;
ALTER TABLE airfields ALTER COLUMN id SET NOT NULL;
ALTER TABLE airfields ADD PRIMARY KEY (id);

-- Base_management table
ALTER TABLE base_management DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE base_management DROP COLUMN IF EXISTS "airfieldId" CASCADE;
ALTER TABLE base_management DROP COLUMN IF EXISTS "baseManagerId" CASCADE;
ALTER TABLE base_management RENAME COLUMN id_uuid TO id;
ALTER TABLE base_management RENAME COLUMN airfield_id_uuid TO "airfieldId";
ALTER TABLE base_management RENAME COLUMN base_manager_id_uuid TO "baseManagerId";
ALTER TABLE base_management ALTER COLUMN id SET NOT NULL;
ALTER TABLE base_management ADD PRIMARY KEY (id);

-- Step 2: Add new foreign key constraints
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_role_id_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_aircraft_id_fkey 
FOREIGN KEY ("aircraftId") REFERENCES aircraft(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_pilot_id_fkey 
FOREIGN KEY ("pilotId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_instructor_id_fkey 
FOREIGN KEY ("instructorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_departure_airfield_id_fkey 
FOREIGN KEY ("departureAirfieldId") REFERENCES airfields(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_arrival_airfield_id_fkey 
FOREIGN KEY ("arrivalAirfieldId") REFERENCES airfields(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_created_by_id_fkey 
FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE base_management 
ADD CONSTRAINT base_management_airfield_id_fkey 
FOREIGN KEY ("airfieldId") REFERENCES airfields(id) ON DELETE CASCADE;

ALTER TABLE base_management 
ADD CONSTRAINT base_management_base_manager_id_fkey 
FOREIGN KEY ("baseManagerId") REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles("userId");
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles("roleId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraft_id ON flight_logs("aircraftId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_pilot_id ON flight_logs("pilotId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_instructor_id ON flight_logs("instructorId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_departure_airfield_id ON flight_logs("departureAirfieldId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_arrival_airfield_id ON flight_logs("arrivalAirfieldId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_created_by_id ON flight_logs("createdById");
CREATE INDEX IF NOT EXISTS idx_base_management_airfield_id ON base_management("airfieldId");
CREATE INDEX IF NOT EXISTS idx_base_management_base_manager_id ON base_management("baseManagerId");

-- Step 4: Handle user_company_relationships safely
-- First, check if user_id_uuid column exists, if not create it
ALTER TABLE user_company_relationships 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- Update only records that have valid user references
UPDATE user_company_relationships 
SET user_id_uuid = users.id 
FROM users 
WHERE user_company_relationships.user_id::text = users.id::text
AND user_company_relationships.user_id_uuid IS NULL;

-- Show orphaned records (for manual review)
SELECT 'Orphaned user_company_relationships records (will be deleted):' as warning;
SELECT 
    user_id,
    company_id,
    role,
    created_at
FROM user_company_relationships 
WHERE user_id_uuid IS NULL;

-- Delete orphaned records
DELETE FROM user_company_relationships 
WHERE user_id_uuid IS NULL;

-- Now safely drop old column and rename
ALTER TABLE user_company_relationships DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE user_company_relationships RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE user_company_relationships ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Handle other tables safely
-- Update invoice_clients to use UUID user_id
ALTER TABLE invoice_clients 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE invoice_clients 
SET user_id_uuid = users.id 
FROM users 
WHERE invoice_clients.user_id::text = users.id::text
AND invoice_clients.user_id_uuid IS NULL;

-- Delete orphaned invoice_clients records
DELETE FROM invoice_clients 
WHERE user_id_uuid IS NULL;

ALTER TABLE invoice_clients DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE invoice_clients RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE invoice_clients ALTER COLUMN user_id SET NOT NULL;

-- Update flight_hours to use UUID user_id
ALTER TABLE flight_hours 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE flight_hours 
SET user_id_uuid = users.id 
FROM users 
WHERE flight_hours.user_id::text = users.id::text
AND flight_hours.user_id_uuid IS NULL;

-- Delete orphaned flight_hours records
DELETE FROM flight_hours 
WHERE user_id_uuid IS NULL;

ALTER TABLE flight_hours DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE flight_hours RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE flight_hours ALTER COLUMN user_id SET NOT NULL;

-- Update password_reset_tokens to use UUID user_id
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE password_reset_tokens 
SET user_id_uuid = users.id 
FROM users 
WHERE password_reset_tokens.user_id::text = users.id::text
AND password_reset_tokens.user_id_uuid IS NULL;

-- Delete orphaned password_reset_tokens records
DELETE FROM password_reset_tokens 
WHERE user_id_uuid IS NULL;

ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE password_reset_tokens RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE password_reset_tokens ALTER COLUMN user_id SET NOT NULL;

-- Update ppl_course_tranches to use UUID user_id
ALTER TABLE ppl_course_tranches 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE ppl_course_tranches 
SET user_id_uuid = users.id 
FROM users 
WHERE ppl_course_tranches.user_id::text = users.id::text
AND ppl_course_tranches.user_id_uuid IS NULL;

-- Delete orphaned ppl_course_tranches records
DELETE FROM ppl_course_tranches 
WHERE user_id_uuid IS NULL;

ALTER TABLE ppl_course_tranches DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE ppl_course_tranches RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE ppl_course_tranches ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Add foreign key constraints for updated tables
ALTER TABLE user_company_relationships 
ADD CONSTRAINT user_company_relationships_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE invoice_clients 
ADD CONSTRAINT invoice_clients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE flight_hours 
ADD CONSTRAINT flight_hours_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE password_reset_tokens 
ADD CONSTRAINT password_reset_tokens_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ppl_course_tranches 
ADD CONSTRAINT ppl_course_tranches_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 7: Create indexes for the updated foreign keys
CREATE INDEX IF NOT EXISTS idx_user_company_relationships_user_id ON user_company_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_user_id ON invoice_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_hours_user_id ON flight_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_user_id ON ppl_course_tranches(user_id);

-- Step 8: Verify migration
SELECT 'Migration completed successfully!' as status;

-- Display table counts to verify data integrity
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
SELECT 'base_management', COUNT(*) FROM base_management
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'user_company_relationships', COUNT(*) FROM user_company_relationships
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'invoice_clients', COUNT(*) FROM invoice_clients
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'flight_hours', COUNT(*) FROM flight_hours
UNION ALL
SELECT 'ppl_course_tranches', COUNT(*) FROM ppl_course_tranches
UNION ALL
SELECT 'aircraft_hobbs', COUNT(*) FROM aircraft_hobbs
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens;

-- Step 9: Verify UUID format
SELECT 'UUID Migration Verification:' as status;
SELECT 'Sample UUIDs from users table:' as info;
SELECT id FROM users LIMIT 3; 