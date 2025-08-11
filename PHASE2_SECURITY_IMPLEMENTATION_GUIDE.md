# Phase 2 Security Implementation Guide

## 🔒 **Overview**

Phase 2 implements advanced security features including refresh token management, write policies for operational tables, and reduced token lifetime.

## 📋 **Work Packages Implemented**

### **WP2.1 — Reduce Token Lifetime** ✅
- **Status**: Implemented
- **Changes**: JWT tokens now expire in 24 hours (reduced from 7 days)
- **Location**: `src/lib/auth.ts` - `generateToken()` method
- **Configuration**: `JWT_EXPIRES_IN=24h` in environment variables

### **WP2.2 — Add Missing Write Policies** ✅
- **Status**: Implemented
- **Tables Covered**: `aircraft`, `flight_logs`, `airfields`, `base_management`
- **Policy Types**: SELECT, INSERT, UPDATE, DELETE
- **Scope**: Role-based and organization-based access control
- **Location**: `scripts/phase2-write-policies.sql`

### **WP2.3 — Implement Refresh Token Flow** ✅
- **Status**: Implemented
- **Features**: Token rotation, revocation, session management
- **Location**: `scripts/phase2-refresh-tokens.sql` and `src/lib/auth.ts`

## 🚀 **Implementation Steps**

### **Step 1: Apply Database Changes**

1. **Execute Write Policies SQL:**
   ```sql
   -- Copy and paste contents of scripts/phase2-write-policies.sql
   -- Execute in Supabase SQL Editor
   ```

2. **Execute Refresh Tokens SQL:**
   ```sql
   -- Copy and paste contents of scripts/phase2-refresh-tokens.sql
   -- Execute in Supabase SQL Editor
   ```

### **Step 2: Update Environment Variables**

Ensure your `.env.local` has:
```env
JWT_EXPIRES_IN=24h
```

### **Step 3: Test Implementation**

Run the Phase 2 test script:
```bash
node scripts/test-phase2-security.js
```

## 🔧 **New API Endpoints**

### **Refresh Token Management**

1. **POST `/api/auth/refresh`**
   - **Purpose**: Refresh access tokens using refresh tokens
   - **Body**: `{ refreshToken, userId }`
   - **Response**: `{ accessToken, refreshToken, message }`

2. **POST `/api/auth/revoke`**
   - **Purpose**: Revoke a specific refresh token
   - **Body**: `{ refreshToken, reason? }`
   - **Response**: `{ message }`

3. **GET `/api/auth/sessions`**
   - **Purpose**: Get user's active sessions
   - **Response**: `{ sessions[], totalSessions }`

4. **DELETE `/api/auth/sessions`**
   - **Purpose**: Revoke all user sessions
   - **Body**: `{ reason? }`
   - **Response**: `{ message, revokedCount }`

## 🔐 **Security Features**

### **Token Management**
- **Access Tokens**: 24-hour lifetime with JWT ID tracking
- **Refresh Tokens**: 30-day lifetime with rotation
- **Token Rotation**: New refresh token issued with each refresh
- **Revocation**: Immediate token invalidation

### **Write Policies**

#### **Aircraft Table**
- **View**: Service role, admins, organization members
- **Insert**: Service role, admins, organization members
- **Update**: Service role, admins, organization members
- **Delete**: Service role, admins only

#### **Flight Logs Table**
- **View**: Service role, admins, own logs, organization logs
- **Insert**: Service role, admins, own logs, organization aircraft
- **Update**: Service role, admins, own logs, organization logs
- **Delete**: Service role, admins only

#### **Airfields Table**
- **View**: All authenticated users (public data)
- **Insert**: Service role, admins only
- **Update**: Service role, admins only
- **Delete**: Service role, admins only

#### **Base Management Table**
- **View**: Service role, admins, organization members
- **Insert**: Service role, admins, organization members
- **Update**: Service role, admins, organization members
- **Delete**: Service role, admins only

## 🧪 **Testing Checklist**

### **Database Tests**
- [ ] Refresh tokens table exists and accessible
- [ ] Write policies applied to all operational tables
- [ ] Refresh token functions working
- [ ] RLS policies enforcing access control

### **API Tests**
- [ ] Login returns both access and refresh tokens
- [ ] Token refresh endpoint works
- [ ] Token revocation works
- [ ] Session management works

### **Security Tests**
- [ ] Users can only access their organization's data
- [ ] Admins can access all data
- [ ] Token rotation prevents replay attacks
- [ ] Revoked tokens are invalid

## 🔄 **Token Flow**

### **Login Flow**
1. User submits credentials
2. System validates credentials
3. System generates access token (24h) + refresh token (30d)
4. System stores refresh token hash in database
5. System returns both tokens to client

### **Token Refresh Flow**
1. Client sends refresh token + user ID
2. System validates refresh token
3. System generates new access token
4. System revokes old refresh token
5. System generates new refresh token
6. System returns new tokens to client

### **Token Revocation Flow**
1. Client sends refresh token to revoke
2. System marks token as revoked in database
3. System returns success response
4. Token becomes immediately invalid

## 🛡️ **Security Benefits**

### **Reduced Attack Surface**
- Short-lived access tokens limit exposure
- Token rotation prevents replay attacks
- Immediate revocation capability

### **Granular Access Control**
- Organization-based data isolation
- Role-based permissions
- Principle of least privilege

### **Audit Trail**
- Token usage tracking
- Session management
- Revocation logging

## 📝 **Migration Notes**

### **Backward Compatibility**
- Existing tokens will continue to work until expiration
- New logins will use the refresh token system
- Old session management is deprecated

### **Client Updates Required**
- Store refresh tokens securely
- Implement token refresh logic
- Handle token expiration gracefully

## 🚨 **Important Notes**

1. **Token Storage**: Refresh tokens should be stored securely (httpOnly cookies recommended)
2. **Token Rotation**: Each refresh generates new tokens (old refresh token becomes invalid)
3. **Revocation**: Revoked tokens are immediately invalid
4. **Cleanup**: Expired tokens are automatically cleaned up

## 🔍 **Monitoring**

### **Key Metrics**
- Token refresh frequency
- Failed refresh attempts
- Revoked token count
- Active session count

### **Alerts**
- Unusual token refresh patterns
- Multiple failed refresh attempts
- High revocation rates

## 📚 **Additional Resources**

- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Refresh Token Security](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
