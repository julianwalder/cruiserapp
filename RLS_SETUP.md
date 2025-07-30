# Row Level Security (RLS) Setup Guide

This guide explains how Row Level Security (RLS) is set up in your Cruiser Aviation Management System.

## 🔒 What is Row Level Security?

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows users can access in database tables. Without RLS enabled, all users can potentially access all data in your tables, which is a security risk.

## 📋 Tables with RLS Enabled

The following tables in your system have RLS enabled:

- `users` - User accounts and profiles
- `roles` - User roles and permissions  
- `user_roles` - Many-to-many relationship between users and roles
- `aircraft` - Aircraft inventory and specifications
- `flight_logs` - Flight records and training data
- `airfields` - Airfield information and operational areas
- `base_management` - Base management and assignments
- `_prisma_migrations` - Database migrations (service role only)
- `sessions` - User sessions (service role only)
- `operational_areas` - Operational area definitions
- `airfield_backups` - Airfield backup data
- `icao_reference_type` - ICAO aircraft type references
- `fleet_management` - Fleet management data
- `password_reset_tokens` - Password reset functionality

## 🚀 Setup (Already Complete)

RLS has been successfully set up using the complete setup script. If you need to re-run the setup:

```bash
npm run setup-rls
```

This will execute `scripts/setup-rls-complete.sql` which enables RLS on all tables.

## 🔐 Security Policies

The RLS setup provides:

- **Service role access** for API operations and system tables
- **Authenticated user access** for viewing operational data
- **Basic security** for all tables
- **No more Supabase security warnings**

## ✅ Status

✅ **RLS Setup Complete** - All tables have Row Level Security enabled
✅ **Security Warnings Resolved** - No more "RLS Disabled in Public" errors
✅ **Application Functionality Maintained** - All API endpoints continue to work

---

**Note:** Your Cruiser Aviation Management System now follows security best practices with proper Row Level Security enabled on all tables. 