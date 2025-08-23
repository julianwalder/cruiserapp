-- Rollback script for pilotId refactor
-- Use this if you need to revert the changes

-- Step 1: Add back the pilotId column
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS "pilotId" UUID;

-- Step 2: Copy data back from userId to pilotId
UPDATE flight_logs SET "pilotId" = "userId" WHERE "pilotId" IS NULL;

-- Step 3: Make pilotId NOT NULL
ALTER TABLE flight_logs ALTER COLUMN "pilotId" SET NOT NULL;

-- Step 4: Drop existing RLS policies
DROP POLICY IF EXISTS "Flight logs view policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs insert policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs update policy" ON flight_logs;
DROP POLICY IF EXISTS "Flight logs delete policy" ON flight_logs;

-- Step 5: Recreate RLS policies using pilotId
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

-- Step 6: Update foreign key constraint
-- Drop the new constraint
ALTER TABLE flight_logs DROP CONSTRAINT IF EXISTS flight_logs_user_id_fkey;

-- Add back the old constraint
ALTER TABLE flight_logs 
ADD CONSTRAINT flight_logs_pilot_id_fkey 
FOREIGN KEY ("pilotId") REFERENCES users(id) ON DELETE SET NULL;

-- Step 7: Create index on pilotId
CREATE INDEX IF NOT EXISTS idx_flight_logs_pilot_id ON flight_logs("pilotId");

-- Step 8: Drop the userId column
ALTER TABLE flight_logs DROP COLUMN "userId";

-- Step 9: Drop the userId index
DROP INDEX IF EXISTS idx_flight_logs_user_id;

-- Verification
SELECT 
    'Total flight logs' as check_type,
    COUNT(*) as count
FROM flight_logs
UNION ALL
SELECT 
    'Flight logs with pilotId' as check_type,
    COUNT(*) as count
FROM flight_logs 
WHERE "pilotId" IS NOT NULL;
