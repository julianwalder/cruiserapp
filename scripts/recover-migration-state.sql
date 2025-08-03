-- Recovery Migration Script
-- This script handles the current state after partial migration failure

-- Step 1: Check if we need to restore from backups
-- If the main tables are empty or corrupted, restore from backups

-- Check if users table has data
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'Users table is empty, restoring from backup...';
        -- Restore from backup
        DROP TABLE IF EXISTS users;
        CREATE TABLE users AS SELECT * FROM users_backup;
        ALTER TABLE users ADD PRIMARY KEY (id);
    ELSE
        RAISE NOTICE 'Users table has % records, continuing with migration...', user_count;
    END IF;
END $$;

-- Step 2: Add UUID columns if they don't exist
-- Check and add UUID columns to all tables

-- Users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id_uuid') THEN
        ALTER TABLE users ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to users table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in users table';
    END IF;
END $$;

-- Roles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'id_uuid') THEN
        ALTER TABLE roles ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to roles table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in roles table';
    END IF;
END $$;

-- User_roles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'id_uuid') THEN
        ALTER TABLE user_roles ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to user_roles table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in user_roles table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_id_uuid') THEN
        ALTER TABLE user_roles ADD COLUMN user_id_uuid UUID;
        RAISE NOTICE 'Added user_id_uuid column to user_roles table';
    ELSE
        RAISE NOTICE 'user_id_uuid column already exists in user_roles table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'role_id_uuid') THEN
        ALTER TABLE user_roles ADD COLUMN role_id_uuid UUID;
        RAISE NOTICE 'Added role_id_uuid column to user_roles table';
    ELSE
        RAISE NOTICE 'role_id_uuid column already exists in user_roles table';
    END IF;
END $$;

-- Aircraft table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aircraft' AND column_name = 'id_uuid') THEN
        ALTER TABLE aircraft ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to aircraft table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in aircraft table';
    END IF;
END $$;

-- Flight_logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'aircraft_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN aircraft_id_uuid UUID;
        RAISE NOTICE 'Added aircraft_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'aircraft_id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'pilot_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN pilot_id_uuid UUID;
        RAISE NOTICE 'Added pilot_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'pilot_id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'instructor_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN instructor_id_uuid UUID;
        RAISE NOTICE 'Added instructor_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'instructor_id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'departure_airfield_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN departure_airfield_id_uuid UUID;
        RAISE NOTICE 'Added departure_airfield_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'departure_airfield_id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'arrival_airfield_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN arrival_airfield_id_uuid UUID;
        RAISE NOTICE 'Added arrival_airfield_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'arrival_airfield_id_uuid column already exists in flight_logs table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flight_logs' AND column_name = 'created_by_id_uuid') THEN
        ALTER TABLE flight_logs ADD COLUMN created_by_id_uuid UUID;
        RAISE NOTICE 'Added created_by_id_uuid column to flight_logs table';
    ELSE
        RAISE NOTICE 'created_by_id_uuid column already exists in flight_logs table';
    END IF;
END $$;

-- Airfields table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airfields' AND column_name = 'id_uuid') THEN
        ALTER TABLE airfields ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to airfields table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in airfields table';
    END IF;
END $$;

-- Base_management table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'base_management' AND column_name = 'id_uuid') THEN
        ALTER TABLE base_management ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added id_uuid column to base_management table';
    ELSE
        RAISE NOTICE 'id_uuid column already exists in base_management table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'base_management' AND column_name = 'airfield_id_uuid') THEN
        ALTER TABLE base_management ADD COLUMN airfield_id_uuid UUID;
        RAISE NOTICE 'Added airfield_id_uuid column to base_management table';
    ELSE
        RAISE NOTICE 'airfield_id_uuid column already exists in base_management table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'base_management' AND column_name = 'base_manager_id_uuid') THEN
        ALTER TABLE base_management ADD COLUMN base_manager_id_uuid UUID;
        RAISE NOTICE 'Added base_manager_id_uuid column to base_management table';
    ELSE
        RAISE NOTICE 'base_manager_id_uuid column already exists in base_management table';
    END IF;
END $$;

-- Step 3: Update foreign key relationships (only if UUID columns exist)
-- Update user_roles to link to users and roles UUIDs
UPDATE user_roles 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE user_roles."userId"::text = users.id::text
AND user_roles.user_id_uuid IS NULL;

UPDATE user_roles 
SET role_id_uuid = roles.id_uuid 
FROM roles 
WHERE user_roles."roleId"::text = roles.id::text
AND user_roles.role_id_uuid IS NULL;

-- Update flight_logs relationships
UPDATE flight_logs 
SET aircraft_id_uuid = aircraft.id_uuid 
FROM aircraft 
WHERE flight_logs."aircraftId"::text = aircraft.id::text
AND flight_logs.aircraft_id_uuid IS NULL;

UPDATE flight_logs 
SET pilot_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."pilotId"::text = users.id::text
AND flight_logs.pilot_id_uuid IS NULL;

UPDATE flight_logs 
SET instructor_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."instructorId"::text = users.id::text
AND flight_logs.instructor_id_uuid IS NULL;

UPDATE flight_logs 
SET departure_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."departureAirfieldId"::text = airfields.id::text
AND flight_logs.departure_airfield_id_uuid IS NULL;

UPDATE flight_logs 
SET arrival_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."arrivalAirfieldId"::text = airfields.id::text
AND flight_logs.arrival_airfield_id_uuid IS NULL;

UPDATE flight_logs 
SET created_by_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."createdById"::text = users.id::text
AND flight_logs.created_by_id_uuid IS NULL;

-- Update base_management relationships
UPDATE base_management 
SET airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE base_management."airfieldId"::text = airfields.id::text
AND base_management.airfield_id_uuid IS NULL;

UPDATE base_management 
SET base_manager_id_uuid = users.id_uuid 
FROM users 
WHERE base_management."baseManagerId"::text = users.id::text
AND base_management.base_manager_id_uuid IS NULL;

-- Step 4: Verify current state
SELECT 'Recovery completed. Current state:' as status;

-- Check which columns exist
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('users', 'roles', 'user_roles', 'aircraft', 'flight_logs', 'airfields', 'base_management')
AND column_name LIKE '%_uuid'
ORDER BY table_name, column_name; 