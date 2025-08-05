# Veriff ID Verification Integration

This document provides a comprehensive guide for setting up and using Veriff ID Verification in the CruiserApp.

## Overview

Veriff is a secure identity verification service that allows users to verify their identity using government-issued documents and facial recognition. This integration provides:

- **Document Verification**: Verify passports, national IDs, and other government documents
- **Face Matching**: Compare user's face with the document photo
- **Real-time Status Updates**: Track verification progress
- **Secure API Integration**: End-to-end encrypted verification process

## Features

### ✅ Implemented Features

1. **Veriff Service Layer** (`src/lib/veriff-service.ts`)
   - Session creation and management
   - Verification status tracking
   - Webhook callback handling
   - Database integration

2. **API Endpoints**
   - `POST /api/veriff/create-session` - Create verification sessions
   - `GET /api/veriff/status` - Check verification status
   - `POST /api/veriff/callback` - Handle Veriff webhooks

3. **React Components**
   - `VeriffVerification` - Complete verification UI component
   - Integration with onboarding flow
   - Integration with My Account page

4. **Database Integration**
   - User verification status tracking
   - Veriff session management
   - Verification data storage

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env.local` and `.env.production`:

```bash
# Veriff API Credentials
VERIFF_API_KEY=your_veriff_api_key_here
VERIFF_API_SECRET=your_veriff_api_secret_here

# App URL for callbacks
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Database Schema

The following columns should exist in your `users` table:

```sql
-- Veriff integration columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffSessionId" VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffStatus" VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS "veriffData" JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerified" BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "identityVerifiedAt" TIMESTAMP;
```

### 3. Veriff Dashboard Setup

1. **Create Veriff Account**
   - Sign up at [veriff.com](https://veriff.com)
   - Complete business verification

2. **Configure Webhook**
   - Go to Veriff Dashboard → Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/api/veriff/callback`
   - Select events: `verification.created`, `verification.updated`

3. **Get API Credentials**
   - Go to Veriff Dashboard → Settings → API
   - Copy your API Key and Secret
   - Add to environment variables

## Usage

### For Users

1. **Start Verification**
   - Navigate to My Account → Credentials tab
   - Click "Start Verification" button
   - Veriff session opens in new tab

2. **Complete Verification**
   - Upload government-issued ID (passport/national ID)
   - Take a selfie for face matching
   - Submit for review

3. **Check Status**
   - Status updates automatically
   - Green shield icon when verified
   - Detailed status in Credentials tab

### For Developers

#### Creating Verification Sessions

```typescript
import { VeriffService } from '@/lib/veriff-service';

const session = await VeriffService.createSession(userId, {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

#### Checking Verification Status

```typescript
const status = await VeriffService.getUserVeriffStatus(userId);
console.log(status.isVerified); // true/false
console.log(status.veriffStatus); // 'approved', 'declined', etc.
```

#### Using the React Component

```tsx
import { VeriffVerification } from '@/components/ui/veriff-verification';

<VeriffVerification
  userId={user.id}
  userData={{
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  }}
  onStatusChange={(status) => {
    if (status === 'approved') {
      // Handle successful verification
    }
  }}
/>
```

## API Reference

### POST /api/veriff/create-session

Creates a new Veriff verification session.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "veriff_session_id",
    "url": "https://veriff.me/session/...",
    "status": "created"
  }
}
```

### GET /api/veriff/status

Gets the current verification status for the authenticated user.

**Response:**
```json
{
  "success": true,
  "status": {
    "isVerified": true,
    "sessionId": "veriff_session_id",
    "veriffStatus": "approved",
    "veriffData": {
      "verificationId": "veriff_verification_id",
      "status": "approved",
      "person": {
        "givenName": "John",
        "lastName": "Doe"
      },
      "document": {
        "type": "PASSPORT",
        "number": "123456789",
        "country": "US"
      }
    }
  }
}
```

### POST /api/veriff/callback

Webhook endpoint for Veriff to send verification updates.

**Request (from Veriff):**
```json
{
  "verification": {
    "id": "veriff_verification_id",
    "status": "approved"
  }
}
```

## Verification Statuses

| Status | Description | Icon | Color |
|--------|-------------|------|-------|
| `created` | Session created, waiting for user | 🛡️ | Blue |
| `submitted` | Verification submitted for review | ⏰ | Amber |
| `approved` | Verification approved | ✅ | Green |
| `declined` | Verification declined | ❌ | Red |
| `abandoned` | User abandoned verification | 🚫 | Gray |
| `expired` | Session expired | ⏰ | Gray |

## Security Considerations

### 1. API Security
- All API endpoints require authentication
- JWT tokens validated on each request
- Rate limiting recommended

### 2. Webhook Security
- Verify webhook signatures (implemented in service)
- Always return 200 status to Veriff
- Log all webhook events for debugging

### 3. Data Privacy
- Veriff data stored in JSONB format
- Sensitive data not logged
- GDPR compliant data handling

## Troubleshooting

### Common Issues

1. **"Veriff API credentials not configured"**
   - Check environment variables
   - Ensure `VERIFF_API_KEY` and `VERIFF_API_SECRET` are set

2. **"Failed to create verification session"**
   - Check Veriff dashboard for API limits
   - Verify webhook URL is accessible
   - Check network connectivity

3. **Webhook not receiving updates**
   - Verify webhook URL in Veriff dashboard
   - Check server logs for errors
   - Ensure endpoint returns 200 status

4. **User verification status not updating**
   - Check database connection
   - Verify user ID mapping
   - Check webhook processing logs

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG_VERIFF=true
```

This will log detailed information about:
- API requests/responses
- Webhook processing
- Database operations
- Error details

## Testing

### Test Environment

1. **Use Veriff Sandbox**
   - Set up sandbox environment in Veriff dashboard
   - Use test API credentials
   - Test with sample documents

2. **Test Documents**
   - Use Veriff's test document library
   - Test various document types
   - Test edge cases (expired, damaged, etc.)

### Integration Testing

```typescript
// Test verification flow
describe('Veriff Integration', () => {
  it('should create verification session', async () => {
    const session = await VeriffService.createSession(userId, userData);
    expect(session.id).toBeDefined();
    expect(session.url).toContain('veriff.me');
  });

  it('should handle webhook callback', async () => {
    const callback = { verification: { id: 'test', status: 'approved' } };
    await VeriffService.handleCallback(callback);
    
    const status = await VeriffService.getUserVeriffStatus(userId);
    expect(status.isVerified).toBe(true);
  });
});
```

## Support

### Veriff Support
- [Veriff Documentation](https://docs.veriff.com/)
- [Veriff Support](https://support.veriff.com/)
- [API Reference](https://docs.veriff.com/api/)

### Internal Support
- Check server logs for detailed error messages
- Use debug mode for troubleshooting
- Contact development team for integration issues

## Future Enhancements

### Planned Features

1. **Advanced Verification**
   - Liveness detection
   - Document authenticity checks
   - Address verification

2. **User Experience**
   - Progress indicators
   - Retry mechanisms
   - Mobile optimization

3. **Admin Features**
   - Verification management dashboard
   - Bulk verification processing
   - Analytics and reporting

### Integration Opportunities

1. **Compliance**
   - KYC/AML integration
   - Regulatory reporting
   - Audit trails

2. **User Onboarding**
   - Streamlined verification flow
   - Conditional verification requirements
   - Role-based verification levels

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Maintainer:** Development Team 