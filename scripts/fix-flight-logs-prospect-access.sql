-- Fix Flight Logs Access for Prospects
-- This script updates the flight logs RLS policies to exclude PROSPECT users

-- Drop existing flight logs policies
DROP POLICY IF EXISTS "Flight logs view policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs insert policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs update policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs delete policy" ON flight_logs;

-- Flight logs SELECT policies (exclude PROSPECT users)
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
        -- Users with active roles (excluding PROSPECT) can see their own flight logs
        (
            EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid() 
                AND r.name NOT IN ('PROSPECT')
            )
            AND (
                "pilotId" = auth.uid()
                OR "instructorId" = auth.uid()
                OR "createdById" = auth.uid()
            )
        )
    );

-- Flight logs INSERT policies (exclude PROSPECT users)
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
        -- Users with active roles (excluding PROSPECT) can insert their own flight logs
        (
            EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid() 
                AND r.name NOT IN ('PROSPECT')
            )
            AND (
                "pilotId" = auth.uid()
                OR "instructorId" = auth.uid()
                OR "createdById" = auth.uid()
            )
        )
    );

-- Flight logs UPDATE policies (exclude PROSPECT users)
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
        -- Users with active roles (excluding PROSPECT) can update their own flight logs
        (
            EXISTS (
                SELECT 1 FROM user_roles ur 
                JOIN roles r ON ur."roleId" = r.id
                WHERE ur."userId" = auth.uid() 
                AND r.name NOT IN ('PROSPECT')
            )
            AND (
                "pilotId" = auth.uid()
                OR "instructorId" = auth.uid()
                OR "createdById" = auth.uid()
            )
        )
    );

-- Flight logs DELETE policies (admin only)
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

-- Add comment explaining the security model
COMMENT ON TABLE flight_logs IS 'Flight logs with role-based access control. PROSPECT users cannot access flight logs. Active users can manage their own logs and logs where they are instructor. Admins can manage all logs.';
