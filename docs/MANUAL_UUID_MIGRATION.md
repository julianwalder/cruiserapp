# Manual UUID Migration Guide

Since the `exec_sql` function is not available in your Supabase database, you'll need to run the migration manually in the Supabase SQL Editor.

## 🚀 Step-by-Step Manual Migration

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab
3. Create a new query

### Step 2: Create Backups

First, run this backup script to create copies of all your tables:

```sql
-- Create backup tables for safety
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS roles_backup AS SELECT * FROM roles;
CREATE TABLE IF NOT EXISTS user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE IF NOT EXISTS aircraft_backup AS SELECT * FROM aircraft;
CREATE TABLE IF NOT EXISTS flight_logs_backup AS SELECT * FROM flight_logs;
CREATE TABLE IF NOT EXISTS airfields_backup AS SELECT * FROM airfields;
CREATE TABLE IF NOT EXISTS base_management_backup AS SELECT * FROM base_management;
CREATE TABLE IF NOT EXISTS companies_backup AS SELECT * FROM companies;
CREATE TABLE IF NOT EXISTS user_company_relationships_backup AS SELECT * FROM user_company_relationships;
CREATE TABLE IF NOT EXISTS invoices_backup AS SELECT * FROM invoices;
CREATE TABLE IF NOT EXISTS invoice_clients_backup AS SELECT * FROM invoice_clients;
CREATE TABLE IF NOT EXISTS invoice_items_backup AS SELECT * FROM invoice_items;
CREATE TABLE IF NOT EXISTS flight_hours_backup AS SELECT * FROM flight_hours;
CREATE TABLE IF NOT EXISTS ppl_course_tranches_backup AS SELECT * FROM ppl_course_tranches;
CREATE TABLE IF NOT EXISTS aircraft_hobbs_backup AS SELECT * FROM aircraft_hobbs;
CREATE TABLE IF NOT EXISTS password_reset_tokens_backup AS SELECT * FROM password_reset_tokens;
```

### Step 3: Run the Migration Script

Copy and paste the entire contents of `scripts/migrate-all-to-uuids.sql` into the SQL Editor and execute it.

**Important**: Run this in a single transaction to ensure atomicity.

### Step 4: Verify the Migration

Run this verification query to check that all tables have been migrated:

```sql
-- Verify record counts
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'aircraft', COUNT(*) FROM aircraft
UNION ALL
SELECT 'flight_logs', COUNT(*) FROM flight_logs
UNION ALL
SELECT 'airfields', COUNT(*) FROM airfields
UNION ALL
SELECT 'base_management', COUNT(*) FROM base_management
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'user_company_relationships', COUNT(*) FROM user_company_relationships
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'invoice_clients', COUNT(*) FROM invoice_clients
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'flight_hours', COUNT(*) FROM flight_hours
UNION ALL
SELECT 'ppl_course_tranches', COUNT(*) FROM ppl_course_tranches
UNION ALL
SELECT 'aircraft_hobbs', COUNT(*) FROM aircraft_hobbs
UNION ALL
SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens;
```

### Step 5: Test UUID Format

Verify that IDs are now in UUID format:

```sql
-- Check UUID format for a few records
SELECT id FROM users LIMIT 3;
SELECT id FROM aircraft LIMIT 3;
SELECT id FROM flight_logs LIMIT 3;
```

UUIDs should look like: `550e8400-e29b-41d4-a716-446655440000`

## ⚠️ Rollback Instructions

If something goes wrong, you can rollback using the backup tables:

```sql
-- Copy and paste the contents of scripts/rollback-uuid-migration.sql
```

## 🔧 Alternative: Step-by-Step Migration

If you prefer to run the migration in smaller steps, here's a breakdown:

### Step 1: Add UUID Columns

