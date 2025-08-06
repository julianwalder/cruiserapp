# Enhanced Veriff Webhook System Setup Guide

This guide explains how to set up and use the enhanced Veriff webhook system that captures comprehensive verification data from Veriff webhooks.

## Overview

The enhanced webhook system provides:

- **Comprehensive Data Capture**: Stores all available verification data from Veriff webhooks
- **Structured Database Storage**: Individual columns for easy querying and reporting
- **Webhook Signature Validation**: Secure webhook processing with signature verification
- **Activity Logging**: Audit trail for all webhook activities
- **Admin APIs**: Endpoints for viewing verification data and statistics
- **Test Tools**: Development endpoints for testing webhook scenarios

## Database Setup

### 1. Run the Enhanced Schema Script

Execute the enhanced schema script in your Supabase SQL editor:

```sql
-- Run the script: scripts/enhance-veriff-webhook-schema.sql
```

This script adds:
- Comprehensive webhook data columns
- Person verification details
- Document verification details
- Face verification data
- Decision scores and insights
- Verification metadata
- Timestamp tracking
- Database indexes for performance
- Automatic timestamp triggers

### 2. Verify Schema Changes

Check that the columns were added successfully:

```sql
-- Check new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name LIKE 'veriff%'
ORDER BY column_name;
```

## Environment Configuration

### 1. Required Environment Variables

Add these to your `.env.local` and production environment:

```bash
# Veriff API Configuration
VERIFF_API_KEY=your_veriff_api_key
VERIFF_API_SECRET=your_veriff_api_secret
VERIFF_BASE_URL=https://api.veriff.me/v1
VERIFF_ENVIRONMENT=production

# Webhook Configuration
VERIFF_WEBHOOK_SECRET=your_webhook_secret_key
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Webhook URL override
VERIFF_WEBHOOK_URL=https://your-domain.com/api/veriff/callback
```

### 2. Veriff Dashboard Configuration

In your Veriff dashboard:

1. **Webhook URL**: Set to `https://your-domain.com/api/veriff/callback`
2. **Webhook Secret**: Configure the same secret as `VERIFF_WEBHOOK_SECRET`
3. **Events**: Enable all verification events
4. **Retry Policy**: Configure appropriate retry settings

## API Endpoints

### 1. Webhook Callback (Production)

**URL**: `POST /api/veriff/callback`

This endpoint processes incoming Veriff webhooks and stores comprehensive data.

**Features**:
- Signature validation
- Comprehensive data extraction
- Backward compatibility with existing system
- Error handling and logging

### 2. Verification Data Retrieval

**URL**: `GET /api/veriff/verification-data/[userId]`

**Authentication**: Required (Admin or user themselves)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "veriffStatus": "approved",
    "identityVerified": true,
    "veriffPersonGivenName": "John",
    "veriffPersonLastName": "Doe",
    "veriffDocumentType": "PASSPORT",
    "veriffFaceMatchSimilarity": 0.95,
    "veriffDecisionScore": 0.92,
    // ... all verification data
  }
}
```

### 3. Verification Statistics

**URL**: `GET /api/veriff/stats`

**Authentication**: Required (Admin only)

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "approved": 120,
    "declined": 20,
    "pending": 10,
    "recent": [
      {
        "id": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "veriffStatus": "approved",
        "veriffWebhookReceivedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 4. Test Webhook (Development)

**URL**: `POST /api/veriff/test-webhook`

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "userId": "user-uuid",
  "webhookType": "verification", // or "selfid"
  "status": "approved" // or "declined", "submitted"
}
```

## Usage Examples

### 1. Testing Webhook Processing

```bash
# Test an approved verification
curl -X POST https://your-domain.com/api/veriff/test-webhook \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "webhookType": "verification",
    "status": "approved"
  }'

# Test a declined verification
curl -X POST https://your-domain.com/api/veriff/test-webhook \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "webhookType": "verification",
    "status": "declined"
  }'
```

### 2. Retrieving User Verification Data

```bash
# Get verification data for a user
curl -X GET https://your-domain.com/api/veriff/verification-data/user-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Getting Verification Statistics

```bash
# Get verification statistics
curl -X GET https://your-domain.com/api/veriff/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Database Queries

### 1. Find All Verified Users

