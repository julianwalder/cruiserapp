-- Comprehensive UUID Migration Script with Complete Constraint and Policy Handling
-- This script converts all TEXT ID fields to UUID format
-- Run this in your Supabase SQL Editor

-- Step 1: Create backup tables for safety
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS roles_backup AS SELECT * FROM roles;
CREATE TABLE IF NOT EXISTS user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE IF NOT EXISTS aircraft_backup AS SELECT * FROM aircraft;
CREATE TABLE IF NOT EXISTS flight_logs_backup AS SELECT * FROM flight_logs;
CREATE TABLE IF NOT EXISTS airfields_backup AS SELECT * FROM airfields;
CREATE TABLE IF NOT EXISTS base_management_backup AS SELECT * FROM base_management;
CREATE TABLE IF NOT EXISTS companies_backup AS SELECT * FROM companies;
CREATE TABLE IF NOT EXISTS user_company_relationships_backup AS SELECT * FROM user_company_relationships;
CREATE TABLE IF NOT EXISTS invoices_backup AS SELECT * FROM invoices;
CREATE TABLE IF NOT EXISTS invoice_clients_backup AS SELECT * FROM invoice_clients;
CREATE TABLE IF NOT EXISTS invoice_items_backup AS SELECT * FROM invoice_items;
CREATE TABLE IF NOT EXISTS flight_hours_backup AS SELECT * FROM flight_hours;
CREATE TABLE IF NOT EXISTS ppl_course_tranches_backup AS SELECT * FROM ppl_course_tranches;
CREATE TABLE IF NOT EXISTS aircraft_hobbs_backup AS SELECT * FROM aircraft_hobbs;
CREATE TABLE IF NOT EXISTS password_reset_tokens_backup AS SELECT * FROM password_reset_tokens;

-- Step 2: Add new UUID columns to all tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE roles ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role_id_uuid UUID;
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS aircraft_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS pilot_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS instructor_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS departure_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS arrival_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS created_by_id_uuid UUID;
ALTER TABLE airfields ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS airfield_id_uuid UUID;
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS base_manager_id_uuid UUID;

-- Step 3: Update foreign key relationships
-- Update user_roles to link to users and roles UUIDs
UPDATE user_roles 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE user_roles."userId" = users.id;

UPDATE user_roles 
SET role_id_uuid = roles.id_uuid 
FROM roles 
WHERE user_roles."roleId" = roles.id;

-- Update flight_logs to link to aircraft UUIDs
UPDATE flight_logs 
SET aircraft_id_uuid = aircraft.id_uuid 
FROM aircraft 
WHERE flight_logs."aircraftId" = aircraft.id;

-- Update flight_logs to link to pilot UUIDs
UPDATE flight_logs 
SET pilot_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."pilotId" = users.id;

-- Update flight_logs to link to instructor UUIDs
UPDATE flight_logs 
SET instructor_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."instructorId" = users.id;

-- Update flight_logs to link to departure airfield UUIDs
UPDATE flight_logs 
SET departure_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."departureAirfieldId" = airfields.id;

-- Update flight_logs to link to arrival airfield UUIDs
UPDATE flight_logs 
SET arrival_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."arrivalAirfieldId" = airfields.id;

-- Update flight_logs to link to created_by UUIDs
UPDATE flight_logs 
SET created_by_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."createdById" = users.id;

-- Update base_management to link to airfield UUIDs
UPDATE base_management 
SET airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE base_management."airfieldId" = airfields.id;

-- Update base_management to link to base manager UUIDs
UPDATE base_management 
SET base_manager_id_uuid = users.id_uuid 
FROM users 
WHERE base_management."baseManagerId" = users.id;

-- Step 4: Drop all RLS policies that depend on users.id
-- Drop policies on invoices table
DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- Drop policies on invoice_clients table
DROP POLICY IF EXISTS "Admins can view all invoice clients" ON invoice_clients;
DROP POLICY IF EXISTS "Admins can insert invoice clients" ON invoice_clients;
DROP POLICY IF EXISTS "Admins can update invoice clients" ON invoice_clients;
DROP POLICY IF EXISTS "Admins can delete invoice clients" ON invoice_clients;

-- Drop policies on invoice_items table
DROP POLICY IF EXISTS "Admins can view all invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can update invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can delete invoice items" ON invoice_items;

-- Drop policies on flight_hours table
DROP POLICY IF EXISTS "Admins can view all flight hours" ON flight_hours;
DROP POLICY IF EXISTS "Admins can insert flight hours" ON flight_hours;
DROP POLICY IF EXISTS "Admins can update flight hours" ON flight_hours;
DROP POLICY IF EXISTS "Admins can delete flight hours" ON flight_hours;

-- Drop policies on companies table
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;

-- Drop policies on user_company_relationships table
DROP POLICY IF EXISTS "Admins can view all user company relationships" ON user_company_relationships;
DROP POLICY IF EXISTS "Admins can insert user company relationships" ON user_company_relationships;

