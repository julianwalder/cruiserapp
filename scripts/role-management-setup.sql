-- Role Management System with Capability Matrix
-- This script sets up a comprehensive role-based access control system

-- ============================================================================
-- MENU ITEMS TABLE
-- ============================================================================

-- Create menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    icon TEXT,
    "parentId" UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default menu items
INSERT INTO menu_items (name, path, icon, "parentId", "displayOrder", "requiresAuth") VALUES
-- Main Navigation
('Dashboard', '/dashboard', 'Home', NULL, 1, true),
('Community Board', '/community-board', 'Users', NULL, 2, true),
('Flight Logs', '/flight-logs', 'FileText', NULL, 3, true),
('Fleet', '/fleet', 'Plane', NULL, 4, true),
('Scheduling', '/scheduling', 'Calendar', NULL, 5, true),
('Reports', '/reports', 'BarChart3', NULL, 6, true),

-- Management Section
('Management', '/management', 'Settings', NULL, 7, true),
('Users', '/users', 'Users', NULL, 8, true),
('Airfields', '/airfields', 'MapPin', NULL, 9, true),
('Bases', '/bases', 'Building', NULL, 10, true),

-- Business Section
('Business', '/business', 'Briefcase', NULL, 11, true),
('Billing', '/billing', 'CreditCard', NULL, 12, true),
('Orders', '/orders', 'ShoppingCart', NULL, 13, true),
('Packages', '/packages', 'Package', NULL, 14, true),
('Usage', '/usage', 'Activity', NULL, 15, true),

-- Settings Section
('Settings', '/settings', 'Settings', NULL, 16, true),
('My Account', '/my-account', 'User', NULL, 17, true),
('Notifications', '/notifications', 'Bell', NULL, 18, true),

-- Sub-menu items
('Proforma Invoices', '/billing/proforma-invoices', 'FileText', 
 (SELECT id FROM menu_items WHERE path = '/billing'), 1, true),
('Client Hours', '/client-hours', 'Clock', 
 (SELECT id FROM menu_items WHERE path = '/business'), 1, true),
('Hour Packages', '/hour-packages', 'Package', 
 (SELECT id FROM menu_items WHERE path = '/business'), 2, true),