```sql
SELECT 
  id,
  "firstName",
  "lastName",
  "identityVerifiedAt",
  "veriffDecisionScore",
  "veriffDocumentType"
FROM users 
WHERE "identityVerified" = true
ORDER BY "identityVerifiedAt" DESC;
```

### 2. Find Users with High Decision Scores

```sql
SELECT 
  id,
  "firstName",
  "lastName",
  "veriffDecisionScore",
  "veriffFaceMatchSimilarity"
FROM users 
WHERE "veriffDecisionScore" >= 0.9
  AND "identityVerified" = true;
```

### 3. Verification Statistics by Date

```sql
SELECT 
  DATE("veriffWebhookReceivedAt") as verification_date,
  COUNT(*) as total_verifications,
  COUNT(CASE WHEN "identityVerified" = true THEN 1 END) as approved,
  COUNT(CASE WHEN "veriffStatus" = 'declined' THEN 1 END) as declined
FROM users 
WHERE "veriffWebhookReceivedAt" IS NOT NULL
GROUP BY DATE("veriffWebhookReceivedAt")
ORDER BY verification_date DESC;
```

### 4. Document Type Distribution

```sql
SELECT 
  "veriffDocumentType",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users 
WHERE "veriffDocumentType" IS NOT NULL
GROUP BY "veriffDocumentType"
ORDER BY count DESC;
```

## Monitoring and Debugging

### 1. Check Webhook Processing

Monitor your application logs for webhook processing:

```bash
# Check for webhook processing logs
grep "Processing enhanced Veriff webhook" /path/to/logs

# Check for webhook errors
grep "Error processing Veriff webhook" /path/to/logs
```

### 2. Database Monitoring

```sql
-- Check recent webhook activity
SELECT 
  id,
  "firstName",
  "lastName",
  "veriffStatus",
  "veriffWebhookReceivedAt",
  "veriffDecisionScore"
FROM users 
WHERE "veriffWebhookReceivedAt" >= NOW() - INTERVAL '24 hours'
ORDER BY "veriffWebhookReceivedAt" DESC;

-- Check for failed verifications
SELECT 
  id,
  "firstName",
  "lastName",
  "veriffStatus",
  "veriffReason",
  "veriffFlags"
FROM users 
WHERE "veriffStatus" = 'declined'
ORDER BY "veriffDeclinedAt" DESC;
```

### 3. Activity Log Monitoring

```sql
-- Check webhook activity logs
SELECT 
  "userId",
  action,
  details,
  "createdAt"
FROM activity_logs 
WHERE action = 'veriff_webhook_received'
ORDER BY "createdAt" DESC
LIMIT 50;
```

## Security Considerations

### 1. Webhook Signature Validation

The system validates webhook signatures when `VERIFF_WEBHOOK_SECRET` is configured:

```typescript
// Signature validation is automatic
const isValid = this.validateWebhookSignature(payload, signature);
```

### 2. Access Control

- Verification data endpoints require authentication
- Users can only access their own data
- Admin endpoints require admin privileges
- Test endpoints are admin-only

### 3. Data Privacy

- Sensitive data is stored in the database
- Consider encryption for highly sensitive fields
- Implement data retention policies
- Follow GDPR compliance requirements

## Troubleshooting

### 1. Webhook Not Receiving Data

**Check**:
- Veriff dashboard webhook URL configuration
- Network connectivity and firewall settings
- Application logs for errors
- Webhook endpoint accessibility

### 2. Database Column Errors

**Check**:
- Schema script execution
- Column existence: `\d users` in psql
- Column permissions and constraints

### 3. Signature Validation Failures

**Check**:
- `VERIFF_WEBHOOK_SECRET` environment variable
- Veriff dashboard webhook secret configuration
- Signature header format in webhook requests

### 4. Missing Verification Data

**Check**:
- User ID mapping in webhook payload
- Database update operations
- Transaction rollbacks
- Error logs for update failures

## Migration from Existing System

The enhanced system is backward compatible:

1. **Existing Data**: All existing verification data is preserved
2. **Dual Processing**: Both old and new handlers process webhooks
3. **Gradual Migration**: Can be enabled without affecting existing functionality
4. **Rollback**: Can disable enhanced features if needed

## Support

For issues or questions:

1. Check the application logs for detailed error messages
2. Verify environment variable configuration
3. Test with the test webhook endpoint
4. Review database schema and permissions
5. Contact the development team for assistance 