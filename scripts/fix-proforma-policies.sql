-- =====================================================
-- FIX PROFORMA INVOICE POLICIES
-- =====================================================
-- This script updates the RLS policies to allow ALL authenticated users
-- to generate proforma invoices, not just admins

-- =====================================================
-- 1. DROP EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;

-- =====================================================
-- 2. CREATE NEW POLICIES FOR ALL AUTHENTICATED USERS
-- =====================================================

-- Policy: All authenticated users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (
        auth.uid() = "user_id" OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Policy: All authenticated users can insert their own invoices
CREATE POLICY "Users can insert their own invoices" ON invoices
    FOR INSERT WITH CHECK (
        auth.uid() = "user_id"
    );

-- Policy: All authenticated users can update their own invoices
CREATE POLICY "Users can update their own invoices" ON invoices
    FOR UPDATE USING (
        auth.uid() = "user_id" OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN user_roles ur ON u.id = ur."userId"
            JOIN roles r ON ur."roleId" = r.id
            WHERE u.id = auth.uid() AND r.name IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- =====================================================
-- 3. VERIFY THE POLICIES
-- =====================================================

-- You can check the policies with this query:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'invoices';
