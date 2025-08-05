# My Account Feature Setup Guide

## Overview
This guide sets up the "My Account" feature for your aviation management system using a **separate table approach** for better database design and maintainability.

## Prerequisites
- ✅ Supabase project with existing `users` table
- ✅ Existing `roles` table with roles: PROSPECT, STUDENT, PILOT, INSTRUCTOR, BASE_MANAGER, ADMIN, SUPER_ADMIN
- ✅ Existing `user_roles` table for role assignments
- ✅ Supabase environment variables configured

## What This Setup Does

### 🗄️ **Database Schema Changes**
1. **Creates `user_profile` table** - Stores My Account specific data (identity verification, onboarding status, preferences)
2. **Creates `user_onboarding` table** - Tracks onboarding progress for role transitions
3. **Creates `user_documents` table** - Manages uploaded documents (licenses, certificates, contracts)
4. **Creates `payment_plans` table** - Defines student payment options
5. **Creates `hour_packages` table** - Defines pilot hour packages
6. **Creates `user_payment_plans` table** - Links users to their selected plans/packages

### 🔐 **Security & Performance**
- **Row Level Security (RLS)** policies for all new tables
- **Automatic triggers** for profile creation and timestamp updates
- **Database indexes** for optimal query performance
- **Data validation** with CHECK constraints

### 🎯 **User Experience**
- **Automatic profile creation** when new users register
- **Role assignment** for users without roles (if PROSPECT role exists)
- **Easy data access** via `user_with_profile` view

## Setup Instructions

### Option 1: Manual SQL Execution (Recommended)

1. **Open your Supabase Dashboard**
   - Go to your project's SQL Editor

2. **Run the SQL Script**
   - Copy and paste the contents of `scripts/my-account-setup-separate-table.sql`
   - Execute the script

3. **Verify Setup**
   - Check that all tables were created successfully
   - Verify RLS policies are in place
   - Confirm default payment plans and hour packages were inserted

### Option 2: Using the Setup Script

1. **Create `.env.local` file** (if not exists):
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Run the setup script**:
   ```bash
   node scripts/setup-my-account-schema.js
   ```

## Expected Output

After running the setup, you should see:

```
My Account feature setup completed successfully!
Created tables: user_profile, user_onboarding, user_documents, payment_plans, hour_packages, user_payment_plans
Added RLS policies and triggers for automatic profile creation
Created user_with_profile view for easy data access
```

## Database Schema Overview

### Core Tables

#### `user_profile`
- Stores My Account specific user data
- One record per user (1:1 relationship)
- Includes identity verification, onboarding status, preferences

#### `user_onboarding`
- Tracks onboarding progress for role transitions
- Supports both STUDENT and PILOT onboarding flows
- Maintains step-by-step progress

#### `user_documents`
- Manages all user-uploaded documents
- Supports various document types (licenses, certificates, contracts)
- Includes expiry tracking and verification status

#### `payment_plans` & `hour_packages`
- Predefined payment options for students and pilots
- Includes pricing, discounts, and validity periods

#### `user_payment_plans`
- Links users to their selected payment plans or hour packages
- Tracks payment status and remaining amounts

## Benefits of Separate Table Approach

### ✅ **Advantages**
- **Clean separation** of concerns
- **Flexible schema** - Easy to add new profile fields
- **Better performance** - Smaller users table
- **Feature isolation** - My Account features are self-contained
- **Easier migrations** - No need to modify existing users table

### 🔄 **Data Access**
- Use `user_with_profile` view for combined user data
- Direct table access for specific features
- Automatic profile creation via triggers

## Next Steps

1. **Test the setup** by visiting `/test-my-account`
2. **Implement frontend components** using the provided TypeScript interfaces
3. **Add API endpoints** for My Account functionality
4. **Integrate with Veriff** for identity verification
5. **Connect to SmartBill** for invoicing

## Troubleshooting

### Common Issues

**"Table already exists" errors**
- The script uses `CREATE TABLE IF NOT EXISTS` - this is normal
- Existing data will be preserved

**RLS policy errors**
- Ensure you're authenticated when testing
- Check that policies are created correctly

**Trigger errors**
- Verify the `create_user_profile()` function exists
- Check that triggers are properly attached

### Support
If you encounter issues, check:
1. Supabase logs in the dashboard
2. Database schema in the Table Editor
3. RLS policies in the Authentication section

---

**Note**: This setup uses the recommended separate table approach for better database design and maintainability. 