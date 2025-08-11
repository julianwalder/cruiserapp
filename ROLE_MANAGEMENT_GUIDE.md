# Role Management System Guide

## 🔐 **Overview**

The Role Management System provides a comprehensive capability matrix for managing user permissions across the application. It includes granular control over menu access, data operations, and API endpoints.

## 🏗️ **System Architecture**

### **Core Components**

1. **Menu Items Table** (`menu_items`)
   - Defines navigation structure
   - Hierarchical menu organization
   - Access control integration

2. **Capabilities Table** (`capabilities`)
   - Defines system permissions
   - Resource-based access control
   - Action-based permissions

3. **Role Capabilities Table** (`role_capabilities`)
   - Links roles to capabilities
   - Junction table for many-to-many relationship
   - Audit trail for permission changes

### **Permission Types**

#### **Menu Access Capabilities**
- `dashboard.view` - View Dashboard
- `community-board.view` - View Community Board
- `community-board.create` - Create Community Posts
- `flight-logs.view` - View Flight Logs
- `fleet.view` - View Fleet
- And many more...

#### **Data Access Capabilities**
- `data.users.view` - View User Data
- `data.users.edit` - Edit User Data
- `data.flight-logs.view` - View Flight Log Data
- `data.aircraft.edit` - Edit Aircraft Data
- And many more...

#### **API Access Capabilities**
- `api.users.read` - Read Users API
- `api.users.write` - Write Users API
- `api.flight-logs.read` - Read Flight Logs API
- And many more...

## 🚀 **Implementation Steps**

### **Step 1: Database Setup**

Execute the role management SQL script:
```sql
-- Copy and paste contents of scripts/role-management-setup.sql
-- Execute in Supabase SQL Editor
```

### **Step 2: Test the System**

Run the test script to verify everything is working:
```bash
node scripts/test-role-management.js
```

### **Step 3: Access the Management Interface**

Navigate to `/role-management` in your application to access the capability matrix.

## 🎯 **Using the Role Management Interface**

### **Creating Roles**

1. Click "Create Role" button
2. Enter role name (e.g., "PILOT", "INSTRUCTOR")
3. Add description
4. Click "Create Role"

### **Managing Capabilities**

1. Select a role from the left panel
2. View capabilities organized by:
   - **Menu Access**: Navigation permissions
   - **Data Access**: Database operation permissions
   - **API Access**: API endpoint permissions

3. Toggle capabilities using checkboxes:
   - ✅ **Granted**: User has this permission
   - ❌ **Not Granted**: User lacks this permission

### **Capability Matrix Features**

- **Visual Organization**: Capabilities grouped by resource type
- **Color-coded Actions**: Different colors for different action types
- **Real-time Updates**: Changes applied immediately
- **Bulk Operations**: Update multiple capabilities at once

## 🔧 **API Endpoints**

### **Role Management**

- `GET /api/roles` - List all roles
- `POST /api/roles` - Create new role

### **Capability Management**

- `GET /api/roles/{id}/capabilities` - Get role capabilities
- `PUT /api/roles/{id}/capabilities` - Update role capabilities

## 💻 **Code Integration**

### **Server-side Capability Checking**

```typescript
import { CapabilityService } from '@/lib/capabilities';

// Check if user has specific capability
const canEditUsers = await CapabilityService.hasCapability(userId, 'users.edit');

// Check if user can access menu
const canAccessDashboard = await CapabilityService.canAccessMenu(userId, '/dashboard');

// Check if user can perform data operation
const canViewFlightLogs = await CapabilityService.canAccessData(userId, 'flight-logs', 'view');
```

### **Client-side Capability Checking**

```typescript
import { useCapabilities } from '@/lib/capabilities';

function MyComponent() {
  const { hasCapability, canAccessMenu, canPerformAction } = useCapabilities();

  // Check capabilities
  const canEditUsers = hasCapability('users.edit');
  const canAccessDashboard = canAccessMenu('/dashboard');
  const canCreatePosts = canPerformAction('community-board', 'create');

  return (
    <div>
      {canEditUsers && <EditUserButton />}
      {canAccessDashboard && <DashboardLink />}
      {canCreatePosts && <CreatePostButton />}
    </div>
  );
}
```

### **Initializing Capabilities**

```typescript
import { ClientCapabilityService } from '@/lib/capabilities';

// Initialize on user login
await ClientCapabilityService.initialize(userId);

// Clear on logout
ClientCapabilityService.clear();
```

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
- All tables protected by RLS policies
- Users can only access their own data
- Admins can access all data
- Service role bypasses RLS for API operations

### **Capability Validation**
- Server-side validation of all permissions
- Client-side caching for performance
- Automatic capability checking on API calls

### **Audit Trail**
- All capability changes logged
- User tracking for permission modifications
- Timestamp and reason for changes

## 📊 **Capability Matrix Structure**

