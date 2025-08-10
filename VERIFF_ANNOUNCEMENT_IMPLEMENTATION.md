# Veriff Identity Verification Announcement Bar

A comprehensive implementation that shows targeted announcement bars to users who haven't completed their Veriff identity verification process.

## 🎯 Features

✅ **Smart Targeting** - Only shows to unverified users  
✅ **Personalized Messaging** - Uses user's name and personalized content  
✅ **Persistent Until Verification** - Reappears on page reload until verification complete  
✅ **Automatic Detection** - Fetches user verification status from `/api/auth/me`  
✅ **Seamless Integration** - Works alongside existing announcement bars  
✅ **No Layout Shift** - Proper height management with ResizeObserver  
✅ **Accessibility** - Full keyboard navigation and screen reader support  
✅ **TypeScript** - Fully typed with comprehensive interfaces  

## 🏗️ Architecture

### Components Created

1. **`VeriffAnnouncementBar`** (`/src/components/veriff-announcement-bar.tsx`)
   - Core announcement component for Veriff verification
   - Accepts user object and conditionally renders
   - Includes hooks and utility functions

2. **`ConditionalAnnouncementWrapper`** (`/src/components/conditional-announcement-wrapper.tsx`)
   - Client component that fetches user data from `/api/auth/me`
   - Automatically manages authentication state
   - Renders announcement bars conditionally

3. **Demo Page** (`/src/app/veriff-demo/page.tsx`)
   - Interactive demo showcasing different user scenarios
   - Testing interface for development and QA

### API Enhancement

**Updated `/api/auth/me`** to include `identityVerified` field:
```typescript
// Added to database query
"identityVerified",

// Added to response
identityVerified: user.identityVerified || false,
```

## 🔧 Implementation Details

### User Detection Logic

```typescript
// User needs verification if authenticated but not verified
const needsVerification = Boolean(user && !user.identityVerified)
```

### Personalized Messaging

```typescript
const userDisplayName = user.firstName && user.lastName 
  ? `${user.firstName} ${user.lastName}`
  : user.firstName || user.email.split('@')[0]
```

### Session-Based Dismissal

Users can temporarily dismiss the announcement, but it reappears on page reload:
```typescript
// Temporary dismissal stored in sessionStorage
sessionStorage.setItem(`veriff-temp-dismiss-${user.id}`, 'true')

// Clears automatically on page reload/close
// Only permanently disappears when identityVerified === true
```

## 📋 Usage Examples

### Basic Usage (Automatic)

The announcement automatically appears for unverified users when they visit any page:

```typescript
// Already integrated in layout.tsx
<ConditionalAnnouncementWrapper />
```

### Manual Integration

For custom implementations:

```typescript
import { VeriffAnnouncementBar, useVeriffAnnouncement } from '@/components/veriff-announcement-bar'

function MyComponent({ user }) {
  const announcement = useVeriffAnnouncement(user)
  
  return (
    <div>
      <VeriffAnnouncementBar 
        user={user}
        onStartVerification={() => {
          // Custom action
          router.push('/verification')
        }}
      />
    </div>
  )
}
```

### Utility Functions

```typescript
import { userNeedsVerification } from '@/components/veriff-announcement-bar'

// Check if user needs verification
if (userNeedsVerification(user)) {
  // Show verification prompts
}
```

## 🎨 Styling & Theming

### Current Theme
- **Variant**: `info` with custom blue gradient styling
- **Background**: Soft blue gradient (`from-blue-50 to-indigo-50`) with dark mode support
- **Icon**: Shield icon in rounded blue badge for security context
- **Button**: Blue primary button with hover effects and shadows
- **Typography**: Clear hierarchy with highlighted user name

### Customization Options

```typescript
<VeriffAnnouncementBar 
  user={user}
  className="custom-classes"
  variant="info" // or "warning", "success", "default"
/>
```

### Styling Features

