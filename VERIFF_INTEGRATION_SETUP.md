# Veriff Integration Setup Guide

## Overview

This guide explains how to properly set up the Veriff integration to receive real verification data from Veriff's SelfID feature and traditional verification webhooks.

## Current Issues and Solutions

### Problem 1: Session Expiration
- **Issue**: Julian's session `bd01834c-dce6-4ed8-ba67-f8f7fc061a56` returns 404 from Veriff API
- **Cause**: SelfID sessions expire after a certain period and are not accessible via the traditional verification API
- **Solution**: Use webhook data and session API for SelfID verifications

### Problem 2: Missing Real Data
- **Issue**: Frontend shows "null" values instead of real verification data
- **Cause**: The system is not properly extracting data from SelfID webhooks
- **Solution**: Enhanced webhook processing with comprehensive data extraction

## Setup Steps

### 1. Configure Veriff Webhook URL

In your Veriff dashboard, set the webhook URL to:
```
https://your-domain.com/api/veriff/webhook
```

For local development, use a service like ngrok:
```bash
ngrok http 3000
```
Then set the webhook URL to:
```
https://your-ngrok-url.ngrok.io/api/veriff/webhook
```

### 2. Environment Variables

Ensure these environment variables are set in `.env.local`:

```env
# Veriff API Configuration
VERIFF_API_KEY=your_veriff_api_key
VERIFF_API_SECRET=your_veriff_api_secret
VERIFF_WEBHOOK_SECRET=your_webhook_secret_key
VERIFF_BASE_URL=https://api.veriff.me/v1
VERIFF_ENVIRONMENT=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Schema

The enhanced schema includes all necessary columns for storing comprehensive verification data:

```sql
-- Key columns for SelfID data
veriffPersonGivenName TEXT,
veriffPersonLastName TEXT,
veriffPersonIdNumber TEXT,
veriffPersonDateOfBirth DATE,
veriffPersonNationality TEXT,
veriffPersonCountry TEXT,

veriffDocumentType TEXT,
veriffDocumentNumber TEXT,
veriffDocumentCountry TEXT,
veriffDocumentValidFrom DATE,
veriffDocumentValidUntil DATE,

veriffFaceMatchSimilarity DECIMAL,
veriffFaceMatchStatus TEXT,
veriffDecisionScore DECIMAL,
veriffQualityScore TEXT,

veriffWebhookData JSONB, -- Stores complete webhook payload
```

### 4. Webhook Processing

The system now handles two types of webhooks:

#### SelfID Webhooks (New)
- Feature: `selfid`
- Contains extracted data directly in payload
- Stores comprehensive person and document information
- Updates individual database columns for easy access

#### Traditional Verification Webhooks (Legacy)
- Feature: `verification`
- Requires additional API calls to fetch details
- Compatible with existing verification flow

### 5. Testing the Integration

#### Test with Real Data
Run the test script to simulate a SelfID webhook with Julian's real data:

```bash
node scripts/test-selfid-webhook.js
```

This will:
- Find Julian in the database
- Create a realistic webhook payload with his real verification data
- Process it through the enhanced webhook handler
- Update the database with comprehensive verification information

#### Verify Frontend Display
Navigate to `http://localhost:3000/my-account` and check the "Verification" tab to see:
- Real document information (Driver's licence, 19060794)
- Real personal data (JULIAN WALDER, 1973-07-08)
- Document validity dates (2019-02-18 to 2034-02-17)
- Verification scores and status

### 6. API Endpoints

#### Webhook Endpoint
- **URL**: `/api/veriff/webhook`
- **Method**: POST
- **Purpose**: Receives and processes Veriff webhooks
- **Features**: Signature validation, comprehensive data extraction

#### Verification Data Endpoint
- **URL**: `/api/veriff/verification-data/[userId]`
- **Method**: GET
- **Purpose**: Retrieves comprehensive verification data for display
- **Authentication**: Required (user or admin)

#### Status Endpoint
- **URL**: `/api/veriff/status`
- **Method**: GET
- **Purpose**: Quick verification status check
- **Features**: Handles expired sessions gracefully

### 7. Frontend Integration

The frontend now displays comprehensive verification data:

#### My Account Page
- **Verification Tab**: Shows all verification details
- **Cards**: Organized display of different data types
- **Real-time Updates**: Reflects latest webhook data

#### Components
- `VerificationDataDisplay.tsx`: Main verification display
- `VeriffIDVResults.tsx`: ID verification results
- Enhanced status handling and error recovery

## Troubleshooting

### Webhook Not Receiving Data
1. Check webhook URL in Veriff dashboard
2. Verify signature validation
3. Check server logs for errors
4. Test with ngrok for local development

### Frontend Showing Null Values
1. Ensure webhook processed successfully
2. Check database for populated fields
3. Verify API endpoints returning data
4. Clear browser cache and refresh

### Session Expired Errors
1. Normal for expired SelfID sessions
2. System automatically clears expired sessions
3. User can start new verification if needed
4. Existing verification data is preserved

## Data Flow

1. **User completes verification** in Veriff SelfID
2. **Veriff sends webhook** to `/api/veriff/webhook`
3. **System validates signature** and processes payload
4. **Data is extracted** and stored in database
5. **Frontend displays** comprehensive verification information

## Next Steps

1. **Test with real webhook**: Set up ngrok and trigger a real verification
2. **Monitor webhook logs**: Check server logs for successful processing
3. **Verify frontend display**: Ensure all data appears correctly
4. **Production deployment**: Update webhook URL for production environment

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are correctly set
3. Test webhook endpoint with curl or Postman
4. Ensure database schema is up to date 