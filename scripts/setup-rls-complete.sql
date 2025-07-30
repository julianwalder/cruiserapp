-- Cruiser Aviation Management System - Complete RLS Setup Script
-- This script enables RLS on ALL tables to resolve all Supabase security warnings

-- ============================================================================
-- ENABLE RLS ON ALL TABLES (including the ones we missed)
-- ============================================================================

-- Main tables (already covered in simple setup)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airfields ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_management ENABLE ROW LEVEL SECURITY;

-- Additional tables that need RLS
ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE airfield_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE icao_reference_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_management ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BASIC POLICIES FOR ALL TABLES
-- ============================================================================

-- _prisma_migrations table: Only service role can access
DROP POLICY IF EXISTS "Service role can manage prisma migrations" ON _prisma_migrations;
CREATE POLICY "Service role can manage prisma migrations" ON _prisma_migrations
    FOR ALL USING (auth.role() = 'service_role');

-- sessions table: Only service role can access
DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;
CREATE POLICY "Service role can manage sessions" ON sessions
    FOR ALL USING (auth.role() = 'service_role');

-- operational_areas table: Allow authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view operational areas" ON operational_areas;
CREATE POLICY "Authenticated users can view operational areas" ON operational_areas
    FOR SELECT USING (auth.role() = 'authenticated');

-- airfield_backups table: Allow authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view airfield backups" ON airfield_backups;
CREATE POLICY "Authenticated users can view airfield backups" ON airfield_backups
    FOR SELECT USING (auth.role() = 'authenticated');

-- icao_reference_type table: Allow authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view icao reference types" ON icao_reference_type;
CREATE POLICY "Authenticated users can view icao reference types" ON icao_reference_type
    FOR SELECT USING (auth.role() = 'authenticated');

-- fleet_management table: Allow authenticated users to view
DROP POLICY IF EXISTS "Authenticated users can view fleet management" ON fleet_management;
CREATE POLICY "Authenticated users can view fleet management" ON fleet_management
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- MAIN TABLE POLICIES (from simple setup)
-- ============================================================================

-- Users table: Allow all authenticated users to view all users (temporary)
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON users;
CREATE POLICY "Allow authenticated users to view users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users table: Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::text);

-- Roles table: Allow all authenticated users to view roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
CREATE POLICY "Authenticated users can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- User_roles table: Allow all authenticated users to view role assignments
DROP POLICY IF EXISTS "Authenticated users can view role assignments" ON user_roles;
CREATE POLICY "Authenticated users can view role assignments" ON user_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Aircraft table: Allow all authenticated users to view aircraft
DROP POLICY IF EXISTS "Authenticated users can view aircraft" ON aircraft;
CREATE POLICY "Authenticated users can view aircraft" ON aircraft
    FOR SELECT USING (auth.role() = 'authenticated');

-- Flight_logs table: Allow all authenticated users to view flight logs
DROP POLICY IF EXISTS "Authenticated users can view flight logs" ON flight_logs;
CREATE POLICY "Authenticated users can view flight logs" ON flight_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Airfields table: Allow all authenticated users to view airfields
DROP POLICY IF EXISTS "Authenticated users can view airfields" ON airfields;
CREATE POLICY "Authenticated users can view airfields" ON airfields
    FOR SELECT USING (auth.role() = 'authenticated');

-- Base_management table: Allow all authenticated users to view base assignments
DROP POLICY IF EXISTS "Authenticated users can view base assignments" ON base_management;
CREATE POLICY "Authenticated users can view base assignments" ON base_management
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- SERVICE ROLE POLICIES FOR ALL TABLES
-- ============================================================================

-- Service role can manage all data (for API operations)
DROP POLICY IF EXISTS "Service role can manage all data" ON users;
CREATE POLICY "Service role can manage all data" ON users
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON roles;
CREATE POLICY "Service role can manage all data" ON roles
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON user_roles;
CREATE POLICY "Service role can manage all data" ON user_roles
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON aircraft;
CREATE POLICY "Service role can manage all data" ON aircraft
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON flight_logs;
CREATE POLICY "Service role can manage all data" ON flight_logs
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON airfields;
CREATE POLICY "Service role can manage all data" ON airfields
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON base_management;
CREATE POLICY "Service role can manage all data" ON base_management
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON operational_areas;
CREATE POLICY "Service role can manage all data" ON operational_areas
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON airfield_backups;
CREATE POLICY "Service role can manage all data" ON airfield_backups
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON icao_reference_type;
CREATE POLICY "Service role can manage all data" ON icao_reference_type
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all data" ON fleet_management;
CREATE POLICY "Service role can manage all data" ON fleet_management
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- GRANT PERMISSIONS FOR ALL TABLES
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON roles TO anon, authenticated;
GRANT ALL ON user_roles TO anon, authenticated;
GRANT ALL ON aircraft TO anon, authenticated;
GRANT ALL ON flight_logs TO anon, authenticated;
GRANT ALL ON airfields TO anon, authenticated;
GRANT ALL ON base_management TO anon, authenticated;
GRANT ALL ON operational_areas TO anon, authenticated;
GRANT ALL ON airfield_backups TO anon, authenticated;
GRANT ALL ON icao_reference_type TO anon, authenticated;
GRANT ALL ON fleet_management TO anon, authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check which tables have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'roles', 'user_roles', 'aircraft', 'flight_logs', 'airfields', 'base_management',
    '_prisma_migrations', 'sessions', 'operational_areas', 'airfield_backups', 
    'icao_reference_type', 'fleet_management'
)
ORDER BY tablename;

-- Display setup completion message
SELECT 'Complete RLS setup finished! All tables now have RLS enabled.' as status; 