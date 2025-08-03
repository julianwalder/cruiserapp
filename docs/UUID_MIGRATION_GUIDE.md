# UUID Migration Guide

This guide provides a comprehensive plan to convert all text ID fields to UUID format in your Supabase database and update the code accordingly.

## Overview

The migration involves:
1. **Database Migration**: Converting text ID columns to UUID format
2. **Code Updates**: Updating TypeScript interfaces and API endpoints
3. **Testing**: Verifying all functionality works with UUIDs
4. **Deployment**: Rolling out the changes safely

## Prerequisites

- Backup your database before starting
- Ensure you have access to Supabase service role key
- Test the migration on a staging environment first
- Coordinate with your team to minimize downtime

## Phase 1: Database Migration

### Step 1: Backup Current Data

Before running the migration, create a complete backup:

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE roles_backup AS SELECT * FROM roles;
CREATE TABLE user_roles_backup AS SELECT * FROM user_roles;
CREATE TABLE aircraft_backup AS SELECT * FROM aircraft;
CREATE TABLE flight_logs_backup AS SELECT * FROM flight_logs;
CREATE TABLE airfields_backup AS SELECT * FROM airfields;
CREATE TABLE base_management_backup AS SELECT * FROM base_management;
CREATE TABLE companies_backup AS SELECT * FROM companies;
CREATE TABLE user_company_relationships_backup AS SELECT * FROM user_company_relationships;
CREATE TABLE invoices_backup AS SELECT * FROM invoices;
CREATE TABLE invoice_clients_backup AS SELECT * FROM invoice_clients;
CREATE TABLE invoice_items_backup AS SELECT * FROM invoice_items;
CREATE TABLE flight_hours_backup AS SELECT * FROM flight_hours;
CREATE TABLE ppl_course_tranches_backup AS SELECT * FROM ppl_course_tranches;
CREATE TABLE aircraft_hobbs_backup AS SELECT * FROM aircraft_hobbs;
CREATE TABLE password_reset_tokens_backup AS SELECT * FROM password_reset_tokens;
```

### Step 2: Run the Migration

Execute the migration script:

```bash
npm run migrate-to-uuids
```

Or manually run the SQL script in Supabase SQL Editor:

```sql
-- Copy and paste the contents of scripts/migrate-all-to-uuids.sql
```

### Step 3: Verify Migration

Check that all tables have been migrated correctly:

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

## Phase 2: Code Updates

### Step 1: Update TypeScript Interfaces

Replace all existing interface definitions with the new UUID types:

```typescript
// Replace existing interfaces with imports from the new types file
import { 
  User, 
  Aircraft, 
  FlightLog, 
  Airfield, 
  UUID,
  // ... other types
} from '@/types/uuid-types';
```

### Step 2: Update API Endpoints

Update all API routes to handle UUIDs:

```typescript
// Before (text IDs)
const userId = '12345';

// After (UUIDs)
const userId: UUID = '550e8400-e29b-41d4-a716-446655440000';
```

### Step 3: Update Database Queries

Ensure all Supabase queries use UUID format:

```typescript
// Before
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', '12345');

// After
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', '550e8400-e29b-41d4-a716-446655440000');
```

### Step 4: Update Form Validation

Update Zod schemas to validate UUID format:

```typescript
import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format');

const userSchema = z.object({
  id: uuidSchema.optional(), // For updates
  email: z.string().email(),
  // ... other fields
});
```

## Phase 3: Testing

### Step 1: Unit Tests

Create tests for UUID handling:

```typescript
import { describe, it, expect } from 'vitest';
import { uuidSchema } from '@/lib/validations';

describe('UUID Validation', () => {
  it('should validate correct UUID format', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuidSchema.safeParse(validUUID).success).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidUUID = '12345';
    expect(uuidSchema.safeParse(invalidUUID).success).toBe(false);
  });
});
```

### Step 2: Integration Tests

Test API endpoints with UUIDs:

```typescript
describe('User API', () => {
  it('should create user with UUID', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        // ... other fields
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
```

### Step 3: End-to-End Tests

Test complete user workflows:

1. User registration
2. User login
3. Flight log creation
4. Aircraft management
5. Airfield management

## Phase 4: Deployment

### Step 1: Staging Deployment

1. Deploy to staging environment
2. Run the migration script
3. Test all functionality
4. Verify data integrity

### Step 2: Production Deployment

1. Schedule maintenance window
2. Backup production database
3. Run migration script
4. Deploy updated code
5. Verify functionality
6. Monitor for issues

### Step 3: Rollback Plan

If issues occur, use the rollback script:

```bash
# Run rollback SQL in Supabase SQL Editor
-- Copy and paste the contents of scripts/rollback-uuid-migration.sql
```

## Files to Update

### Database Scripts
- `scripts/migrate-all-to-uuids.sql` - Main migration script
- `scripts/rollback-uuid-migration.sql` - Rollback script
- `scripts/run-uuid-migration.js` - Migration runner

### TypeScript Files
- `src/types/uuid-types.ts` - New type definitions
- All component files using ID fields
- All API route files
- All service files

### Configuration Files
- `package.json` - Added migration script

## Common Issues and Solutions

### Issue 1: Foreign Key Constraint Errors

**Problem**: Migration fails due to existing foreign key constraints

**Solution**: Drop constraints before migration, recreate after:

```sql
-- Drop existing constraints
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Run migration

-- Recreate constraints
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
```

### Issue 2: TypeScript Compilation Errors

**Problem**: Type errors after updating interfaces

**Solution**: Update all ID references to use UUID type:

```typescript
// Before
const userId: string = '12345';

// After
const userId: UUID = '550e8400-e29b-41d4-a716-446655440000';
```

### Issue 3: API Response Format Changes

**Problem**: Frontend expects different ID format

**Solution**: Update frontend to handle UUID format:

```typescript
// Update form validation
const userSchema = z.object({
  id: z.string().uuid().optional(),
  // ... other fields
});
```

## Performance Considerations

### Indexes
The migration script creates appropriate indexes for UUID columns:

```sql
CREATE INDEX idx_user_roles_user_id ON user_roles("userId");
CREATE INDEX idx_flight_logs_aircraft_id ON flight_logs("aircraftId");
-- ... other indexes
```

### Query Optimization
UUIDs are larger than text IDs, but provide better distribution and uniqueness.

## Security Considerations

### UUID Generation
Use cryptographically secure UUID generation:

```typescript
import { randomUUID } from 'crypto';

const newId = randomUUID();
```

### Validation
Always validate UUID format in API endpoints:

```typescript
const uuidSchema = z.string().uuid();
const validatedId = uuidSchema.parse(id);
```

## Monitoring and Maintenance

### Post-Migration Tasks

1. **Monitor Performance**: Watch for any performance degradation
2. **Update Documentation**: Update API documentation with UUID examples
3. **Team Training**: Ensure team understands UUID format
4. **Cleanup**: Remove old backup tables after verification

### Long-term Maintenance

1. **Regular Backups**: Continue regular database backups
2. **Performance Monitoring**: Monitor query performance
3. **Security Updates**: Keep UUID generation secure
4. **Documentation**: Maintain up-to-date documentation

## Conclusion

This migration provides:
- **Better Data Integrity**: UUIDs are globally unique
- **Improved Security**: No sequential ID exposure
- **Scalability**: Better distribution across database partitions
- **Future-proofing**: Standard format for modern applications

Follow this guide carefully and test thoroughly in staging before applying to production. 