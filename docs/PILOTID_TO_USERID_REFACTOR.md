# Refactor: pilotId to userId for Better Consistency

## Overview

This refactor addresses the redundancy between `pilotId` and `userID` in the `flight_logs` table. Currently, `pilotId` stores the same data as a user ID, creating unnecessary complexity.

## Problem

### Current Structure
```sql
-- flight_logs table
pilotId UUID  -- References users.id
instructorId UUID  -- References users.id
```

### Issues
1. **Redundancy**: `pilotId` is functionally identical to a user ID
2. **Confusion**: The name suggests it's a special pilot identifier, but it's just a user ID
3. **Inconsistency**: Other tables use `userId` for user references
4. **Performance**: Extra mapping steps in code

## Solution

### New Structure
```sql
-- flight_logs table (after refactor)
userId UUID  -- References users.id (renamed from pilotId)
instructorId UUID  -- References users.id (unchanged)
```

### Benefits
1. **Clarity**: `userId` clearly indicates it's a user reference
2. **Consistency**: Matches naming conventions in other tables
3. **Simplicity**: Eliminates confusion about what the field represents
4. **Performance**: Direct user ID usage without mapping

## Migration Process

### Step 1: Run the Migration Script
```bash
# Execute the migration script
psql -d your_database -f scripts/refactor-pilotId-to-userId.sql
```

### Step 2: Update Application Code
The following files need to be updated to use `userId` instead of `pilotId`:

#### API Routes
- `src/app/api/flight-logs/route.ts`
- `src/app/api/flight-logs/[id]/route.ts`
- `src/app/api/flight-logs/import/route.ts`
- `src/app/api/usage/route.ts`

#### Components
- `src/components/FlightLogs.tsx`

#### Types
- `src/types/uuid-types.ts`

### Step 3: Update Database Queries
All queries referencing `pilotId` need to be changed to `userId`:

```sql
-- Before
SELECT * FROM flight_logs WHERE "pilotId" = $1;

-- After
SELECT * FROM flight_logs WHERE "userId" = $1;
```

## Rollback Plan

If issues arise, use the rollback script:
```bash
psql -d your_database -f scripts/rollback-pilotId-refactor.sql
```

## Verification

After migration, verify:
1. All flight logs have `userId` populated
2. No orphaned records (userId references valid users)
3. RLS policies work correctly
4. Application functionality remains intact

## Impact Analysis

### Breaking Changes
- Database column rename: `pilotId` → `userId`
- API responses will use `userId` instead of `pilotId`
- Frontend components need updates

### Non-Breaking
- Data integrity preserved
- RLS policies maintain same security model
- Foreign key relationships preserved

## Timeline

1. **Development**: Update application code
2. **Testing**: Verify in development environment
3. **Migration**: Run database migration
4. **Deployment**: Deploy updated application
5. **Verification**: Confirm functionality

## Files Modified

### Database
- `scripts/refactor-pilotId-to-userId.sql` - Migration script
- `scripts/rollback-pilotId-refactor.sql` - Rollback script

### Application Code
- API routes using `pilotId`
- Components displaying flight log data
- Type definitions
- Database queries

## Security Considerations

- RLS policies updated to use `userId`
- Same access control maintained
- No security model changes

## Performance Impact

- **Positive**: Eliminates mapping overhead
- **Neutral**: Index performance similar
- **Positive**: Clearer code reduces cognitive load

## Testing Checklist

- [ ] Flight logs display correctly
- [ ] Flight log creation works
- [ ] Flight log editing works
- [ ] Flight log filtering works
- [ ] Usage calculations work
- [ ] RLS policies enforce access control
- [ ] API responses contain correct field names
- [ ] No data loss during migration
