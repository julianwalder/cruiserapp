-- Comprehensive fix for all foreign key constraint name mismatches
-- This script fixes the mismatch between code expectations and actual database constraints

-- Fix user_roles table constraints
-- Drop existing constraints with wrong names
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey CASCADE;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey CASCADE;

-- Add constraints with correct names that the code expects
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_roleId_fkey 
FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE;

-- Fix flight_logs table constraints (if they exist with wrong names)
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_aircraft_id_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_pilot_id_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_instructor_id_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_departure_airfield_id_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_arrival_airfield_id_fkey CASCADE;
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_created_by_id_fkey CASCADE;

-- Add flight_logs constraints with correct names
ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_aircraftId_fkey 
FOREIGN KEY ("aircraftId") REFERENCES aircraft(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_pilotId_fkey 
FOREIGN KEY ("pilotId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_instructorId_fkey 
FOREIGN KEY ("instructorId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_departureAirfieldId_fkey 
FOREIGN KEY ("departureAirfieldId") REFERENCES airfields(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_arrivalAirfieldId_fkey 
FOREIGN KEY ("arrivalAirfieldId") REFERENCES airfields(id) ON DELETE SET NULL;

ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_createdById_fkey 
FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL;

-- Fix base_management table constraints
ALTER TABLE base_management DROP CONSTRAINT IF EXISTS base_management_airfield_id_fkey CASCADE;
ALTER TABLE base_management DROP CONSTRAINT IF EXISTS base_management_base_manager_id_fkey CASCADE;

ALTER TABLE base_management 
ADD CONSTRAINT base_management_airfieldId_fkey 
FOREIGN KEY ("airfieldId") REFERENCES airfields(id) ON DELETE CASCADE;

ALTER TABLE base_management 
ADD CONSTRAINT base_management_baseManagerId_fkey 
FOREIGN KEY ("baseManagerId") REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_userId ON user_roles("userId");
CREATE INDEX IF NOT EXISTS idx_user_roles_roleId ON user_roles("roleId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_aircraftId ON flight_logs("aircraftId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_pilotId ON flight_logs("pilotId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_instructorId ON flight_logs("instructorId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_departureAirfieldId ON flight_logs("departureAirfieldId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_arrivalAirfieldId ON flight_logs("arrivalAirfieldId");
CREATE INDEX IF NOT EXISTS idx_flight_logs_createdById ON flight_logs("createdById");
CREATE INDEX IF NOT EXISTS idx_base_management_airfieldId ON base_management("airfieldId");
CREATE INDEX IF NOT EXISTS idx_base_management_baseManagerId ON base_management("baseManagerId");

-- Verify all constraints were created successfully
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('user_roles', 'flight_logs', 'base_management')
ORDER BY tc.table_name, tc.constraint_name; 