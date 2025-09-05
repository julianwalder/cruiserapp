# Veriff Full Auto Webhook Implementation

This document describes the implementation of Veriff full auto webhooks based on the official [Veriff Full Auto Webhook Sample](https://help.veriff.com/en/articles/8529223-full-auto-webhook-sample).

## Webhook Endpoints

### Full Auto Webhook (`/api/veriff/webhook-full-auto`)
**Production webhook endpoint**

Specifically designed for Veriff's full auto webhooks:
- Optimized for SelfID feature
- Handles action codes (7001-7005)
- Direct person and document data extraction
- Comprehensive error handling and logging
- Database updates with full data extraction

### Legacy Webhook (`/api/veriff/webhook`)
**Existing implementation**

Maintains backward compatibility with existing webhook processing.

## Full Auto Webhook Format

Veriff's full auto webhooks with enhanced data extraction:

```json
{
  "id": "session-id",
  "code": 7003,
  "action": "approved",
  "feature": "selfid",
  "vendorData": "user-id",
  "person": {
    "givenName": "John",
    "lastName": "Doe",
    "idNumber": "123456789",
    "dateOfBirth": "1990-01-01",
    "nationality": "US",
    "gender": "M",
    "country": "US"
  },
  "document": {
    "type": "PASSPORT",
    "number": "A1234567",
    "country": "US",
    "validFrom": "2020-01-01",
    "validUntil": "2030-01-01"
  },
  "additionalVerification": {
    "faceMatch": {
      "similarity": 0.95,
      "status": "approved"
    }
  }
}
```


## Action Codes

Full auto webhooks use specific action codes:

| Code | Action | Status |
|------|--------|--------|
| 7001 | started | submitted |
| 7002 | submitted | submitted |
| 7003 | approved | approved |
| 7004 | declined | declined |
| 7005 | review | review |

## Database Updates

The webhook handlers update the following user fields:

### Core Verification Fields
- `identityVerified`: boolean
- `identityVerifiedAt`: timestamp
- `veriffStatus`: string
- `veriffSessionId`: string

### Person Data Fields
- `veriffPersonGivenName`
- `veriffPersonLastName`
- `veriffPersonIdNumber`
- `veriffPersonDateOfBirth`
- `veriffPersonNationality`
- `veriffPersonGender`
- `veriffPersonCountry`

### Document Data Fields
- `veriffDocumentType`
- `veriffDocumentNumber`
- `veriffDocumentCountry`
- `veriffDocumentValidFrom`
- `veriffDocumentValidUntil`
- `veriffDocumentIssuedBy`

### Verification Results
- `veriffFaceMatchSimilarity`
- `veriffFaceMatchStatus`
- `veriffDecisionScore`
- `veriffQualityScore`
- `veriffFlags`
- `veriffContext`

### Timestamps
- `veriffApprovedAt`
- `veriffDeclinedAt`
- `veriffSubmittedAt`
- `veriffCreatedAt`
- `veriffUpdatedAt`

## Security

### Signature Validation
All webhooks are validated using HMAC-SHA256 signatures:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload, 'utf8')
  .digest('hex');
```

### Environment Variables
Required environment variables:
- `VERIFF_WEBHOOK_SECRET`: Webhook signature secret
- `SUPABASE_URL`: Database URL
- `SUPABASE_SERVICE_ROLE_KEY`: Database service key

## Testing

Use the provided testing script to validate webhook implementations:

```bash
node scripts/test-veriff-webhooks.js
```

The script tests:
- Full auto webhook (started)
- Full auto webhook (approved)
- Traditional webhook (approved)

## Monitoring

Webhook events are logged to the `webhook_events` table for monitoring and debugging:

```sql
SELECT * FROM webhook_events 
WHERE userid = 'user-id' 
ORDER BY createdat DESC;
```

## Error Handling

The webhook handlers include comprehensive error handling:
- Signature validation
- JSON parsing
- User ID extraction
- Database updates
- Event logging

All errors are logged with detailed information for debugging.

## Migration Guide

### From Legacy to Full Auto Webhook

1. Update your Veriff dashboard webhook URL to point to `/api/veriff/webhook-full-auto`
2. Test with the provided test script
3. Monitor webhook events in the database
4. Remove the old webhook endpoint after confirming everything works

### Configuration

Update your Veriff dashboard settings:
- **Webhook URL**: `https://yourdomain.com/api/veriff/webhook-full-auto`
- **Webhook Secret**: Use the same secret as configured in your environment
- **Events**: Subscribe to all verification events

## Troubleshooting

### Common Issues

1. **Invalid Signature**: Check webhook secret configuration
2. **User Not Found**: Verify vendorData contains correct user ID
3. **Database Errors**: Check Supabase connection and permissions
4. **Missing Data**: Ensure webhook payload includes required fields

### Debugging

Enable detailed logging by checking the console output for webhook processing steps:
- Signature validation
- Payload parsing
- User ID extraction
- Database updates
- Event logging

## Support

For issues with the webhook implementation:
1. Check the webhook events table for error logs
2. Verify environment variables are configured
3. Test with the provided test script
4. Review Veriff's official documentation for payload formats
