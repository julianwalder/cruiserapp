-- Rollback Script for UUID Migration
-- This script restores the database to its previous state
-- Only run this if the UUID migration failed and you need to rollback

-- Step 1: Drop the migrated tables
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS aircraft_hobbs CASCADE;
DROP TABLE IF EXISTS ppl_course_tranches CASCADE;
DROP TABLE IF EXISTS flight_hours CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoice_clients CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS user_company_relationships CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS base_management CASCADE;
DROP TABLE IF EXISTS flight_logs CASCADE;
DROP TABLE IF EXISTS aircraft CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Restore from backup tables
CREATE TABLE users AS SELECT * FROM users_backup;
CREATE TABLE roles AS SELECT * FROM roles_backup;
CREATE TABLE user_roles AS SELECT * FROM user_roles_backup;
CREATE TABLE aircraft AS SELECT * FROM aircraft_backup;
CREATE TABLE flight_logs AS SELECT * FROM flight_logs_backup;
CREATE TABLE airfields AS SELECT * FROM airfields_backup;
CREATE TABLE base_management AS SELECT * FROM base_management_backup;
CREATE TABLE companies AS SELECT * FROM companies_backup;
CREATE TABLE user_company_relationships AS SELECT * FROM user_company_relationships_backup;
CREATE TABLE invoices AS SELECT * FROM invoices_backup;
CREATE TABLE invoice_clients AS SELECT * FROM invoice_clients_backup;
CREATE TABLE invoice_items AS SELECT * FROM invoice_items_backup;
CREATE TABLE flight_hours AS SELECT * FROM flight_hours_backup;
CREATE TABLE ppl_course_tranches AS SELECT * FROM ppl_course_tranches_backup;
CREATE TABLE aircraft_hobbs AS SELECT * FROM aircraft_hobbs_backup;
CREATE TABLE password_reset_tokens AS SELECT * FROM password_reset_tokens_backup;

-- Step 3: Recreate primary keys and constraints
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE roles ADD PRIMARY KEY (id);
ALTER TABLE user_roles ADD PRIMARY KEY (id);
ALTER TABLE aircraft ADD PRIMARY KEY (id);
ALTER TABLE flight_logs ADD PRIMARY KEY (id);
ALTER TABLE airfields ADD PRIMARY KEY (id);
ALTER TABLE base_management ADD PRIMARY KEY (id);
ALTER TABLE companies ADD PRIMARY KEY (id);
ALTER TABLE user_company_relationships ADD PRIMARY KEY (id);
ALTER TABLE invoices ADD PRIMARY KEY (id);
ALTER TABLE invoice_clients ADD PRIMARY KEY (id);
ALTER TABLE invoice_items ADD PRIMARY KEY (id);
ALTER TABLE flight_hours ADD PRIMARY KEY (id);
ALTER TABLE ppl_course_tranches ADD PRIMARY KEY (id);
ALTER TABLE aircraft_hobbs ADD PRIMARY KEY (id);
ALTER TABLE password_reset_tokens ADD PRIMARY KEY (id);

-- Step 4: Recreate foreign key constraints (adjust constraint names as needed)
-- Note: You may need to adjust these based on your original constraint names

-- Step 5: Recreate indexes (adjust index names as needed)
-- Note: You may need to adjust these based on your original index names

-- Step 6: Clean up backup tables
DROP TABLE IF EXISTS users_backup;
DROP TABLE IF EXISTS roles_backup;
DROP TABLE IF EXISTS user_roles_backup;
DROP TABLE IF EXISTS aircraft_backup;
DROP TABLE IF EXISTS flight_logs_backup;
DROP TABLE IF EXISTS airfields_backup;
DROP TABLE IF EXISTS base_management_backup;
DROP TABLE IF EXISTS companies_backup;
DROP TABLE IF EXISTS user_company_relationships_backup;
DROP TABLE IF EXISTS invoices_backup;
DROP TABLE IF EXISTS invoice_clients_backup;
DROP TABLE IF EXISTS invoice_items_backup;
DROP TABLE IF EXISTS flight_hours_backup;
DROP TABLE IF EXISTS ppl_course_tranches_backup;
DROP TABLE IF EXISTS aircraft_hobbs_backup;
DROP TABLE IF EXISTS password_reset_tokens_backup;

-- Step 7: Verify rollback
SELECT 'Rollback completed successfully!' as status;

-- Display table counts to verify data integrity
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