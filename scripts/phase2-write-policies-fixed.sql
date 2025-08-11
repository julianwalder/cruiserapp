-- Phase 2 Security Fixes - Write Policies for Operational Tables (FIXED)
-- WP2.2 — Add missing write policies for aircraft, flight_logs, airfields, base_management

-- ============================================================================
-- AIRCRAFT TABLE POLICIES
-- ============================================================================

-- Enable RLS on aircraft table if not already enabled
ALTER TABLE aircraft ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view aircraft" ON aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to insert aircraft" ON aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to update aircraft" ON aircraft;
DROP POLICY IF EXISTS "Allow authenticated users to delete aircraft" ON aircraft;

-- Aircraft SELECT policies
CREATE POLICY "Aircraft view policy" ON aircraft
    FOR SELECT USING (
        -- Service role can see all
        auth.role() = 'service_role'
        OR
        -- Admins can see all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- All authenticated users can view aircraft (public data)
        auth.role() = 'authenticated'
    );

-- Aircraft INSERT policies
CREATE POLICY "Aircraft insert policy" ON aircraft
    FOR INSERT WITH CHECK (
        -- Service role can insert all
        auth.role() = 'service_role'
        OR
        -- Admins can insert all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Aircraft UPDATE policies
CREATE POLICY "Aircraft update policy" ON aircraft
    FOR UPDATE USING (
        -- Service role can update all
        auth.role() = 'service_role'
        OR
        -- Admins can update all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Aircraft DELETE policies
CREATE POLICY "Aircraft delete policy" ON aircraft
    FOR DELETE USING (
        -- Service role can delete all
        auth.role() = 'service_role'
        OR
        -- Only admins can delete aircraft
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- ============================================================================
-- FLIGHT_LOGS TABLE POLICIES
-- ============================================================================

-- Enable RLS on flight_logs table if not already enabled
ALTER TABLE flight_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view flight_logs" ON flight_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert flight_logs" ON flight_logs;
DROP POLICY IF EXISTS "Allow authenticated users to update flight_logs" ON flight_logs;
DROP POLICY IF EXISTS "Allow authenticated users to delete flight_logs" ON flight_logs;

-- Flight logs SELECT policies
CREATE POLICY "Flight logs view policy" ON flight_logs
    FOR SELECT USING (
        -- Service role can see all
        auth.role() = 'service_role'
        OR
        -- Admins can see all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can see their own flight logs
        "pilotId" = auth.uid()
        OR
        -- Users can see flight logs where they are the instructor
        "instructorId" = auth.uid()
        OR
        -- Users can see flight logs they created
        "createdById" = auth.uid()
    );

-- Flight logs INSERT policies
CREATE POLICY "Flight logs insert policy" ON flight_logs
    FOR INSERT WITH CHECK (
        -- Service role can insert all
        auth.role() = 'service_role'
        OR
        -- Admins can insert all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can insert their own flight logs
        "pilotId" = auth.uid()
        OR
        -- Users can insert flight logs where they are the instructor
        "instructorId" = auth.uid()
        OR
        -- Users can insert flight logs they are creating
        "createdById" = auth.uid()
    );

-- Flight logs UPDATE policies
CREATE POLICY "Flight logs update policy" ON flight_logs
    FOR UPDATE USING (
        -- Service role can update all
        auth.role() = 'service_role'
        OR
        -- Admins can update all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can update their own flight logs
        "pilotId" = auth.uid()
        OR
        -- Users can update flight logs where they are the instructor
        "instructorId" = auth.uid()
        OR
        -- Users can update flight logs they created
        "createdById" = auth.uid()
    );

-- Flight logs DELETE policies
CREATE POLICY "Flight logs delete policy" ON flight_logs
    FOR DELETE USING (
        -- Service role can delete all
        auth.role() = 'service_role'
        OR
        -- Only admins can delete flight logs
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- ============================================================================
-- AIRFIELDS TABLE POLICIES
-- ============================================================================

-- Enable RLS on airfields table if not already enabled
ALTER TABLE airfields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view airfields" ON airfields;
DROP POLICY IF EXISTS "Allow authenticated users to insert airfields" ON airfields;
DROP POLICY IF EXISTS "Allow authenticated users to update airfields" ON airfields;
DROP POLICY IF EXISTS "Allow authenticated users to delete airfields" ON airfields;

-- Airfields SELECT policies (read-only for most users)
CREATE POLICY "Airfields view policy" ON airfields
    FOR SELECT USING (
        -- Service role can see all
        auth.role() = 'service_role'
        OR
        -- All authenticated users can view airfields (public data)
        auth.role() = 'authenticated'
    );

-- Airfields INSERT policies (admin only)
CREATE POLICY "Airfields insert policy" ON airfields
    FOR INSERT WITH CHECK (
        -- Service role can insert all
        auth.role() = 'service_role'
        OR
        -- Only admins can insert airfields
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Airfields UPDATE policies (admin only)
CREATE POLICY "Airfields update policy" ON airfields
    FOR UPDATE USING (
        -- Service role can update all
        auth.role() = 'service_role'
        OR
        -- Only admins can update airfields
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Airfields DELETE policies (admin only)
CREATE POLICY "Airfields delete policy" ON airfields
    FOR DELETE USING (
        -- Service role can delete all
        auth.role() = 'service_role'
        OR
        -- Only admins can delete airfields
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- ============================================================================
-- BASE_MANAGEMENT TABLE POLICIES
-- ============================================================================

-- Enable RLS on base_management table if not already enabled
ALTER TABLE base_management ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view base_management" ON base_management;
DROP POLICY IF EXISTS "Allow authenticated users to insert base_management" ON base_management;
DROP POLICY IF EXISTS "Allow authenticated users to update base_management" ON base_management;
DROP POLICY IF EXISTS "Allow authenticated users to delete base_management" ON base_management;

-- Base management SELECT policies
CREATE POLICY "Base management view policy" ON base_management
    FOR SELECT USING (
        -- Service role can see all
        auth.role() = 'service_role'
        OR
        -- Admins can see all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can see bases where they are the base manager
        "baseManagerId" = auth.uid()
        OR
        -- All authenticated users can view bases (public data)
        auth.role() = 'authenticated'
    );

-- Base management INSERT policies
CREATE POLICY "Base management insert policy" ON base_management
    FOR INSERT WITH CHECK (
        -- Service role can insert all
        auth.role() = 'service_role'
        OR
        -- Admins can insert all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can insert bases where they are the base manager
        "baseManagerId" = auth.uid()
    );

-- Base management UPDATE policies
CREATE POLICY "Base management update policy" ON base_management
    FOR UPDATE USING (
        -- Service role can update all
        auth.role() = 'service_role'
        OR
        -- Admins can update all
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        -- Users can update bases where they are the base manager
        "baseManagerId" = auth.uid()
    );

-- Base management DELETE policies
CREATE POLICY "Base management delete policy" ON base_management
    FOR DELETE USING (
        -- Service role can delete all
        auth.role() = 'service_role'
        OR
        -- Only admins can delete bases
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Add comments explaining the security model
COMMENT ON TABLE aircraft IS 'Aircraft with role-based access control. All users can view, only admins can modify.';
COMMENT ON TABLE flight_logs IS 'Flight logs with role-based access control. Users can manage their own logs and logs where they are instructor. Admins can manage all logs.';
COMMENT ON TABLE airfields IS 'Airfields with role-based access control. All users can view, only admins can modify.';
COMMENT ON TABLE base_management IS 'Base management with role-based access control. Users can manage bases where they are the base manager. Admins can manage all bases.';
