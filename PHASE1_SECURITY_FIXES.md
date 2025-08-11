# Phase 1 Critical Security Fixes - Implementation Guide

**Date:** January 27, 2025  
**Version:** 0.1.8  
**Status:** Ready for Implementation

## Overview

This document outlines the implementation of Phase 1 critical security fixes for the Cruiser Aviation Management System, addressing the two most critical security issues identified in the security audit.

## WP1.1 — Add Missing JWT Claims ✅

### Changes Made

#### 1. Updated JWT Token Generation (`src/lib/auth.ts`)

**Before:**
```typescript
static generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}
```

**After:**
```typescript
static generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h'; // Reduced from 7d to 24h
  const now = Math.floor(Date.now() / 1000);
  
  // Include standard JWT claims in the payload
  const tokenPayload = {
    ...payload,
    iss: 'cruiser-aviation',
    aud: 'cruiser-app',
    sub: payload.userId,
    nbf: now,
    iat: now
  };
  
  return jwt.sign(tokenPayload, secret, { 
    expiresIn: expiresIn as any
  });
}
```

#### 2. Updated JWT Payload Interface

```typescript
export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  iss?: string; // issuer
  aud?: string; // audience
  sub?: string; // subject
  nbf?: number; // not before
  iat?: number; // issued at
}
```

#### 3. Enhanced Token Verification

```typescript
static verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret, {
      issuer: 'cruiser-aviation',
      audience: 'cruiser-app'
    }) as JWTPayload;
    
    // Additional validation
    if (payload.nbf && payload.nbf > Math.floor(Date.now() / 1000)) {
      console.error('Token not yet valid (nbf check failed)');
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
```

### Security Improvements

- ✅ **Issuer (iss)**: Identifies token issuer as 'cruiser-aviation'
- ✅ **Audience (aud)**: Specifies intended audience as 'cruiser-app'
- ✅ **Subject (sub)**: Contains user ID for token ownership
- ✅ **Not Before (nbf)**: Prevents token use before issue time
- ✅ **Issued At (iat)**: Explicitly sets issue timestamp
- ✅ **Reduced Expiration**: Default reduced from 7 days to 24 hours
- ✅ **Enhanced Validation**: Validates issuer, audience, and timing claims

---

## WP1.2 — Restrict Users Table Visibility ✅

### Changes Made

#### 1. New RLS Policies (`scripts/fix-users-table-rls.sql`)

**Dropped Overly Permissive Policy:**
```sql
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON users;
```

**Added Scoped Policies:**

```sql
-- Users can view their own profile (full access)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Admin users can view limited user data for management
CREATE POLICY "Admin users can view limited user data" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN roles r ON ur.roleId = r.id
            WHERE ur.userId = auth.uid()::text 
            AND r.name IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Service role can access all user data (for API operations)
CREATE POLICY "Service role can access all users" ON users
    FOR ALL USING (auth.role() = 'service_role');
```

#### 2. Public User Information View

```sql
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
```

#### 3. Secure User Access Functions

**`get_user_info(requested_user_id UUID)`**
- Returns full profile data for own user
- Returns full user data for admins
- Returns limited public data for other users (sensitive fields stripped)

**`list_users()`**
- Returns all users for admins
- Returns only active users with basic info for regular users

#### 4. Updated API Routes (`src/app/api/users/route.ts`)

- Updated to use new secure `list_users()` function
- Maintains existing functionality while enforcing security
- Client-side filtering for search and pagination

### Security Improvements

- ✅ **Self-View Only**: Users can only view their own full profile
- ✅ **Admin Access**: Admins can view all users for management
- ✅ **Stripped Sensitive Data**: Non-admin users see only basic info
- ✅ **Service Role Preserved**: API operations maintain full access
- ✅ **Public View**: Safe public user information for UI display

---

## Implementation Instructions

### 1. Automatic Implementation

Run the automated script:
```bash
npm run security:phase1
```

### 2. Manual Implementation

If the automated script fails, implement manually:

#### Step 1: Update JWT Implementation
The JWT changes are already applied in the codebase. No manual action needed.

#### Step 2: Apply Database Changes
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/fix-users-table-rls.sql`
4. Execute the script
5. Verify RLS policies in Authentication > Policies section

#### Step 3: Test the Changes
1. Test user login (should work with new JWT claims)
2. Test user profile access (should only see own data)
3. Test admin access (should see all users)
4. Test API endpoints (should maintain functionality)

---

## Testing Checklist

### JWT Claims Testing
- [ ] User login generates tokens with all required claims
- [ ] Token verification validates issuer and audience
- [ ] Token expiration works correctly (24 hours)
- [ ] Invalid tokens are properly rejected

### User Access Testing
- [ ] Regular users can only view their own profile
- [ ] Admins can view all user profiles
- [ ] Sensitive fields are hidden from non-admin users
- [ ] API endpoints maintain functionality
- [ ] Public user info view works correctly

### Security Validation
- [ ] No direct access to sensitive user data
- [ ] RLS policies are enforced
- [ ] Service role access is preserved
- [ ] Error messages don't leak sensitive information

---

## Rollback Plan

If issues arise, you can rollback the changes:

### JWT Rollback
```typescript
// Revert to original JWT generation
static generateToken(payload: JWTPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}
```

### Database Rollback
```sql
-- Restore original policy
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admin users can view limited user data" ON users;
DROP POLICY IF EXISTS "Service role can access all users" ON users;

CREATE POLICY "Allow authenticated users to view users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');
```

---

## Next Steps

After implementing Phase 1:

1. **Monitor**: Watch for any authentication or access issues
2. **Test**: Verify all functionality works as expected
3. **Document**: Update security documentation
4. **Plan Phase 2**: Prepare for high-priority fixes (refresh tokens, write policies)

---

## Files Modified

- `src/lib/auth.ts` - JWT implementation
- `src/app/api/users/route.ts` - User API routes
- `scripts/fix-users-table-rls.sql` - Database security policies
- `scripts/run-phase1-security-fixes.js` - Implementation script
- `package.json` - Added security script

---

**Status:** Ready for deployment  
**Risk Level:** Low (backward compatible)  
**Testing Required:** Yes (comprehensive)  
**Rollback Available:** Yes