('Accounting', '/accounting', 'Calculator', 
 (SELECT id FROM menu_items WHERE path = '/business'), 3, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- CAPABILITIES TABLE
-- ============================================================================

-- Create capabilities table
CREATE TABLE IF NOT EXISTS capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    "resourceType" TEXT NOT NULL, -- 'menu', 'data', 'api'
    "resourceName" TEXT NOT NULL,
    action TEXT NOT NULL, -- 'view', 'edit', 'delete', 'create'
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default capabilities
INSERT INTO capabilities (name, description, "resourceType", "resourceName", action) VALUES
-- Menu Access Capabilities
('dashboard.view', 'View Dashboard', 'menu', 'dashboard', 'view'),
('community-board.view', 'View Community Board', 'menu', 'community-board', 'view'),
('community-board.create', 'Create Community Posts', 'menu', 'community-board', 'create'),
('community-board.edit', 'Edit Community Posts', 'menu', 'community-board', 'edit'),
('community-board.delete', 'Delete Community Posts', 'menu', 'community-board', 'delete'),
('flight-logs.view', 'View Flight Logs', 'menu', 'flight-logs', 'view'),
('flight-logs.create', 'Create Flight Logs', 'menu', 'flight-logs', 'create'),
('flight-logs.edit', 'Edit Flight Logs', 'menu', 'flight-logs', 'edit'),
('flight-logs.delete', 'Delete Flight Logs', 'menu', 'flight-logs', 'delete'),
('fleet.view', 'View Fleet', 'menu', 'fleet', 'view'),
('fleet.create', 'Create Aircraft', 'menu', 'fleet', 'create'),
('fleet.edit', 'Edit Aircraft', 'menu', 'fleet', 'edit'),
('fleet.delete', 'Delete Aircraft', 'menu', 'fleet', 'delete'),
('scheduling.view', 'View Scheduling', 'menu', 'scheduling', 'view'),
('scheduling.create', 'Create Schedules', 'menu', 'scheduling', 'create'),
('scheduling.edit', 'Edit Schedules', 'menu', 'scheduling', 'edit'),
('scheduling.delete', 'Delete Schedules', 'menu', 'scheduling', 'delete'),
('reports.view', 'View Reports', 'menu', 'reports', 'view'),
('reports.export', 'Export Reports', 'menu', 'reports', 'export'),
('users.view', 'View Users', 'menu', 'users', 'view'),
('users.create', 'Create Users', 'menu', 'users', 'create'),
('users.edit', 'Edit Users', 'menu', 'users', 'edit'),
('users.delete', 'Delete Users', 'menu', 'users', 'delete'),
('airfields.view', 'View Airfields', 'menu', 'airfields', 'view'),
('airfields.create', 'Create Airfields', 'menu', 'airfields', 'create'),
('airfields.edit', 'Edit Airfields', 'menu', 'airfields', 'edit'),
('airfields.delete', 'Delete Airfields', 'menu', 'airfields', 'delete'),
('bases.view', 'View Bases', 'menu', 'bases', 'view'),
('bases.create', 'Create Bases', 'menu', 'bases', 'create'),
('bases.edit', 'Edit Bases', 'menu', 'bases', 'edit'),
('bases.delete', 'Delete Bases', 'menu', 'bases', 'delete'),
('billing.view', 'View Billing', 'menu', 'billing', 'view'),
('billing.create', 'Create Invoices', 'menu', 'billing', 'create'),
('billing.edit', 'Edit Invoices', 'menu', 'billing', 'edit'),
('billing.delete', 'Delete Invoices', 'menu', 'billing', 'delete'),
('orders.view', 'View Orders', 'menu', 'orders', 'view'),
('orders.create', 'Create Orders', 'menu', 'orders', 'create'),
('orders.edit', 'Edit Orders', 'menu', 'orders', 'edit'),
('orders.delete', 'Delete Orders', 'menu', 'orders', 'delete'),
('packages.view', 'View Packages', 'menu', 'packages', 'view'),
('packages.create', 'Create Packages', 'menu', 'packages', 'create'),
('packages.edit', 'Edit Packages', 'menu', 'packages', 'edit'),
('packages.delete', 'Delete Packages', 'menu', 'packages', 'delete'),
('usage.view', 'View Usage', 'menu', 'usage', 'view'),
('usage.edit', 'Edit Usage', 'menu', 'usage', 'edit'),
('settings.view', 'View Settings', 'menu', 'settings', 'view'),
('settings.edit', 'Edit Settings', 'menu', 'settings', 'edit'),
('my-account.view', 'View My Account', 'menu', 'my-account', 'view'),
('my-account.edit', 'Edit My Account', 'menu', 'my-account', 'edit'),
('notifications.view', 'View Notifications', 'menu', 'notifications', 'view'),
('notifications.edit', 'Edit Notifications', 'menu', 'notifications', 'edit'),

-- Data Access Capabilities
('data.users.view', 'View User Data', 'data', 'users', 'view'),
('data.users.edit', 'Edit User Data', 'data', 'users', 'edit'),
('data.users.delete', 'Delete User Data', 'data', 'users', 'delete'),
('data.flight-logs.view', 'View Flight Log Data', 'data', 'flight-logs', 'view'),
('data.flight-logs.edit', 'Edit Flight Log Data', 'data', 'flight-logs', 'edit'),
('data.flight-logs.delete', 'Delete Flight Log Data', 'data', 'flight-logs', 'delete'),
('data.aircraft.view', 'View Aircraft Data', 'data', 'aircraft', 'view'),
('data.aircraft.edit', 'Edit Aircraft Data', 'data', 'aircraft', 'edit'),
('data.aircraft.delete', 'Delete Aircraft Data', 'data', 'aircraft', 'delete'),
('data.airfields.view', 'View Airfield Data', 'data', 'airfields', 'view'),
('data.airfields.edit', 'Edit Airfield Data', 'data', 'airfields', 'edit'),
('data.airfields.delete', 'Delete Airfield Data', 'data', 'airfields', 'delete'),
('data.bases.view', 'View Base Data', 'data', 'bases', 'view'),
('data.bases.edit', 'Edit Base Data', 'data', 'bases', 'edit'),
('data.bases.delete', 'Delete Base Data', 'data', 'bases', 'delete'),

-- API Access Capabilities
('api.users.read', 'Read Users API', 'api', 'users', 'read'),
('api.users.write', 'Write Users API', 'api', 'users', 'write'),
('api.flight-logs.read', 'Read Flight Logs API', 'api', 'flight-logs', 'read'),
('api.flight-logs.write', 'Write Flight Logs API', 'api', 'flight-logs', 'write'),
('api.aircraft.read', 'Read Aircraft API', 'api', 'aircraft', 'read'),
('api.aircraft.write', 'Write Aircraft API', 'api', 'aircraft', 'write'),
('api.airfields.read', 'Read Airfields API', 'api', 'airfields', 'read'),
('api.airfields.write', 'Write Airfields API', 'api', 'airfields', 'write'),
('api.bases.read', 'Read Bases API', 'api', 'bases', 'read'),
('api.bases.write', 'Write Bases API', 'api', 'bases', 'write')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROLE CAPABILITIES TABLE (Junction table)
-- ============================================================================

-- Create role capabilities junction table
CREATE TABLE IF NOT EXISTS role_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roleId" UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    "capabilityId" UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "grantedBy" UUID REFERENCES users(id),
    UNIQUE("roleId", "capabilityId")
);

