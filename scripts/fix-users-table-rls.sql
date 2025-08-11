-- Fix Users Table RLS Policies - Phase 1 Critical Security Fix
-- This script replaces the overly permissive "view all users" policy with scoped access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON users;

-- Create new scoped policies for user data access

-- 1. Users can view their own profile (full access)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile (existing policy - keep it)
-- This policy should already exist, but let's ensure it's correct
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 3. Admin users can view limited user data for management purposes
CREATE POLICY "Admin users can view limited user data" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- 4. Service role can access all user data (for API operations)
CREATE POLICY "Service role can access all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Create a view for public user information (for UI display)
-- This view strips sensitive fields and only shows basic info
CREATE OR REPLACE VIEW public_user_info AS
SELECT 
    id,
    email,
    "firstName",
    "lastName",
    status,
    "avatarUrl",
    "createdAt",
    "updatedAt"
FROM users
WHERE status = 'ACTIVE';

-- Grant access to the public user info view
GRANT SELECT ON public_user_info TO authenticated;

-- Create a function to get user info based on role
CREATE OR REPLACE FUNCTION get_user_info(requested_user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    status TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,
    "personalNumber" TEXT,
    phone TEXT,
    "dateOfBirth" DATE,
    address TEXT,
    city TEXT,
    state TEXT,
    "zipCode" TEXT,
    country TEXT,
    "totalFlightHours" INTEGER,
    "licenseNumber" TEXT,
    "medicalClass" TEXT,
    "instructorRating" TEXT
) AS $$
BEGIN
    -- Check if user is requesting their own data
    IF auth.uid() = requested_user_id THEN
        -- Return full profile data
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.status,
            u."avatarUrl",
            u."createdAt",
            u."updatedAt",
            u."personalNumber",
            u.phone,
            u."dateOfBirth",
            u.address,
            u.city,
            u.state,
            u."zipCode",
            u.country,
            u."totalFlightHours",
            u."licenseNumber",
            u."medicalClass",
            u."instructorRating"
        FROM users u
        WHERE u.id = requested_user_id;
    -- Check if user is admin
    ELSIF EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur."roleId" = r.id
        WHERE ur."userId" = auth.uid() 
        AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    ) THEN
        -- Return full user data for admins
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.status,
            u."avatarUrl",
            u."createdAt",
            u."updatedAt",
            u."personalNumber",
            u.phone,
            u."dateOfBirth",
            u.address,
            u.city,
            u.state,
            u."zipCode",
            u.country,
            u."totalFlightHours",
            u."licenseNumber",
            u."medicalClass",
            u."instructorRating"
        FROM users u
        WHERE u.id = requested_user_id;
    ELSE
        -- Return limited public data for other users
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.status,
            u."avatarUrl",
            u."createdAt",
            u."updatedAt",
            NULL::TEXT as "personalNumber",
            NULL::TEXT as phone,
            NULL::DATE as "dateOfBirth",
            NULL::TEXT as address,
            NULL::TEXT as city,
            NULL::TEXT as state,
            NULL::TEXT as "zipCode",
            NULL::TEXT as country,
            NULL::INTEGER as "totalFlightHours",
            NULL::TEXT as "licenseNumber",
            NULL::TEXT as "medicalClass",
            NULL::TEXT as "instructorRating"
        FROM users u
        WHERE u.id = requested_user_id AND u.status = 'ACTIVE';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_info(UUID) TO authenticated;

-- Create a function to list users based on role
CREATE OR REPLACE FUNCTION list_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    status TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if user is admin
    IF EXISTS (
        SELECT 1 FROM user_roles ur 
        JOIN roles r ON ur."roleId" = r.id
        WHERE ur."userId" = auth.uid() 
        AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    ) THEN
        -- Return all users for admins
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.status::text,
            u."avatarUrl",
            u."createdAt",
            u."updatedAt"
        FROM users u
        ORDER BY u."createdAt" DESC;
    ELSE
        -- Return only active users for regular users
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u."firstName",
            u."lastName",
            u.status::text,
            u."avatarUrl",
            u."createdAt",
            u."updatedAt"
        FROM users u
        WHERE u.status = 'ACTIVE'
        ORDER BY u."createdAt" DESC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION list_users() TO authenticated;

-- Add comment explaining the new security model
COMMENT ON TABLE users IS 'User profiles with role-based access control. Users can only view their own full profile. Admins can view all users. Regular users can only see basic info of active users.';

COMMENT ON FUNCTION get_user_info(UUID) IS 'Get user information based on role. Users get full access to their own data, admins get full access to all data, others get limited public data.';

COMMENT ON FUNCTION list_users() IS 'List users based on role. Admins see all users, regular users see only active users with basic info.';