```sql
-- Add new UUID columns to all tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE roles ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS user_id_uuid UUID;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS role_id_uuid UUID;
ALTER TABLE aircraft ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS aircraft_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS pilot_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS instructor_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS departure_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS arrival_airfield_id_uuid UUID;
ALTER TABLE flight_logs ADD COLUMN IF NOT EXISTS created_by_id_uuid UUID;
ALTER TABLE airfields ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS airfield_id_uuid UUID;
ALTER TABLE base_management ADD COLUMN IF NOT EXISTS base_manager_id_uuid UUID;
```

### Step 2: Update Foreign Key Relationships

```sql
-- Update user_roles to link to users and roles UUIDs
UPDATE user_roles 
SET user_id_uuid = users.id_uuid 
FROM users 
WHERE user_roles."userId" = users.id;

UPDATE user_roles 
SET role_id_uuid = roles.id_uuid 
FROM roles 
WHERE user_roles."roleId" = roles.id;

-- Update flight_logs relationships
UPDATE flight_logs 
SET aircraft_id_uuid = aircraft.id_uuid 
FROM aircraft 
WHERE flight_logs."aircraftId" = aircraft.id;

UPDATE flight_logs 
SET pilot_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."pilotId" = users.id;

UPDATE flight_logs 
SET instructor_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."instructorId" = users.id;

UPDATE flight_logs 
SET departure_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."departureAirfieldId" = airfields.id;

UPDATE flight_logs 
SET arrival_airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE flight_logs."arrivalAirfieldId" = airfields.id;

UPDATE flight_logs 
SET created_by_id_uuid = users.id_uuid 
FROM users 
WHERE flight_logs."createdById" = users.id;

-- Update base_management relationships
UPDATE base_management 
SET airfield_id_uuid = airfields.id_uuid 
FROM airfields 
WHERE base_management."airfieldId" = airfields.id;

UPDATE base_management 
SET base_manager_id_uuid = users.id_uuid 
FROM users 
WHERE base_management."baseManagerId" = users.id;
```

### Step 3: Drop Old Columns and Rename New Ones

```sql
-- Users table
ALTER TABLE users DROP COLUMN IF EXISTS id;
ALTER TABLE users RENAME COLUMN id_uuid TO id;
ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ADD PRIMARY KEY (id);

-- Roles table
ALTER TABLE roles DROP COLUMN IF EXISTS id;
ALTER TABLE roles RENAME COLUMN id_uuid TO id;
ALTER TABLE roles ALTER COLUMN id SET NOT NULL;
ALTER TABLE roles ADD PRIMARY KEY (id);

-- User_roles table
ALTER TABLE user_roles DROP COLUMN IF EXISTS id;
ALTER TABLE user_roles DROP COLUMN IF EXISTS "userId";
ALTER TABLE user_roles DROP COLUMN IF EXISTS "roleId";
ALTER TABLE user_roles RENAME COLUMN id_uuid TO id;
ALTER TABLE user_roles RENAME COLUMN user_id_uuid TO "userId";
ALTER TABLE user_roles RENAME COLUMN role_id_uuid TO "roleId";
ALTER TABLE user_roles ALTER COLUMN id SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE user_roles ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE user_roles ADD PRIMARY KEY (id);

-- Continue for other tables...
```

## 📋 Pre-Migration Checklist

- [ ] Database backup completed
- [ ] All team members notified
- [ ] Application downtime scheduled
- [ ] Rollback plan prepared
- [ ] Test environment migration successful

## 📋 Post-Migration Checklist

- [ ] All tables migrated to UUID
- [ ] Foreign key relationships intact
- [ ] Indexes created for performance
- [ ] Application code updated
- [ ] Tests passing with UUIDs
- [ ] Performance monitoring active

## 🆘 Emergency Contacts

If you encounter issues during migration:

1. **Immediate Rollback**: Use the rollback script
2. **Check Logs**: Review Supabase logs for errors
3. **Verify Data**: Check backup tables for data integrity
4. **Contact Support**: Reach out to Supabase support if needed

## 🎯 Success Criteria

The migration is successful when:

- All ID columns are UUID format
- All foreign key relationships work
- Application functions normally
- Performance is acceptable
- No data loss occurred 