-- ============================================================================
-- FUNCTIONS FOR ROLE MANAGEMENT
-- ============================================================================

-- Function to get user capabilities
CREATE OR REPLACE FUNCTION get_user_capabilities(user_id UUID)
RETURNS TABLE (
    capability_name TEXT,
    resource_type TEXT,
    resource_name TEXT,
    action TEXT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        c.name as capability_name,
        c."resourceType" as resource_type,
        c."resourceName" as resource_name,
        c.action,
        c.description
    FROM capabilities c
    JOIN role_capabilities rc ON c.id = rc."capabilityId"
    JOIN user_roles ur ON rc."roleId" = ur."roleId"
    WHERE ur."userId" = user_id
    ORDER BY c."resourceType", c."resourceName", c.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has capability
CREATE OR REPLACE FUNCTION has_capability(user_id UUID, capability_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_cap BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM capabilities c
        JOIN role_capabilities rc ON c.id = rc."capabilityId"
        JOIN user_roles ur ON rc."roleId" = ur."roleId"
        WHERE ur."userId" = user_id AND c.name = capability_name
    ) INTO has_cap;
    
    RETURN has_cap;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get role capabilities
CREATE OR REPLACE FUNCTION get_role_capabilities(role_id UUID)
RETURNS TABLE (
    capability_id UUID,
    capability_name TEXT,
    resource_type TEXT,
    resource_name TEXT,
    action TEXT,
    description TEXT,
    is_granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as capability_id,
        c.name as capability_name,
        c."resourceType" as resource_type,
        c."resourceName" as resource_name,
        c.action,
        c.description,
        rc."roleId" IS NOT NULL as is_granted
    FROM capabilities c
    LEFT JOIN role_capabilities rc ON c.id = rc."capabilityId" AND rc."roleId" = role_id
    ORDER BY c."resourceType", c."resourceName", c.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant capability to role
CREATE OR REPLACE FUNCTION grant_capability_to_role(
    role_id UUID,
    capability_id UUID,
    granted_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO role_capabilities ("roleId", "capabilityId", "grantedBy")
    VALUES (role_id, capability_id, granted_by)
    ON CONFLICT ("roleId", "capabilityId") DO NOTHING;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke capability from role
CREATE OR REPLACE FUNCTION revoke_capability_from_role(
    role_id UUID,
    capability_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM role_capabilities 
    WHERE "roleId" = role_id AND "capabilityId" = capability_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_capabilities ENABLE ROW LEVEL SECURITY;

-- Menu items policies
CREATE POLICY "Menu items view policy" ON menu_items
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
        OR
        "isActive" = true
    );

CREATE POLICY "Menu items admin policy" ON menu_items
    FOR ALL USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Capabilities policies
CREATE POLICY "Capabilities view policy" ON capabilities
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Capabilities admin policy" ON capabilities
    FOR ALL USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Role capabilities policies
CREATE POLICY "Role capabilities view policy" ON role_capabilities
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Role capabilities admin policy" ON role_capabilities
    FOR ALL USING (
        auth.role() = 'service_role'
        OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur."roleId" = r.id
            WHERE ur."userId" = auth.uid() 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_capabilities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_capability(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_capabilities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_capability_to_role(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_capability_from_role(UUID, UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE menu_items IS 'Menu items for navigation with hierarchical structure';
COMMENT ON TABLE capabilities IS 'System capabilities defining what actions users can perform';
COMMENT ON TABLE role_capabilities IS 'Junction table linking roles to their capabilities';
COMMENT ON FUNCTION get_user_capabilities(UUID) IS 'Get all capabilities for a specific user';
COMMENT ON FUNCTION has_capability(UUID, TEXT) IS 'Check if a user has a specific capability';
COMMENT ON FUNCTION get_role_capabilities(UUID) IS 'Get all capabilities for a specific role';
COMMENT ON FUNCTION grant_capability_to_role(UUID, UUID, UUID) IS 'Grant a capability to a role';
COMMENT ON FUNCTION revoke_capability_from_role(UUID, UUID) IS 'Revoke a capability from a role';
