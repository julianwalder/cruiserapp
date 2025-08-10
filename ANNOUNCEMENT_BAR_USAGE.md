# Announcement Bar Implementation

A comprehensive, dismissible announcement bar component for Next.js App Router with Tailwind v4 and shadcn/ui.

## Features

✅ **Fixed positioning** - Stays at the top of every page  
✅ **No layout shift** - Content is offset by exact bar height  
✅ **iOS safe area support** - Respects device safe areas  
✅ **Persistent dismissal** - Uses localStorage with versioning  
✅ **Accessibility** - Keyboard navigation, screen reader friendly  
✅ **Responsive** - Automatically adjusts height with ResizeObserver  
✅ **TypeScript** - Fully typed with proper React Server Component support  

## Basic Usage

The announcement bar is already configured in `app/layout.tsx`. To customize:

```tsx
// app/layout.tsx
<AnnouncementBar 
  version="2025-01-launch"
  variant="info"
>
  🚀 Welcome to the new system! <a href="/changelog">See what's new</a>
</AnnouncementBar>
```

## API Reference

### AnnouncementBar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `version` | `string` | - | **Required.** Unique identifier for localStorage persistence |
| `children` | `ReactNode` | - | **Required.** The announcement content |
| `variant` | `'default' \| 'warning' \| 'info' \| 'success'` | `'default'` | Visual style variant |
| `dismissible` | `boolean` | `true` | Whether to show dismiss button |
| `className` | `string` | - | Additional CSS classes |
| `onDismiss` | `() => void` | - | Callback when dismissed |

### Variants

```tsx
// Default (primary colors)
<AnnouncementBar version="v1" variant="default">
  Default announcement
</AnnouncementBar>

// Warning (yellow/orange)
<AnnouncementBar version="v2" variant="warning">
  ⚠️ Maintenance scheduled for tonight
</AnnouncementBar>

// Info (blue)
<AnnouncementBar version="v3" variant="info">
  ℹ️ New features available
</AnnouncementBar>

// Success (green)
<AnnouncementBar version="v4" variant="success">
  ✅ Migration completed successfully
</AnnouncementBar>
```

## Advanced Usage

### Multiple Announcements

Use different versions to show multiple announcements over time:

```tsx
// Each gets its own localStorage key
<AnnouncementBar version="maintenance-jan-2025">
  System maintenance tonight 11 PM - 1 AM EST
</AnnouncementBar>

<AnnouncementBar version="new-feature-v2.1">
  🆕 Try our new flight scheduling feature
</AnnouncementBar>
```

### Custom Styling

```tsx
<AnnouncementBar 
  version="custom"
  className="bg-gradient-to-r from-purple-500 to-pink-500"
>
  Custom gradient background
</AnnouncementBar>
```

### Using the Hook

For complex state management:

```tsx
'use client'

import { useAnnouncement } from '@/components/announcement-bar'

export function CustomComponent() {
  const { isDismissed, dismiss, reset, isLoading } = useAnnouncement('my-version')
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <p>Announcement dismissed: {isDismissed ? 'Yes' : 'No'}</p>
      <button onClick={dismiss}>Dismiss</button>
      <button onClick={reset}>Reset</button>
    </div>
  )
}
```

## CSS Classes

The implementation adds these CSS custom properties and classes:

### Custom Properties
- `--announcement-height`: Dynamic height in pixels

### Utility Classes
- `.announcement-offset`: Adds `padding-top: var(--announcement-height, 0px)`
- `.announcement-margin-offset`: Adds `margin-top: var(--announcement-height, 0px)`

### Manual Content Offset

If you need custom offset behavior:

```tsx
// Using Tailwind arbitrary values
<div className="pt-[var(--announcement-height,0px)]">
  Content with dynamic offset
</div>

// Using CSS classes
<div className="announcement-offset">
  Content with padding offset
</div>

<div className="announcement-margin-offset">
  Content with margin offset
</div>
```

## Accessibility Features

### Keyboard Navigation
- **Escape key**: Dismisses the announcement
- **Tab navigation**: Focus management for dismiss button

### Screen Readers
- `role="region"` with `aria-label="Site announcement"`
- Proper button labeling with `aria-label="Dismiss announcement"`

### Testing

```tsx
// Test dismiss functionality
const dismissButton = screen.getByLabelText('Dismiss announcement')
fireEvent.click(dismissButton)

// Test keyboard navigation
fireEvent.keyDown(announcement, { key: 'Escape' })
```

## Best Practices

### 1. Version Management
Use semantic versioning for announcements:
```tsx
version="maintenance-2025-01-15"  // Date-based
version="feature-v2.1"            // Feature-based  
version="urgent-security-fix"     // Priority-based
```

### 2. Content Guidelines
- Keep messages concise (under 150 characters)
- Use clear call-to-action text
- Include relevant emojis for visual clarity
- Ensure links are accessible and don't break the flow

### 3. Timing
- Use different versions for time-sensitive announcements
- Consider user timezones for maintenance notifications
- Remove announcements after they're no longer relevant

### 4. Performance
- The component uses ResizeObserver for efficient height tracking
- LocalStorage checks are optimized for minimal performance impact
- SSR-safe with proper hydration handling

## Migration from Other Systems

### From react-hot-toast or similar
```tsx
// Before
toast.success('New feature available!')

// After
<AnnouncementBar version="feature-release" variant="success">
  🆕 New feature available!
</AnnouncementBar>
```

### From custom notification bars
The new system handles all edge cases including:
- iOS safe areas
- Dynamic content height
- Proper z-index stacking
- Accessibility requirements
- No layout shift (CLS)

## Troubleshooting

### Content Not Offset
Ensure you're using the `.announcement-offset` class or custom CSS:
```tsx
<div className="announcement-offset">
  Your content here
</div>
```

### Bar Not Showing
Check that:
1. Version string is unique
2. Not previously dismissed (check localStorage)
3. Component is properly imported

### Reset Dismissed State
```typescript
// Clear specific announcement
localStorage.removeItem('announcement-dismissed-your-version')

// Clear all announcements
Object.keys(localStorage)
  .filter(key => key.startsWith('announcement-dismissed-'))
  .forEach(key => localStorage.removeItem(key))
```

## Browser Support

- **Modern browsers**: Full support with ResizeObserver
- **Safari iOS**: Proper safe area handling
- **Legacy browsers**: Graceful fallback (no ResizeObserver)
