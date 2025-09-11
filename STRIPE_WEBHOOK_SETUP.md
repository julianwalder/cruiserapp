# Stripe Identity Webhook Setup

## Overview
This document outlines the webhook configuration needed for Stripe Identity verification to work properly.

## Webhook URL Configuration

### Production Environment
```
https://your-domain.com/api/stripe-identity/webhook
```

### Development Environment
```
http://localhost:3000/api/stripe-identity/webhook
```

## Required Webhook Events

Configure the following events in your Stripe Dashboard:

### Identity Verification Events
- `identity.verification_session.created`
- `identity.verification_session.processing`
- `identity.verification_session.verified`
- `identity.verification_session.canceled`
- `identity.verification_session.requires_input`

## Stripe Dashboard Configuration Steps

1. **Navigate to Stripe Dashboard**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Select your account

2. **Access Webhooks Section**
   - Go to "Developers" → "Webhooks"
   - Click "Add endpoint"

3. **Configure Endpoint**
   - **Endpoint URL**: Use the appropriate URL above based on your environment
   - **Description**: "Cruiser Aviation - Identity Verification"
   - **API Version**: Use the latest stable version

4. **Select Events**
   - Choose "Select events to listen to"
   - Add the events listed above under "Identity verification"

5. **Webhook Signing Secret**
   - After creating the webhook, copy the "Signing secret"
   - Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Environment Variables

Ensure these are set in your `.env.local` and production environment:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook configuration
```

## Testing Webhooks

### Using Stripe CLI (Recommended for Development)
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe-identity/webhook
```

### Using ngrok (Alternative)
```bash
# Install ngrok
# https://ngrok.com/

# Expose local server
ngrok http 3000

# Use the ngrok URL in Stripe webhook configuration
# Example: https://abc123.ngrok.io/api/stripe-identity/webhook
```

## Webhook Security

The webhook endpoint includes:
- ✅ **Signature verification** using Stripe's webhook signing secret
- ✅ **Public route access** (no authentication required)
- ✅ **Error handling** and logging
- ✅ **Idempotency** handling for duplicate events

## Verification Flow

1. User starts verification → `identity.verification_session.created`
2. User completes verification → `identity.verification_session.processing`
3. Stripe processes verification → `identity.verification_session.verified` or `identity.verification_session.canceled`
4. Webhook updates user status in database
5. User sees updated verification status in UI

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is accessible
   - Verify webhook is enabled in Stripe Dashboard
   - Check webhook signing secret is correct

2. **Signature verification failing**
   - Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
   - Verify webhook endpoint is receiving raw request body

3. **Events not processing**
   - Check server logs for webhook processing errors
   - Verify database connection and permissions
   - Ensure user exists in database

### Testing Webhook Endpoint

```bash
# Test webhook endpoint accessibility
curl -X POST http://localhost:3000/api/stripe-identity/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

## Production Deployment

1. **Update webhook URL** in Stripe Dashboard to production URL
2. **Set production environment variables**
3. **Test webhook** with a real verification session
4. **Monitor webhook logs** for any issues

## Security Considerations

- ✅ Webhook endpoint is public (no auth required) - this is correct for Stripe webhooks
- ✅ Signature verification ensures webhooks are from Stripe
- ✅ Idempotency prevents duplicate processing
- ✅ Error handling prevents webhook failures from affecting user experience

## Next Steps

1. Configure webhook in Stripe Dashboard
2. Set `STRIPE_WEBHOOK_SECRET` environment variable
3. Test with a real verification session
4. Monitor webhook delivery in Stripe Dashboard
