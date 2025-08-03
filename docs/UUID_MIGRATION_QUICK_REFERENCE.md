# UUID Migration Quick Reference

## 🚀 Quick Start Commands

### 1. Backup Database
```sql
-- Run in Supabase SQL Editor
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

### 2. Run Migration
```bash
npm run migrate-to-uuids
```

### 3. Verify Migration
```sql
-- Check record counts
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'aircraft', COUNT(*) FROM aircraft
UNION ALL SELECT 'flight_logs', COUNT(*) FROM flight_logs
UNION ALL SELECT 'airfields', COUNT(*) FROM airfields
UNION ALL SELECT 'base_management', COUNT(*) FROM base_management
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'user_company_relationships', COUNT(*) FROM user_company_relationships
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'invoice_clients', COUNT(*) FROM invoice_clients
UNION ALL SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL SELECT 'flight_hours', COUNT(*) FROM flight_hours
UNION ALL SELECT 'ppl_course_tranches', COUNT(*) FROM ppl_course_tranches
UNION ALL SELECT 'aircraft_hobbs', COUNT(*) FROM aircraft_hobbs
UNION ALL SELECT 'password_reset_tokens', COUNT(*) FROM password_reset_tokens;
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/migrate-all-to-uuids.sql` | Main migration script |
| `scripts/rollback-uuid-migration.sql` | Rollback script |
| `scripts/run-uuid-migration.js` | Migration runner |
| `src/types/uuid-types.ts` | New TypeScript types |
| `docs/UUID_MIGRATION_GUIDE.md` | Detailed guide |

## 🔧 Code Updates Required

### 1. Import New Types
```typescript
import { User, Aircraft, FlightLog, UUID } from '@/types/uuid-types';
```

### 2. Update ID References
```typescript
// Before
const userId: string = '12345';

// After
const userId: UUID = '550e8400-e29b-41d4-a716-446655440000';
```

### 3. Update Validation
```typescript
import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format');
const userSchema = z.object({
  id: uuidSchema.optional(),
  // ... other fields
});
```

## ⚠️ Rollback Commands

If migration fails:
```sql
-- Run in Supabase SQL Editor
-- Copy contents of scripts/rollback-uuid-migration.sql
```

## 🔍 Verification Checklist

- [ ] All tables migrated to UUID
- [ ] Foreign key relationships intact
- [ ] Indexes created for performance
- [ ] TypeScript interfaces updated
- [ ] API endpoints handle UUIDs
- [ ] Form validation updated
- [ ] Tests pass with UUIDs
- [ ] Frontend displays UUIDs correctly

## 📞 Emergency Contacts

- **Database Issues**: Check Supabase logs
- **Code Issues**: Review TypeScript compilation errors
- **Performance Issues**: Monitor query execution times
- **Rollback**: Use rollback script immediately

## 🎯 Migration Benefits

- ✅ Globally unique IDs
- ✅ Better security (no sequential exposure)
- ✅ Improved scalability
- ✅ Standard modern format
- ✅ Better database distribution 