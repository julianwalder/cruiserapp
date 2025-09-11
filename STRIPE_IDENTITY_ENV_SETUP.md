# Stripe Identity Environment Variables Setup

## Required Environment Variables

Add these environment variables to your `.env.local` and `.env.production` files:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (for frontend)
STRIPE_WEBHOOK_SECRET=whsec_... # Stripe webhook endpoint secret

# Feature Flag (optional - defaults to 'veriff')
IDENTITY_VERIFICATION_PROVIDER=stripe # or 'veriff' to use existing Veriff integration
```

## Getting Your Stripe Keys

1. **Sign up for Stripe**: Go to [https://stripe.com](https://stripe.com) and create an account
2. **Get your API keys**: 
   - Go to Developers > API keys
   - Copy your "Secret key" (starts with `sk_test_` for test mode)
   - Copy your "Publishable key" (starts with `pk_test_` for test mode)
3. **Set up webhooks**:
   - Go to Developers > Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe-identity/webhook`
   - Select events: `identity.verification_session.verified`, `identity.verification_session.requires_input`, `identity.verification_session.canceled`
   - Copy the webhook signing secret (starts with `whsec_`)

## Environment Variable Details

### STRIPE_SECRET_KEY
- **Purpose**: Server-side Stripe API authentication
- **Format**: `sk_test_...` (test) or `sk_live_...` (production)
- **Security**: Keep this secret, never expose to frontend

### STRIPE_PUBLISHABLE_KEY
- **Purpose**: Frontend Stripe integration (for future use)
- **Format**: `pk_test_...` (test) or `pk_live_...` (production)
- **Security**: Safe to expose to frontend

### STRIPE_WEBHOOK_SECRET
- **Purpose**: Verify webhook authenticity
- **Format**: `whsec_...`
- **Security**: Keep this secret, used to verify webhook signatures

### IDENTITY_VERIFICATION_PROVIDER
- **Purpose**: Feature flag to switch between Veriff and Stripe Identity
- **Values**: `'veriff'` (default) or `'stripe'`
- **Usage**: Allows gradual migration and A/B testing

## Testing Setup

For testing, use Stripe's test mode:
- All test keys start with `sk_test_` and `pk_test_`
- Test cards: https://stripe.com/docs/testing
- Test webhooks: Use Stripe CLI or ngrok for local testing

## Production Setup

For production:
1. Switch to live mode in Stripe dashboard
2. Use live API keys (start with `sk_live_` and `pk_live_`)
3. Update webhook endpoint to production URL
4. Set `IDENTITY_VERIFICATION_PROVIDER=stripe` in production environment

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate keys regularly
- Monitor webhook endpoints for security
- Use HTTPS for all webhook endpoints
