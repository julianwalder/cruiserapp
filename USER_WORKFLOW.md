# User Workflow & Status Management

## 🎯 **User Registration & Status Flow**

### **1. New User Registration**
- **Status**: `ACTIVE` ✅
- **Role**: `PROSPECT` 
- **Can Login**: ✅ Yes
- **Message**: Welcome message with guidance for document validation

### **2. Document Validation Process**
Users start as `PROSPECT` and upgrade based on document validation:

| Current Role | Target Role | Required Documents |
|--------------|-------------|-------------------|
| `PROSPECT` | `PILOT` | Pilot License, Medical Certificate |
| `PROSPECT` | `STUDENT` | Student Enrollment, Medical Certificate |
| `PROSPECT` | `INSTRUCTOR` | Instructor Certification, Medical Certificate |

### **3. User Status Types**

#### **ACTIVE** ✅
- **New enrollments**: `ACTIVE` + `PROSPECT`
- **Validated users**: `ACTIVE` + `PILOT`/`STUDENT`/`INSTRUCTOR`
- **Can login**: ✅ Yes
- **Access**: Full system access based on role

#### **INACTIVE** ❌
- **Suspended accounts**: Manual suspension by admin
- **Revoked accounts**: Due to violations
- **Can login**: ✅ Yes, but with suspension message
- **Message**: "Your account has been suspended. Please contact an administrator for reactivation."

## 🔄 **Login Response Examples**

### **Prospect User (New Enrollment)**
```json
{
  "message": "Login successful",
  "user": { /* user data */ },
  "token": "jwt-token",
  "prospectGuidance": "Welcome! Please complete your document validation to upgrade your account status."
}
```

### **Inactive User (Suspended)**
```json
{
  "error": "Your account has been suspended. Please contact an administrator for reactivation.",
  "status": "INACTIVE",
  "userId": "user-id"
}
```

### **Active User (Pilot/Student/Instructor)**
```json
{
  "message": "Login successful",
  "user": { /* user data */ },
  "token": "jwt-token"
}
```

## 🧪 **Testing Commands**

```bash
# Test all user login scenarios
npm run test-user-login-scenarios

# Test email functionality
npm run test-password-reset-email
```

## 📋 **Environment Variables for Testing**

Add these to your `.env.local` for testing:

```env
# Test user credentials
TEST_INACTIVE_USER_EMAIL=inactive@example.com
TEST_INACTIVE_USER_PASSWORD=password123

TEST_PROSPECT_USER_EMAIL=prospect@example.com
TEST_PROSPECT_USER_PASSWORD=password123

TEST_ACTIVE_USER_EMAIL=active@example.com
TEST_ACTIVE_USER_PASSWORD=password123
```

## 🔧 **Admin Actions**

### **Activate User** (INACTIVE → ACTIVE)
- **API**: `POST /api/users/[id]/activate`
- **Permission**: ADMIN, SUPER_ADMIN, BASE_MANAGER
- **Use case**: Reactivate suspended accounts

### **Change User Role** (PROSPECT → PILOT/STUDENT/INSTRUCTOR)
- **API**: `PUT /api/users/[id]`
- **Permission**: ADMIN, SUPER_ADMIN, BASE_MANAGER
- **Use case**: After document validation

### **Suspend User** (ACTIVE → INACTIVE)
- **API**: `PUT /api/users/[id]`
- **Permission**: ADMIN, SUPER_ADMIN, BASE_MANAGER
- **Use case**: Account violations, payment issues

## 🎯 **Key Benefits**

1. **Clear User Journey**: New users can immediately access the system
2. **Guided Progression**: Prospect users get clear guidance on next steps
3. **Flexible Suspension**: Inactive users can still attempt login with clear messaging
4. **Role-Based Access**: Proper role hierarchy and permissions
5. **Admin Control**: Full control over user status and role changes 