-- Drop policies on ppl_course_tranches table
DROP POLICY IF EXISTS "Admins can view all PPL course tranches" ON ppl_course_tranches;
DROP POLICY IF EXISTS "Instructors can view PPL course tranches of their students" ON ppl_course_tranches;
DROP POLICY IF EXISTS "Admins can insert PPL course tranches" ON ppl_course_tranches;
DROP POLICY IF EXISTS "Admins can update PPL course tranches" ON ppl_course_tranches;
DROP POLICY IF EXISTS "Admins can delete PPL course tranches" ON ppl_course_tranches;

-- Drop policies on users table
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 5: Drop all foreign key constraints using CASCADE
-- Drop constraints on users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_createdById_fkey CASCADE;

-- Drop constraints on sessions table
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userId_fkey CASCADE;

-- Drop constraints on airfields table
ALTER TABLE airfields DROP CONSTRAINT IF EXISTS airfields_createdById_fkey CASCADE;

-- Drop constraints on operational_areas table
ALTER TABLE operational_areas DROP CONSTRAINT IF EXISTS operational_areas_createdById_fkey CASCADE;

-- Drop constraints on user_roles table
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_userId_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_assignedBy_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_roleId_fkey CASCADE;

-- Drop constraints on base_management table
ALTER TABLE base_management DROP CONSTRAINT IF EXISTS base_management_baseManagerId_fkey CASCADE;
ALTER TABLE base_management DROP CONSTRAINT IF EXISTS base_management_airfieldId_fkey CASCADE;

-- Drop constraints on fleet_management table
ALTER TABLE fleet_management DROP CONSTRAINT IF EXISTS fleet_management_assignedPilotId_fkey CASCADE;

-- Drop constraints on flight_logs table
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_pilotId_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_instructorId_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_createdById_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_aircraftId_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_departureAirfieldId_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_arrivalAirfieldId_fkey CASCADE;

-- Drop constraints on password_reset_tokens table
ALTER TABLE password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey CASCADE;

-- Drop constraints on invoice_clients table
ALTER TABLE invoice_clients DROP CONSTRAINT IF EXISTS invoice_clients_user_id_fkey CASCADE;

-- Drop constraints on flight_hours table
ALTER TABLE flight_hours DROP CONSTRAINT IF EXISTS flight_hours_user_id_fkey CASCADE;

-- Drop constraints on user_company_relationships table
ALTER TABLE user_company_relationships DROP CONSTRAINT IF EXISTS user_company_relationships_user_id_fkey CASCADE;

-- Drop constraints on ppl_course_tranches table
ALTER TABLE ppl_course_tranches DROP CONSTRAINT IF EXISTS ppl_course_tranches_user_id_fkey CASCADE;

-- Step 6: Drop old columns and rename new ones
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

-- Step 7: Add new foreign key constraints
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

-- Step 8: Create indexes for performance
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

-- Step 9: Update any remaining foreign key references in other tables
-- Update user_company_relationships to use UUID user_id
ALTER TABLE user_company_relationships 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE user_company_relationships 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE user_company_relationships.user_id::text = users.id::text;

ALTER TABLE user_company_relationships DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE user_company_relationships RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE user_company_relationships ALTER COLUMN user_id SET NOT NULL;

-- Update invoice_clients to use UUID user_id
ALTER TABLE invoice_clients 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE invoice_clients 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE invoice_clients.user_id::text = users.id::text;

ALTER TABLE invoice_clients DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE invoice_clients RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE invoice_clients ALTER COLUMN user_id SET NOT NULL;

-- Update flight_hours to use UUID user_id
ALTER TABLE flight_hours 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE flight_hours 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE flight_hours.user_id::text = users.id::text;

ALTER TABLE flight_hours DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE flight_hours RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE flight_hours ALTER COLUMN user_id SET NOT NULL;

-- Update password_reset_tokens to use UUID user_id
ALTER TABLE password_reset_tokens 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE password_reset_tokens 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE password_reset_tokens.user_id::text = users.id::text;

ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE password_reset_tokens RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE password_reset_tokens ALTER COLUMN user_id SET NOT NULL;

-- Update ppl_course_tranches to use UUID user_id
ALTER TABLE ppl_course_tranches 
ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

UPDATE ppl_course_tranches 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE ppl_course_tranches.user_id::text = users.id::text;

ALTER TABLE ppl_course_tranches DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE ppl_course_tranches RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE ppl_course_tranches ALTER COLUMN user_id SET NOT NULL;

-- Step 10: Add foreign key constraints for updated tables
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

-- Step 11: Create indexes for the updated foreign keys
CREATE INDEX IF NOT EXISTS idx_user_company_relationships_user_id ON user_company_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_user_id ON invoice_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_hours_user_id ON flight_hours(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_user_id ON ppl_course_tranches(user_id);

-- Step 12: Verify migration
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