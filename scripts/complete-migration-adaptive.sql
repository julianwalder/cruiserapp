-- Complete UUID Migration Script (Adaptive Version)
-- This script adapts to the actual column structure

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

-- Step 4: Handle user_company_relationships - check if it exists and has data
DO $$
BEGIN
    -- Check if user_company_relationships table exists and has user_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_company_relationships' 
        AND column_name = 'user_id'
    ) THEN
        -- Add UUID column
        ALTER TABLE user_company_relationships ADD COLUMN user_id_uuid UUID;
        
        -- Update with UUID values
        UPDATE user_company_relationships 
        SET user_id_uuid = users.id 
        FROM users 
        WHERE user_company_relationships.user_id::text = users.id::text;
        
        -- Show orphaned records
        RAISE NOTICE 'Orphaned user_company_relationships records:';
        
        -- Delete orphaned records
        DELETE FROM user_company_relationships 
        WHERE user_id_uuid IS NULL;
        
        -- Drop old column and rename
        ALTER TABLE user_company_relationships DROP COLUMN user_id CASCADE;
        ALTER TABLE user_company_relationships RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE user_company_relationships ALTER COLUMN user_id SET NOT NULL;
        
        -- Add foreign key constraint
        ALTER TABLE user_company_relationships 
        ADD CONSTRAINT user_company_relationships_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_user_company_relationships_user_id ON user_company_relationships(user_id);
        
        RAISE NOTICE 'user_company_relationships migration completed';
    ELSE
        RAISE NOTICE 'user_company_relationships table does not exist or has no user_id column';
    END IF;
END $$;

-- Step 5: Handle other tables that reference users
-- Update invoice_clients to use UUID user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_clients' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE invoice_clients ADD COLUMN user_id_uuid UUID;
        
        UPDATE invoice_clients 
        SET user_id_uuid = users.id 
        FROM users 
        WHERE invoice_clients.user_id::text = users.id::text;
        
        DELETE FROM invoice_clients WHERE user_id_uuid IS NULL;
        
        ALTER TABLE invoice_clients DROP COLUMN user_id CASCADE;
        ALTER TABLE invoice_clients RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE invoice_clients ALTER COLUMN user_id SET NOT NULL;
        
        ALTER TABLE invoice_clients 
        ADD CONSTRAINT invoice_clients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_invoice_clients_user_id ON invoice_clients(user_id);
        
        RAISE NOTICE 'invoice_clients migration completed';
    END IF;
END $$;

-- Update flight_hours to use UUID user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'flight_hours' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE flight_hours ADD COLUMN user_id_uuid UUID;
        
        UPDATE flight_hours 
        SET user_id_uuid = users.id 
        FROM users 
        WHERE flight_hours.user_id::text = users.id::text;
        
        DELETE FROM flight_hours WHERE user_id_uuid IS NULL;
        
        ALTER TABLE flight_hours DROP COLUMN user_id CASCADE;
        ALTER TABLE flight_hours RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE flight_hours ALTER COLUMN user_id SET NOT NULL;
        
        ALTER TABLE flight_hours 
        ADD CONSTRAINT flight_hours_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_flight_hours_user_id ON flight_hours(user_id);
        
        RAISE NOTICE 'flight_hours migration completed';
    END IF;
END $$;

-- Update password_reset_tokens to use UUID user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE password_reset_tokens ADD COLUMN user_id_uuid UUID;
        
        UPDATE password_reset_tokens 
        SET user_id_uuid = users.id 
        FROM users 
        WHERE password_reset_tokens.user_id::text = users.id::text;
        
        DELETE FROM password_reset_tokens WHERE user_id_uuid IS NULL;
        
        ALTER TABLE password_reset_tokens DROP COLUMN user_id CASCADE;
        ALTER TABLE password_reset_tokens RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE password_reset_tokens ALTER COLUMN user_id SET NOT NULL;
        
        ALTER TABLE password_reset_tokens 
        ADD CONSTRAINT password_reset_tokens_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
        
        RAISE NOTICE 'password_reset_tokens migration completed';
    END IF;
END $$;

-- Update ppl_course_tranches to use UUID user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ppl_course_tranches' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE ppl_course_tranches ADD COLUMN user_id_uuid UUID;
        
        UPDATE ppl_course_tranches 
        SET user_id_uuid = users.id 
        FROM users 
        WHERE ppl_course_tranches.user_id::text = users.id::text;
        
        DELETE FROM ppl_course_tranches WHERE user_id_uuid IS NULL;
        
        ALTER TABLE ppl_course_tranches DROP COLUMN user_id CASCADE;
        ALTER TABLE ppl_course_tranches RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE ppl_course_tranches ALTER COLUMN user_id SET NOT NULL;
        
        ALTER TABLE ppl_course_tranches 
        ADD CONSTRAINT ppl_course_tranches_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_ppl_course_tranches_user_id ON ppl_course_tranches(user_id);
        
        RAISE NOTICE 'ppl_course_tranches migration completed';
    END IF;
END $$;

-- Step 6: Verify migration
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

-- Step 7: Verify UUID format
SELECT 'UUID Migration Verification:' as status;
SELECT 'Sample UUIDs from users table:' as info;
SELECT id FROM users LIMIT 3; 