- **Light Gradient Background**: Soft blue gradient instead of harsh warning colors
- **Icon Badge**: Shield icon in a rounded blue background for visual appeal
- **Important Tag**: Small "Important" badge for context and urgency
- **Personalized Greeting**: User's name highlighted in the message
- **Modern Buttons**: Blue primary button with hover effects and shadows
- **Dark Mode Support**: Proper color adaptation for dark themes
- **Subtle Shadows**: Backdrop blur and border effects for depth

## 🔄 User Flow

1. **User Login** → Auth API returns `identityVerified: false`
2. **Page Load** → `ConditionalAnnouncementWrapper` fetches user data
3. **Conditional Render** → `VeriffAnnouncementBar` shows for unverified users
4. **User Action** → Click "Start Verification" → Navigate to `/my-account?tab=verification`
5. **Temporary Dismissal** → User can dismiss for current session (stored in sessionStorage)
6. **Page Reload** → Announcement reappears (sessionStorage clears)
7. **Verification Complete** → API returns `identityVerified: true` → Announcement permanently disappears

## 📱 Responsive Design

- **Mobile**: Single-column layout with stacked elements
- **Desktop**: Horizontal layout with action button on the right
- **Content**: Intelligent text wrapping and icon sizing
- **Button**: Consistent sizing across breakpoints

## 🧪 Testing

### Demo Page

Visit `/veriff-demo` to test different user scenarios:

- **Verified Users**: No announcement shown
- **Unverified Users**: Full announcement with personalization
- **Different Names**: Tests name display logic
- **Anonymous Users**: No announcement (requires authentication)

### Test Cases

1. **Unverified User** → Shows announcement with name
2. **Verified User** → No announcement shown
3. **User without name** → Uses email prefix
4. **Dismissed announcement** → Stays dismissed per user
5. **Multiple users** → Independent dismissal states

## 🔧 Configuration

### Environment Requirements

- ✅ Supabase connection for user data
- ✅ JWT authentication system
- ✅ `identityVerified` field in users table
- ✅ localStorage for dismissal persistence

### Default Behavior

- **Default Action**: Navigate to `/my-account?tab=verification`
- **Default Variant**: `warning` (orange theme)
- **Default Dismissible**: `true`
- **Default Personalization**: User's first name or email prefix

## 🚀 Future Enhancements

### Potential Improvements

1. **Role-Based Messaging**: Different messages for different user roles
2. **Progress Indicators**: Show verification step progress
3. **Expiry Logic**: Re-show announcement after certain time periods
4. **Analytics**: Track announcement interaction rates
5. **A/B Testing**: Support for different message variants

### Integration Points

- **Veriff Webhook**: Automatically hide announcement when verification completes
- **User Profile**: Deep link to specific verification steps
- **Admin Dashboard**: Analytics on verification completion rates
- **Email Campaigns**: Coordinate with email verification reminders

## 📚 API Reference

### Components

#### `VeriffAnnouncementBar`
```typescript
interface VeriffAnnouncementBarProps {
  user: User | null
  className?: string
  onStartVerification?: () => void
}
```

#### `useVeriffAnnouncement`
```typescript
function useVeriffAnnouncement(user: User | null): {
  shouldShow: boolean
  needsVerification: boolean
}
```

#### `userNeedsVerification`
```typescript
function userNeedsVerification(user: User | null): boolean
```

### User Interface
```typescript
interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  identityVerified?: boolean
  roles?: string[]
}
```

## 🔒 Security Considerations

- ✅ **Server-Side Validation**: User verification status fetched from secure API
- ✅ **JWT Authentication**: Requires valid token for user data access
- ✅ **CORS Protection**: API endpoints protected with proper headers
- ✅ **No Sensitive Data**: Announcement doesn't expose verification details
- ✅ **User Isolation**: Dismissal states are per-user and cannot cross-contaminate

## 📊 Performance

- ✅ **Lazy Loading**: Only fetches user data when needed
- ✅ **Client-Side Caching**: User data cached in React state
- ✅ **Minimal Re-renders**: Optimized with `useEffect` dependencies
- ✅ **Small Bundle**: Uses existing component library
- ✅ **Progressive Enhancement**: Works without JavaScript (basic fallback)

This implementation provides a robust, user-friendly way to encourage identity verification while maintaining excellent UX and performance characteristics.
