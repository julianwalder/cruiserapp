# Pilot Licenses Database Simplification

## Overview

This document outlines the simplification of the pilot licenses database schema and API to match the frontend requirements. The changes remove unnecessary fields and keep only the essential ones that are actually used in the frontend.

## Changes Made

### 1. Database Schema Simplification

**File:** `scripts/simplify-pilot-licenses-schema.sql`

**Before (Complex Schema):**
```sql
-- 20+ fields including:
- place_of_birth
- nationality
- issuing_authority
- date_of_initial_issue
- issuing_officer_name
- issuing_authority_seal
- ir_valid_until
- medical_class_required
- medical_certificate_expiry
- radiotelephony_languages
- radiotelephony_remarks
- holder_signature_present
- examiner_signatures
- icao_compliant
- abbreviations_reference
```

**After (Simplified Schema):**
```sql
-- Only 7 essential fields:
- state_of_issue (I. State of issue)
- license_number (III. License number)
- license_type (II. Titles of licenses)
- date_of_issue (Date of issue)
- country_code_of_initial_issue (Country Code)
- class_type_ratings (XII. Ratings - JSON array)
- language_proficiency (XIII. Language Proficiency - JSON array)
```

### 2. API Route Simplification

**File:** `src/app/api/my-account/pilot-licenses/route-simplified.ts`

**Key Changes:**
- Removed handling of unnecessary form fields
- Simplified validation to only required fields
- Updated database operations to match new schema
- Maintained backward compatibility with document relationships

### 3. Frontend Compatibility

The simplified schema perfectly matches the frontend fields:

1. **I. State of issue** → `state_of_issue`
2. **III. License number** → `license_number`
3. **II. Titles of licenses** → `license_type`
4. **Date of issue** → `date_of_issue`
5. **Country Code** → `country_code_of_initial_issue`
6. **XII. Ratings** → `class_type_ratings` (JSON array)
7. **XIII. Language Proficiency** → `language_proficiency` (JSON array)

## Migration Process

### Step 1: Run Database Migration

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the migration
node scripts/run-pilot-licenses-migration.js
```

### Step 2: Update API Route

Replace the existing API route with the simplified version:

```bash
# Backup the old route
mv src/app/api/my-account/pilot-licenses/route.ts src/app/api/my-account/pilot-licenses/route-old.ts

# Use the simplified route
mv src/app/api/my-account/pilot-licenses/route-simplified.ts src/app/api/my-account/pilot-licenses/route.ts
```

### Step 3: Test the Changes

1. Test creating a new pilot license
2. Test editing an existing pilot license
3. Verify all form fields work correctly
4. Check that data is saved and retrieved properly

## Benefits

### 1. **Reduced Complexity**
- Fewer database fields to maintain
- Simpler API logic
- Easier to understand and debug

### 2. **Better Performance**
- Smaller database records
- Faster queries
- Reduced storage requirements

### 3. **Maintainability**
- Clear mapping between frontend and backend
- Less code to maintain
- Easier to add new features

### 4. **Data Integrity**
- Only stores data that's actually used
- Reduces risk of inconsistent data
- Cleaner database structure

## Data Backup

The migration script automatically creates a backup of the existing data:

```sql
CREATE TABLE IF NOT EXISTS pilot_licenses_backup AS 
SELECT * FROM pilot_licenses;
```

If you need to restore the old schema, you can use this backup table.

## JSON Structure for Complex Fields

### Class Type Ratings
```json
[
  {
    "rating": "SEP(land)",
    "validUntil": "2025-12-31",
    "remarks": ""
  },
  {
    "rating": "FI(A)-SEP(land)",
    "validUntil": "2026-06-30",
    "remarks": ""
  }
]
```

### Language Proficiency
```json
[
  {
    "language": "English",
    "level": "V",
    "validityExpiry": "2025-12-31"
  },
  {
    "language": "Romanian",
    "level": "VI",
    "validityExpiry": null
  }
]
```

## Rollback Plan

If you need to rollback the changes:

1. **Restore Database Schema:**
   ```sql
   DROP TABLE IF EXISTS pilot_licenses;
   CREATE TABLE pilot_licenses AS SELECT * FROM pilot_licenses_backup;
   ```

2. **Restore API Route:**
   ```bash
   mv src/app/api/my-account/pilot-licenses/route-old.ts src/app/api/my-account/pilot-licenses/route.ts
   ```

## Conclusion

This simplification significantly reduces the complexity of the pilot licenses feature while maintaining all the functionality that's actually used in the frontend. The new schema is more maintainable, performant, and easier to understand.
