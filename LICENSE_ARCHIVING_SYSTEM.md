# License Archiving System

## Overview

The license archiving system allows users to maintain a complete history of their pilot licenses while enabling new uploads when licenses expire. This system automatically detects expired licenses and provides a clean workflow for license renewal.

## Features

### 1. **Automatic Expiration Detection**
- Monitors ratings and language proficiency expiration dates
- Automatically marks licenses as "expired" when components expire
- Uses database triggers for real-time status updates

### 2. **License Status Management**
- **Active**: Current valid license
- **Expired**: Automatically marked when components expire
- **Archived**: Manually archived by user or system

### 3. **Version Tracking**
- Each new license gets an incremented version number
- Maintains complete history of all license versions
- Clear version badges in the UI

### 4. **Split-View Workflow**
- Shows PDF/document on left side immediately after upload
- Form fields on right side for data entry
- Works for both new uploads and existing licenses

## Database Schema

### New Fields Added to `pilot_licenses`:

```sql
-- License status tracking
status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired'))

-- Archiving metadata
archived_at TIMESTAMP WITH TIME ZONE
archive_reason TEXT

-- Version tracking
version INTEGER DEFAULT 1
```

### Indexes for Performance:
```sql
CREATE INDEX idx_pilot_licenses_status ON pilot_licenses(status);
CREATE INDEX idx_pilot_licenses_user_status ON pilot_licenses(user_id, status);
```

## User Interface

### Credentials Tab Layout:

1. **Active License Section** (Green background)
   - Shows current active license with validation status
   - Version badge (e.g., "v2")
   - Expiration warnings and status

2. **License History Section** (Gray background)
   - Lists all archived/expired licenses
   - Shows archive reason and date
   - Version numbers for each license
   - "View Archive" button for historical reference

3. **Upload New License**
   - Available when no active license exists
   - Or when current license is expired

### Modal Workflow:

1. **For Active Licenses**: View/Edit mode with split-view
2. **For Expired Licenses**: View-only mode with "Upload New License" button
3. **For New Uploads**: File upload → Split-view with form

## API Endpoints

### Archive License
```http
POST /api/my-account/pilot-licenses/archive
{
  "licenseId": "uuid",
  "reason": "License renewed"
}
```

### Get All Licenses (including archived)
```http
GET /api/my-account/pilot-licenses
```

## Implementation Steps

### 1. Database Migration
Run the archiving schema script:
```sql
-- Execute scripts/add-license-archiving.sql
```

### 2. API Updates
- Updated main license API to handle versioning
- Added archive endpoint
- Modified to return all licenses (active + archived)

### 3. Frontend Updates
- Enhanced credentials tab with license history
- Updated PilotLicenseUpload component for expired licenses
- Added status-based UI variations

## Benefits

1. **Complete History**: Never lose license information
2. **Clear Status**: Always know which license is current
3. **Easy Renewal**: Seamless workflow for new uploads
4. **Compliance**: Maintain records for regulatory requirements
5. **User Experience**: Intuitive interface for license management

## Future Enhancements

1. **Bulk Operations**: Archive multiple licenses at once
2. **Export History**: Download complete license history
3. **Notifications**: Alert users before expiration
4. **Auto-renewal**: Integration with renewal services
5. **Analytics**: Track license patterns and trends
