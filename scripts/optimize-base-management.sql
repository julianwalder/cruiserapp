-- Base Management Performance Optimizations
-- This script adds indexes and optimizations for faster base management queries

-- Add indexes for base_management table
CREATE INDEX IF NOT EXISTS idx_base_management_airfield_id ON base_management("airfieldId");
CREATE INDEX IF NOT EXISTS idx_base_management_base_manager_id ON base_management("baseManagerId");
CREATE INDEX IF NOT EXISTS idx_base_management_created_at ON base_management("createdAt");
CREATE INDEX IF NOT EXISTS idx_base_management_updated_at ON base_management("updatedAt");

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_base_management_airfield_manager ON base_management("airfieldId", "baseManagerId");

-- Add index for airfields isBase column (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'airfields' AND column_name = 'isBase') THEN
        CREATE INDEX IF NOT EXISTS idx_airfields_is_base ON airfields("isBase");
    END IF;
END $$;

-- Add indexes for user roles queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles("userId");
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles("roleId");

-- Add composite index for user roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles("userId", "roleId");

-- Add indexes for airfields table
CREATE INDEX IF NOT EXISTS idx_airfields_code ON airfields(code);
CREATE INDEX IF NOT EXISTS idx_airfields_city ON airfields(city);
CREATE INDEX IF NOT EXISTS idx_airfields_country ON airfields(country);
CREATE INDEX IF NOT EXISTS idx_airfields_type ON airfields(type);
CREATE INDEX IF NOT EXISTS idx_airfields_status ON airfields(status);

-- Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users("firstName");
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users("lastName");

-- Add composite index for user name searches
CREATE INDEX IF NOT EXISTS idx_users_name_search ON users("firstName", "lastName");

-- Analyze tables to update statistics
ANALYZE base_management;
ANALYZE airfields;
ANALYZE users;
ANALYZE user_roles;
ANALYZE roles;

-- Create a materialized view for base management summary (optional performance boost)
-- This can be refreshed periodically for very large datasets
CREATE MATERIALIZED VIEW IF NOT EXISTS base_management_summary AS
SELECT 
    bm.id,
    bm."airfieldId",
    bm."baseManagerId",
    bm."additionalInfo",
    bm."operatingHours",
    bm."emergencyContact",
    bm.notes,
    bm."imagePath",
    bm."createdAt",
    bm."updatedAt",
    a.name as airfield_name,
    a.code as airfield_code,
    a.type as airfield_type,
    a.status as airfield_status,
    a.city as airfield_city,
    a.state as airfield_state,
    a.country as airfield_country,
    u."firstName" as manager_first_name,
    u."lastName" as manager_last_name,
    u.email as manager_email
FROM base_management bm
LEFT JOIN airfields a ON bm."airfieldId" = a.id
LEFT JOIN users u ON bm."baseManagerId" = u.id;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_base_management_summary_airfield ON base_management_summary("airfieldId");
CREATE INDEX IF NOT EXISTS idx_base_management_summary_manager ON base_management_summary("baseManagerId");
CREATE INDEX IF NOT EXISTS idx_base_management_summary_created ON base_management_summary("createdAt");

-- Function to refresh materialized view (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_base_management_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW base_management_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON base_management_summary TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_base_management_summary() TO authenticated;

-- Add comments for documentation
COMMENT ON INDEX idx_base_management_airfield_id IS 'Index for fast airfield lookups in base management';
COMMENT ON INDEX idx_base_management_base_manager_id IS 'Index for fast base manager lookups';
COMMENT ON INDEX idx_base_management_created_at IS 'Index for chronological ordering of base management records';
COMMENT ON MATERIALIZED VIEW base_management_summary IS 'Materialized view for fast base management queries with joined data';

-- Show optimization results
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('base_management', 'airfields', 'users', 'user_roles')
ORDER BY tablename, indexname;
