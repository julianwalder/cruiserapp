# 🔧 Veriff Integration Fix Guide

## 🚨 Current Issues Identified

### 1. **Missing Webhook Data**
- User `glavan.catalinalexandru@gmail.com` completed verification in Veriff but no data appears in the platform
- No webhook was received or processed for this user
- Database shows no Veriff session ID, status, or webhook data

### 2. **Webhook Configuration Issues**
- Multiple conflicting webhook endpoints (`/api/veriff/webhook` and `/api/veriff/callback`)
- User ID extraction from webhooks may be failing
- No webhook monitoring or debugging tools

### 3. **Data Synchronization Problems**
- Webhook processing may not be correctly updating user records
- Missing comprehensive error handling and retry mechanisms

## 🛠️ Fix Implementation

### Step 1: Immediate Fix for Affected User

Run the manual update script to fix the user's verification status:

```bash
node scripts/manual-veriff-update.js
```

This will:
- Update the user's verification status to "approved"
- Store comprehensive verification data
- Set all required database fields
- Mark the user as identity verified

### Step 2: Enhanced Webhook Processing

The enhanced webhook handler (`/api/veriff/webhook-enhanced`) now includes:

- **Multiple User ID Extraction Strategies**:
  1. Direct user ID fields (`userId`, `vendorData`, etc.)
  2. Session ID lookup in database
  3. Verification ID lookup in database
  4. Recent session fallback for SelfID

- **Comprehensive Error Handling**:
  - Detailed logging for debugging
  - Multiple fallback strategies
  - Graceful error recovery

### Step 3: Webhook Monitoring System

New webhook monitoring endpoint (`/api/veriff/webhook-monitor`) provides:

- **Real-time Monitoring**: Track all webhook events
- **Failed Webhook Analysis**: Identify and debug failed webhooks
- **Manual Processing**: Retry failed webhooks or process manually
- **Statistics**: Success rates, webhook types, and trends

### Step 4: Configuration Updates

#### A. Veriff Dashboard Configuration

1. **Set Primary Webhook URL**:
   ```
   https://your-domain.com/api/veriff/webhook-enhanced
   ```

2. **Configure Webhook Secret** (if using signature verification):
   - Set the same secret in both Veriff dashboard and your environment
   - Environment variable: `VERIFF_WEBHOOK_SECRET`

3. **Enable All Events**:
   - Verification submitted
   - Verification approved
   - Verification declined
   - Session created
   - Session expired

#### B. Environment Variables

Ensure these are properly configured:

```bash
# Required for webhook processing
VERIFF_WEBHOOK_SECRET=your_webhook_secret_key
VERIFF_API_KEY=your_veriff_api_key
VERIFF_API_SECRET=your_veriff_api_secret

# Required for database operations
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for session creation
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🔍 Debugging Tools

### 1. Webhook Monitor Dashboard

Access the webhook monitoring dashboard:

```
GET /api/veriff/webhook-monitor?action=overview
GET /api/veriff/webhook-monitor?action=recent
GET /api/veriff/webhook-monitor?action=failed
GET /api/veriff/webhook-monitor?action=stats
```

### 2. User-Specific Webhook History

Check webhook history for a specific user:

```
GET /api/veriff/webhook-monitor?action=user&userId=user-uuid
```

### 3. Manual Webhook Processing

Process a webhook manually if needed:

```bash
curl -X POST /api/veriff/webhook-monitor \
  -H "Content-Type: application/json" \
  -d '{
    "action": "manual",
    "userId": "user-uuid",
    "webhookData": {
      "id": "session-id",
      "status": "approved",
      "action": "approved",
      "feature": "selfid",
      "vendorData": "user-uuid"
    }
  }'
```

### 4. User Status Check Script

Check any user's current Veriff status:

```bash
node check-user-veriff.js
```

## 📊 Verification Process Flow

### 1. **Session Creation**
```
User initiates verification → VeriffService.createSession() → 
Session stored in database → User redirected to Veriff
```

### 2. **Webhook Processing**
```
Veriff sends webhook → /api/veriff/webhook-enhanced → 
User ID extraction → Data processing → Database update
```

### 3. **Status Updates**
```
Frontend polls status → VeriffService.getUserVeriffStatus() → 
Real-time status updates → UI reflects current state
```

## 🚀 Testing the Fix

### 1. **Test Webhook Endpoint**

Verify the webhook endpoint is accessible:

```bash
curl https://your-domain.com/api/veriff/webhook-enhanced
```

Should return:
```json
{
  "message": "Enhanced Veriff webhook endpoint is active",
  "status": "ready",
  "features": [
    "Comprehensive user ID extraction",
    "Multiple fallback strategies",
    "Robust data processing",
    "Real-time sync support"
  ]
}
```

### 2. **Test Manual Update**

Run the manual update script for the affected user:

```bash
node scripts/manual-veriff-update.js
```

### 3. **Monitor Webhook Processing**

Check the webhook monitoring dashboard for:
- Recent webhook events
- Failed webhooks
- Success rates
- Processing times

### 4. **Verify Frontend Display**

Navigate to the user's account page and verify:
- Verification status shows as "Approved"
- Personal data is displayed correctly
- Document information is shown
- Verification scores are visible

## 🔧 Troubleshooting

### Issue: Webhook Not Received

**Symptoms**: User completed verification but no data in database

**Solutions**:
1. Check webhook URL configuration in Veriff dashboard
2. Verify webhook endpoint is accessible from external servers
3. Check application logs for webhook processing errors
4. Use webhook monitoring to track incoming webhooks

### Issue: User ID Not Found

**Symptoms**: Webhook received but user ID extraction fails

**Solutions**:
1. Check webhook payload structure
2. Verify `vendorData` field is set correctly in session creation
3. Use enhanced user ID extraction with multiple fallback strategies
4. Check database for session ID matches

### Issue: Data Not Updated

**Symptoms**: Webhook processed but user data not updated

**Solutions**:
1. Check database permissions and service role key
2. Verify all required columns exist in database
3. Check for database constraint violations
4. Review webhook processing logs

## 📈 Monitoring and Maintenance

### 1. **Regular Health Checks**

Monitor these metrics:
- Webhook success rate (should be >95%)
- Processing time (should be <5 seconds)
- Failed webhook count
- User verification completion rate

### 2. **Log Analysis**

Review logs for:
- Webhook processing errors
- User ID extraction failures
- Database update errors
- API rate limiting issues

### 3. **Performance Optimization**

- Monitor database query performance
- Check webhook processing queue
- Optimize real-time sync intervals
- Review API call frequency

## 🎯 Success Criteria

The integration is working correctly when:

1. ✅ Users can initiate verification sessions
2. ✅ Webhooks are received and processed successfully
3. ✅ User verification status is updated in real-time
4. ✅ Personal and document data is extracted and stored
5. ✅ Frontend displays verification results correctly
6. ✅ Failed webhooks can be identified and retried
7. ✅ Webhook monitoring provides visibility into the system

## 📞 Support

If issues persist after implementing these fixes:

1. Check the webhook monitoring dashboard for detailed error information
2. Review application logs for specific error messages
3. Verify all environment variables are correctly configured
4. Test webhook endpoint accessibility from external servers
5. Contact Veriff support if webhook delivery issues persist

---

**Last Updated**: January 2025
**Version**: 2.0
**Status**: Production Ready
