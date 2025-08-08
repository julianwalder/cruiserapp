-- =====================================================
-- CHECK AND FIX HOUR PACKAGE TEMPLATES POLICIES
-- =====================================================
-- This script checks and fixes RLS policies on hour_package_templates
-- that might be preventing users from accessing packages

-- =====================================================
-- 1. CHECK CURRENT POLICIES
-- =====================================================

-- Check existing policies on hour_package_templates
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'hour_package_templates';

-- =====================================================
-- 2. DROP EXISTING RESTRICTIVE POLICIES
-- =====================================================

-- Drop any existing policies that might be too restrictive
DROP POLICY IF EXISTS "Super admins can view all hour package templates" ON hour_package_templates;
DROP POLICY IF EXISTS "Super admins can insert hour package templates" ON hour_package_templates;
DROP POLICY IF EXISTS "Super admins can update hour package templates" ON hour_package_templates;
DROP POLICY IF EXISTS "Super admins can delete hour package templates" ON hour_package_templates;

-- =====================================================
-- 3. CREATE NEW PERMISSIVE POLICIES
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE hour_package_templates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active hour packages
CREATE POLICY "All users can view active hour packages" ON hour_package_templates
    FOR SELECT USING (
        is_active = true
    );

-- Policy: Only super admins can insert templates
CREATE POLICY "Only super admins can insert hour package templates" ON hour_package_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Policy: Only super admins can update templates
CREATE POLICY "Only super admins can update hour package templates" ON hour_package_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- Policy: Only super admins can delete templates
CREATE POLICY "Only super admins can delete hour package templates" ON hour_package_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name = 'SUPER_ADMIN'
        )
    );

-- =====================================================
-- 4. VERIFY THE FIX
-- =====================================================

-- Check the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'hour_package_templates'
ORDER BY policyname;
