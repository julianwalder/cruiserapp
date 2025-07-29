# Password Reset Service Setup Guide

This guide will help you set up the password reset functionality for your Cruiser Aviation application.

## Overview

The password reset service includes:
- Secure token generation and validation
- Email notifications with beautiful HTML templates
- Database storage with Row Level Security (RLS)
- Automatic cleanup of expired tokens
- Frontend pages for user interaction

## Prerequisites

- Supabase project with authentication enabled
- Email service (Gmail SMTP recommended)
- Environment variables configured

## Step 1: Database Setup

### Automatic Setup (Recommended)

Run the automated setup script:

```bash
npm run setup-password-reset
```

This script will:
- Create the `password_reset_tokens` table
- Set up indexes for performance
- Configure Row Level Security (RLS) policies
- Create cleanup functions

### Manual Setup

If the automatic setup fails, manually execute the SQL script:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/setup-password-reset.sql`
4. Execute the script

## Step 2: Email Service Configuration

### Gmail SMTP Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. **Configure Environment Variables**:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Other Email Providers

You can configure other SMTP providers by updating the environment variables:

```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email
SMTP_PASS=your-password
FROM_EMAIL=your-email
```

## Step 3: Environment Variables

Add these variables to your `.env.local` file and Vercel:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# Development Email (Optional)
ETHEREAL_USER=test@ethereal.email
ETHEREAL_PASS=test123
```

## Step 4: Testing

### Test Email Configuration

Run the email test script:

```bash
npm run test-email
```

This will send a test email to verify your configuration.

### Test Password Reset Flow

1. Go to `/forgot-password`
2. Enter a valid email address
3. Check your email for the reset link
4. Click the link to go to `/reset-password`
5. Enter a new password
6. Verify you can log in with the new password

## Step 5: Production Deployment

### Vercel Deployment

1. **Add Environment Variables** to Vercel:
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add all the email configuration variables

2. **Deploy**:
   ```bash
   git add .
   git commit -m "Add password reset service"
   git push
   ```

### Database Migration

The database setup script is idempotent, so it's safe to run multiple times. For production:

1. Run the setup script once
2. Verify the `password_reset_tokens` table exists
3. Test the password reset flow

## Security Features

### Token Security
- **Cryptographically Secure**: Tokens are generated using `crypto.randomBytes(32)`
- **Time-Limited**: Tokens expire after 1 hour
- **Single-Use**: Tokens are marked as used after password reset
- **Automatic Cleanup**: Expired tokens are automatically removed

### Database Security
- **Row Level Security (RLS)**: Users can only access their own tokens
- **Cascade Deletion**: Tokens are deleted when users are deleted
- **Indexed Queries**: Fast token lookups with proper indexing

### Email Security
- **No Information Leakage**: Same response for valid/invalid emails
- **Secure Links**: Reset links include secure tokens
- **Expiration Warnings**: Clear expiration information in emails

## API Endpoints

### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "new-password",
  "confirmPassword": "new-password"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. You can now log in with your new password."
}
```

### GET /api/auth/reset-password?token=xxx
Validate reset token.

**Response:**
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

## Frontend Pages

### /forgot-password
- Email input form
- Success confirmation
- Link to login page

### /reset-password
- Password reset form
- Token validation
- Success confirmation
- Link to login page

## Maintenance

### Cleanup Expired Tokens

The system automatically cleans up expired tokens, but you can also run manual cleanup:

```sql
SELECT cleanup_expired_password_reset_tokens();
```

### Monitoring

Monitor the `password_reset_tokens` table for:
- Number of active tokens
- Failed reset attempts
- Token usage patterns

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check SMTP configuration
   - Verify app password for Gmail
   - Check firewall/network settings

2. **Token Not Working**
   - Verify token hasn't expired
   - Check if token was already used
   - Ensure proper URL encoding

3. **Database Errors**
   - Verify RLS policies are correct
   - Check user permissions
   - Ensure table exists

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will show detailed error messages in the console.

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set
3. Test email configuration with `npm run test-email`
4. Check Supabase logs for database errors

## Security Best Practices

1. **Use HTTPS** in production
2. **Set Strong Passwords** for email accounts
3. **Monitor Failed Attempts** for potential abuse
4. **Regular Security Audits** of the password reset flow
5. **Keep Dependencies Updated** for security patches 