### **Menu Access (Navigation)**
```
dashboard.view          - View Dashboard
community-board.view    - View Community Board
community-board.create  - Create Posts
community-board.edit    - Edit Posts
community-board.delete  - Delete Posts
flight-logs.view        - View Flight Logs
fleet.view             - View Fleet
scheduling.view        - View Scheduling
reports.view           - View Reports
users.view             - View Users
airfields.view         - View Airfields
bases.view             - View Bases
billing.view           - View Billing
orders.view            - View Orders
packages.view          - View Packages
usage.view             - View Usage
settings.view          - View Settings
my-account.view        - View My Account
notifications.view     - View Notifications
```

### **Data Access (Database Operations)**
```
data.users.view        - View User Data
data.users.edit        - Edit User Data
data.users.delete      - Delete User Data
data.flight-logs.view  - View Flight Log Data
data.flight-logs.edit  - Edit Flight Log Data
data.flight-logs.delete - Delete Flight Log Data
data.aircraft.view     - View Aircraft Data
data.aircraft.edit     - Edit Aircraft Data
data.aircraft.delete   - Delete Aircraft Data
data.airfields.view    - View Airfield Data
data.airfields.edit    - Edit Airfield Data
data.airfields.delete  - Delete Airfield Data
data.bases.view        - View Base Data
data.bases.edit        - Edit Base Data
data.bases.delete      - Delete Base Data
```

### **API Access (Endpoint Permissions)**
```
api.users.read         - Read Users API
api.users.write        - Write Users API
api.flight-logs.read   - Read Flight Logs API
api.flight-logs.write  - Write Flight Logs API
api.aircraft.read      - Read Aircraft API
api.aircraft.write     - Write Aircraft API
api.airfields.read     - Read Airfields API
api.airfields.write    - Write Airfields API
api.bases.read         - Read Bases API
api.bases.write        - Write Bases API
```

## 🎨 **UI Features**

### **Visual Design**
- **Clean Interface**: Modern, intuitive design
- **Color Coding**: Different colors for different action types
- **Responsive Layout**: Works on all screen sizes
- **Loading States**: Clear feedback during operations

### **User Experience**
- **Real-time Updates**: Immediate feedback on changes
- **Bulk Operations**: Update multiple permissions at once
- **Search and Filter**: Easy navigation of large capability sets
- **Keyboard Shortcuts**: Power user features

## 🔄 **Workflow Examples**

### **Creating a Pilot Role**

1. **Create Role**: "PILOT"
2. **Assign Menu Capabilities**:
   - ✅ `dashboard.view`
   - ✅ `community-board.view`
   - ✅ `community-board.create`
   - ✅ `flight-logs.view`
   - ✅ `flight-logs.create`
   - ✅ `fleet.view`
   - ❌ `users.view` (no user management)
   - ❌ `reports.view` (no reporting access)

3. **Assign Data Capabilities**:
   - ✅ `data.flight-logs.view`
   - ✅ `data.flight-logs.edit`
   - ✅ `data.aircraft.view`
   - ❌ `data.users.view` (no user data access)

4. **Assign API Capabilities**:
   - ✅ `api.flight-logs.read`
   - ✅ `api.flight-logs.write`
   - ✅ `api.aircraft.read`
   - ❌ `api.users.read` (no user API access)

### **Creating an Instructor Role**

1. **Create Role**: "INSTRUCTOR"
2. **Assign All Pilot Capabilities** (inheritance)
3. **Add Additional Capabilities**:
   - ✅ `users.view` (can view students)
   - ✅ `reports.view` (can view reports)
   - ✅ `data.users.view` (can view user data)
   - ✅ `api.users.read` (can access user API)

### **Creating an Admin Role**

1. **Create Role**: "ADMIN"
2. **Grant All Capabilities** (full access)
3. **Special Considerations**:
   - Can manage all users
   - Can access all data
   - Can use all API endpoints
   - Can manage roles and capabilities

## 🚨 **Best Practices**

### **Role Design**
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Role Hierarchy**: Design roles with clear progression
- **Descriptive Names**: Use clear, meaningful role names
- **Documentation**: Document role purposes and responsibilities

### **Security**
- **Regular Audits**: Review permissions periodically
- **Temporary Access**: Use time-limited permissions when needed
- **Monitoring**: Track permission changes and usage
- **Testing**: Test permissions thoroughly before deployment

### **Performance**
- **Client-side Caching**: Cache capabilities for performance
- **Lazy Loading**: Load capabilities as needed
- **Optimization**: Minimize database queries
- **Indexing**: Ensure proper database indexing

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Capabilities Not Loading**
   - Check database connection
   - Verify RLS policies
   - Check user authentication

2. **Permission Denied Errors**
   - Verify capability assignments
   - Check role assignments
   - Review RLS policies

3. **Performance Issues**
   - Check database indexes
   - Optimize capability queries
   - Use client-side caching

### **Debug Tools**

- **Test Script**: `node scripts/test-role-management.js`
- **Database Queries**: Direct SQL queries for debugging
- **Logs**: Check application logs for errors
- **Network Tab**: Monitor API calls in browser

## 📚 **Additional Resources**

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Capability-Based Security](https://en.wikipedia.org/wiki/Capability-based_security)
