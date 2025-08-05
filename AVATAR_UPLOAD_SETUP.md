# Avatar Upload Feature Setup

## Overview
This project now includes a comprehensive avatar upload system using Vercel Blob storage with image optimization, similar to the aircraft image upload system in fleet management.

## Features

### ✅ **Core Functionality**
- **Avatar Upload**: Users can upload profile pictures from their My Account page
- **Vercel Blob Storage**: Images stored in cloud with global CDN
- **Image Optimization**: Automatic WebP conversion, resizing, and compression
- **File Validation**: Type and size validation (5MB max)
- **Preview System**: Real-time preview before upload
- **Remove Avatar**: Option to remove current avatar

### ✅ **Technical Features**
- **Optimized Images**: Vercel Blob optimization parameters for avatars
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Visual feedback during upload
- **Error Handling**: Comprehensive error messages
- **TypeScript**: Fully typed components and APIs

## Setup Instructions

### 1. Database Schema
The avatar upload system requires an `avatarUrl` column in the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

COMMENT ON COLUMN users."avatarUrl" IS 'URL of the user''s avatar image stored in Vercel Blob';

CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users("avatarUrl") WHERE "avatarUrl" IS NOT NULL;
```

### 2. Environment Variables
Ensure you have the following environment variables set:

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Vercel Blob Setup
If not already set up, run:

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Add Blob Storage
vercel blob create

# Deploy
vercel --prod
```

## API Endpoints

### POST `/api/avatar/upload`
Uploads a new avatar image.

**Request:**
- Method: `POST`
- Headers: `Authorization: Bearer <token>`
- Body: `FormData` with `file` field

**Response:**
```json
{
  "url": "https://blob.vercel-storage.com/...",
  "filename": "avatar-user-id-timestamp.jpg",
  "size": 123456,
  "type": "image/jpeg",
  "message": "Avatar uploaded successfully"
}
```

### DELETE `/api/avatar/remove`
Removes the current avatar.

**Request:**
- Method: `DELETE`
- Headers: `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Avatar removed successfully",
  "previousAvatarUrl": "https://blob.vercel-storage.com/..."
}
```

## Components

### AvatarUpload Component
```tsx
import { AvatarUpload } from '@/components/ui/avatar-upload';

<AvatarUpload
  currentAvatarUrl={user.avatarUrl}
  onAvatarChange={(url) => setUser({ ...user, avatarUrl: url })}
  size="lg"
  userName={`${user.firstName} ${user.lastName}`}
/>
```

**Props:**
- `currentAvatarUrl`: Current avatar URL
- `onAvatarChange`: Callback when avatar changes
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `userName`: User's name for fallback initials
- `disabled`: Disable upload functionality
- `className`: Additional CSS classes

### OptimizedAvatar Component
```tsx
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';

<OptimizedAvatar
  src={avatarUrl}
  alt="User avatar"
  fallback="John Doe"
  size="md"
/>
```

**Props:**
- `src`: Image URL
- `alt`: Alt text
- `fallback`: Name for initials fallback
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `onLoad`: Load callback
- `onError`: Error callback

## Image Optimization

### Vercel Blob Parameters
Avatars are optimized with these parameters:
- **Size**: 200x200 pixels (square)
- **Format**: WebP for better compression
- **Quality**: 85% (good balance of quality/size)
- **Fit**: Crop to maintain aspect ratio

### Optimization URL Example
```
https://blob.vercel-storage.com/avatar.jpg?w=200&h=200&fit=crop&f=webp&q=85
```

## File Validation

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Size Limits
- **Maximum**: 5MB
- **Recommended**: 1-2MB for best performance

## Usage Examples

### My Account Page Integration
```tsx
// In My Account page
const handleAvatarChange = (newAvatarUrl: string) => {
  setUser({
    ...user,
    avatarUrl: newAvatarUrl
  });
};

<AvatarUpload
  currentAvatarUrl={user.avatarUrl}
  onAvatarChange={handleAvatarChange}
  size="lg"
  userName={`${user.firstName} ${user.lastName}`}
/>
```

### User List Display
```tsx
// In user management or other components
<OptimizedAvatar
  src={user.avatarUrl}
  alt={`${user.firstName} ${user.lastName}`}
  fallback={`${user.firstName} ${user.lastName}`}
  size="sm"
/>
```

## Error Handling

### Common Errors
1. **File too large**: "Please select an image smaller than 5MB"
2. **Invalid format**: "Please select a JPEG, PNG, GIF, or WebP image"
3. **Upload failed**: Network or server errors
4. **Authentication**: Token expired or invalid

### Error Recovery
- Automatic retry for network errors
- Clear error messages with suggestions
- Fallback to initials when image fails to load

## Performance Considerations

### Loading Optimization
- **Lazy loading**: Images load only when needed
- **Preloading**: Critical avatars preloaded for faster display
- **Caching**: Vercel Blob CDN caching for fast delivery

### Storage Optimization
- **Automatic compression**: WebP format for smaller files
- **Size limits**: 5MB max to prevent abuse
- **Cleanup**: Old avatars can be removed to save space

## Security

### File Validation
- **Type checking**: Only image files allowed
- **Size limits**: Prevents large file uploads
- **Authentication**: All uploads require valid JWT token

### Access Control
- **User-specific**: Users can only upload their own avatar
- **Token validation**: All requests verified with JWT
- **Database constraints**: Proper foreign key relationships

## Migration from Existing System

### If you have existing avatars:
1. **Backup**: Export current avatar data
2. **Upload**: Re-upload to Vercel Blob
3. **Update**: Update database with new URLs
4. **Test**: Verify all avatars display correctly

### Database Migration:
```sql
-- Add avatarUrl column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_avatar_url ON users("avatarUrl") WHERE "avatarUrl" IS NOT NULL;
```

## Troubleshooting

### Common Issues

1. **Upload fails with 401**
   - Check JWT token is valid
   - Verify user is authenticated

2. **Upload fails with 413**
   - File is too large (>5MB)
   - Compress image before upload

3. **Image doesn't display**
   - Check avatarUrl is set in database
   - Verify Vercel Blob URL is accessible

4. **Poor image quality**
   - Upload higher resolution image
   - Check optimization parameters

### Debug Steps
1. Check browser console for errors
2. Verify API responses in Network tab
3. Check database for avatarUrl values
4. Test Vercel Blob URL directly

## Cost Considerations

### Vercel Blob Pricing
- **Free tier**: 1GB storage, 100GB bandwidth/month
- **Pro tier**: $0.10/GB storage, $0.10/GB bandwidth
- **Avatar storage**: Typically very low cost

### Optimization Benefits
- **Reduced bandwidth**: WebP compression saves ~30-50%
- **Faster loading**: CDN delivery worldwide
- **Better UX**: Optimized images load faster

## Future Enhancements

### Potential Features
- **Avatar cropping**: In-browser image editing
- **Multiple sizes**: Different sizes for different contexts
- **Avatar templates**: Pre-designed avatar options
- **Bulk operations**: Admin tools for avatar management
- **Analytics**: Upload and usage statistics

### Technical Improvements
- **Progressive loading**: Blur-up technique
- **WebP fallback**: Better browser compatibility
- **Cache optimization**: Improved caching strategies
- **Upload progress**: Real-time upload progress bars 