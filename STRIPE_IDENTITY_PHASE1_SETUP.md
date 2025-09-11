# Stripe Identity Phase 1 Setup Guide

## Overview

This guide walks you through setting up Stripe Identity integration alongside your existing Veriff integration. This is Phase 1 of the migration, which allows you to test Stripe Identity without disrupting your current Veriff functionality.

## Prerequisites

- Existing Veriff integration (already working)
- Stripe account with Identity enabled
- Access to your Supabase database
- Node.js and npm installed

## Step 1: Install Dependencies

The Stripe SDK has already been installed. Verify it's in your `package.json`:

```bash
npm list stripe
```

## Step 2: Set Up Environment Variables

Add these variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Stripe webhook endpoint secret

# Feature Flag (keep as 'veriff' for now)
IDENTITY_VERIFICATION_PROVIDER=veriff
```

**Important**: Keep `IDENTITY_VERIFICATION_PROVIDER=veriff` initially to maintain your current functionality.

## Step 3: Set Up Database

Run the SQL script to create the necessary tables:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f STRIPE_IDENTITY_SETUP.sql
```

Or copy the SQL from `STRIPE_IDENTITY_SETUP.sql` and run it in your Supabase SQL editor.

## Step 4: Get Stripe API Keys

1. **Sign up for Stripe**: Go to [https://stripe.com](https://stripe.com)
2. **Enable Identity**: In your Stripe dashboard, go to Products > Identity
3. **Get API Keys**: 
   - Go to Developers > API keys
   - Copy your "Secret key" (starts with `sk_test_`)
   - Copy your "Publishable key" (starts with `pk_test_`)

## Step 5: Set Up Webhooks

1. **Create Webhook Endpoint**:
   - Go to Developers > Webhooks in Stripe dashboard
   - Add endpoint: `https://yourdomain.com/api/stripe-identity/webhook`
   - Select events: `identity.verification_session.verified`, `identity.verification_session.requires_input`, `identity.verification_session.canceled`
   - Copy the webhook signing secret (starts with `whsec_`)

2. **For Local Testing**:
   - Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-identity/webhook`
   - Or use ngrok: `ngrok http 3000` and use the ngrok URL

## Step 6: Test the Setup

Run the test script to validate your setup:

```bash
node scripts/test-stripe-identity-setup.js
```

This will check:
- Environment variables
- Database tables
- Stripe API connection
- File structure
- Configuration

## Step 7: Test Stripe Identity (Optional)

To test Stripe Identity without affecting your current users:

1. **Create a test user** or use an existing one
2. **Temporarily switch provider**:
   ```bash
   # In .env.local
   IDENTITY_VERIFICATION_PROVIDER=stripe
   ```
3. **Test the verification flow**
4. **Switch back to Veriff**:
   ```bash
   # In .env.local
   IDENTITY_VERIFICATION_PROVIDER=veriff
   ```

## Step 8: Update Your Components (Optional)

To use the unified verification component, update your existing components:

```tsx
// Replace VeriffVerification with UnifiedIdentityVerification
import { UnifiedIdentityVerification } from '@/components/ui/unified-identity-verification';

// In your component:
<UnifiedIdentityVerification
  userId={userId}
  userData={userData}
  onStatusChange={handleStatusChange}
/>
```

## File Structure

The following files have been created:

```
src/
├── lib/
│   ├── stripe-identity-service.ts          # Core Stripe Identity service
│   └── identity-verification-config.ts     # Feature flag configuration
├── components/ui/
│   ├── stripe-identity-verification.tsx    # Stripe Identity UI component
│   └── unified-identity-verification.tsx   # Unified component (switches providers)
├── app/
│   ├── api/stripe-identity/
│   │   ├── create-session/route.ts         # Create verification session
│   │   ├── status/route.ts                 # Get verification status
│   │   ├── webhook/route.ts                # Handle webhooks
│   │   └── verification-data/[userId]/route.ts # Get verification data
│   └── stripe-identity-return/page.tsx     # Return page after verification
scripts/
└── test-stripe-identity-setup.js           # Setup validation script
```

## Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key for server-side API calls |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key for frontend |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `IDENTITY_VERIFICATION_PROVIDER` | No | `'veriff'` (default) or `'stripe'` |

### Feature Flag Usage

```typescript
import { 
  isStripeIdentityEnabled, 
  isVeriffEnabled, 
  getActiveProvider 
} from '@/lib/identity-verification-config';

// Check which provider is active
if (isStripeIdentityEnabled()) {
  // Use Stripe Identity
} else if (isVeriffEnabled()) {
  // Use Veriff
}
```

## Testing Checklist

- [ ] Environment variables set correctly
- [ ] Database tables created
- [ ] Stripe API keys working
- [ ] Webhook endpoint configured
- [ ] Test script passes
- [ ] Can create verification sessions
- [ ] Webhooks are received
- [ ] Verification data is stored
- [ ] UI components render correctly

## Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Check your `.env.local` file
   - Ensure all required variables are set

2. **"Database table does not exist"**
   - Run the SQL script: `STRIPE_IDENTITY_SETUP.sql`
   - Check Supabase connection

3. **"Stripe API connection failed"**
   - Verify your API keys are correct
   - Check if Identity is enabled in your Stripe account

4. **"Webhook signature verification failed"**
   - Ensure webhook secret is correct
   - Check webhook endpoint URL

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Next Steps

Once Phase 1 is working:

1. **Phase 2**: Data migration scripts
2. **Phase 3**: UI updates and testing
3. **Phase 4**: Remove Veriff code and cleanup

## Support

- Stripe Identity Documentation: https://stripe.com/docs/identity
- Stripe Support: https://support.stripe.com
- Test the setup: `node scripts/test-stripe-identity-setup.js`
