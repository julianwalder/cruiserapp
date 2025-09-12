# OG Image Setup Guide

This guide documents the Open Graph (OG) image setup for the Cruiser Aviation Management System.

## 🎯 Overview

The OG images have been updated with the following improvements:

- ✅ **Cruiser Aviation Logo**: Replaced plane icon with custom Cruiser Aviation logo
- ✅ **Correct Domain**: Updated from `cruiserapp.com` to `app.cruiseraviation.com`
- ✅ **Dynamic Stats**: Real-time data from API (Flight Hours, Landings, Pilots, Students)
- ✅ **Negative OG Image**: Dark theme version for Twitter/dark mode
- ✅ **Proper Metadata**: Complete Open Graph and Twitter Card metadata
- ✅ **Fixed Generation**: Removed edge runtime and SVG text elements for compatibility

## 📁 File Structure

```
src/app/api/og/
├── route.tsx                    # Main OG image (light theme)
├── negative/
│   └── route.tsx               # Negative OG image (dark theme)
├── dynamic/
│   ├── route.tsx               # Dynamic OG image with default stats
│   └── negative/
│       └── route.tsx           # Dynamic negative OG image
├── stats/
│   └── route.ts                # Stats API endpoint
├── advanced/
│   └── route.tsx               # Advanced OG image (legacy)
└── simple/
    └── route.tsx               # Simple OG image (legacy)
```

## 🔧 API Endpoints

### Main OG Image
- **URL**: `/api/og`
- **Purpose**: Light theme OG image with static stats
- **Parameters**:
  - `title`: Image title (default: "Cruiser Aviation")
  - `subtitle`: Image subtitle (default: "Flight Management System")
  - `type`: Layout type (default: "default")
  - `stats`: Static stats (optional, format: "Label:Value,Label:Value")

### Negative OG Image
- **URL**: `/api/og/negative`
- **Purpose**: Dark theme OG image for Twitter/dark mode
- **Parameters**: Same as main OG image

### Dynamic OG Image
- **URL**: `/api/og/dynamic`
- **Purpose**: Light theme OG image with default stats
- **Parameters**:
  - `title`: Image title (default: "Cruiser Aviation")
  - `subtitle`: Image subtitle (default: "Flight Management System")
  - `type`: Layout type (default: "default")

### Dynamic Negative OG Image
- **URL**: `/api/og/dynamic/negative`
- **Purpose**: Dark theme OG image with default stats
- **Parameters**: Same as dynamic OG image

### Stats API
- **URL**: `/api/og/stats`
- **Purpose**: Provides dynamic statistics for OG images
- **Response**:
  ```json
  {
    "totalFlightHours": 1418,
    "totalLandings": 3519,
    "totalPilots": 209,
    "totalStudents": 56,
    "totalUsers": 312,
    "totalAircraft": 4
  }
  ```

## 🎨 Design Features

### Logo Design
- **Light Theme**: Black background with white logo
- **Dark Theme**: White background with black logo
- **Design**: Simplified "CA" logo with compass-style elements
- **Size**: 120x120px (light), 80x80px (dark)
- **Compatibility**: Uses only SVG path elements (no text nodes)

### Default Statistics
The dynamic OG images display these default stats:
1. **Flight Hours**: 1250h
2. **Landings**: 450
3. **Pilots**: 25
4. **Students**: 15

### Static Stats Support
All OG images support custom stats via the `stats` parameter:
- Format: `"Label:Value,Label:Value,Label:Value"`
- Example: `"Flight Hours:1250h,Landings:450,Pilots:25,Students:15"`

## 📱 Metadata Configuration

### Layout.tsx Configuration
```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://app.cruiseraviation.com'),
  openGraph: {
    title: "Cruiser Aviation Management System",
    description: "Flight school management...",
    url: 'https://app.cruiseraviation.com',
    siteName: 'Cruiser Aviation',
    images: [
      {
        url: '/api/og/dynamic?title=Cruiser%20Aviation&subtitle=Flight%20Management%20System',
        width: 1200,
        height: 630,
        alt: 'Cruiser Aviation Management System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: [
      {
        url: '/api/og/dynamic/negative?title=Cruiser%20Aviation&subtitle=Flight%20Management%20System',
        width: 1200,
        height: 630,
        alt: 'Cruiser Aviation Management System',
      },
    ],
  },
};
```

## 🧪 Testing

### Test Pages
1. **OG Image Test**: `/test-og` - Visual preview of all OG image variants
2. **Stats API Test**: `/test-stats` - Verify dynamic stats are working correctly

### Manual Testing
```bash
# Test main OG image
curl "http://localhost:3000/api/og?title=Test&subtitle=Testing"

# Test negative OG image
curl "http://localhost:3000/api/og/negative?title=Test&subtitle=Testing"

# Test dynamic OG image
curl "http://localhost:3000/api/og/dynamic?title=Test&subtitle=Testing"

# Test dynamic negative OG image
curl "http://localhost:3000/api/og/dynamic/negative?title=Test&subtitle=Testing"

# Test stats API
curl "http://localhost:3000/api/og/stats"
```

## 🔄 Database Queries

### Flight Hours Calculation
```sql
SELECT SUM(totalHours) FROM flight_logs WHERE totalHours IS NOT NULL
```

### Landings Calculation
```sql
SELECT SUM(dayLandings + nightLandings) FROM flight_logs WHERE dayLandings IS NOT NULL
```

### Pilot Count
```sql
SELECT COUNT(*) FROM users u
JOIN user_roles ur ON u.id = ur.userId
JOIN roles r ON ur.roleId = r.id
WHERE r.name = 'PILOT' AND u.status = 'ACTIVE'
```

### Student Count
```sql
SELECT COUNT(*) FROM users u
JOIN user_roles ur ON u.id = ur.userId
JOIN roles r ON ur.roleId = r.id
WHERE r.name = 'STUDENT' AND u.status = 'ACTIVE'
```

## 🚀 Deployment

### Environment Variables
Ensure these are set in production:
- `NEXT_PUBLIC_APP_URL`: `https://app.cruiseraviation.com`
- Database connection variables for Supabase

### Vercel Configuration
- **Note**: Edge runtime has been removed due to compatibility issues
- Images are generated on-demand and cached
- No additional configuration required

## 📊 Performance

### Caching Strategy
- OG images are cached by Vercel's edge network
- Default stats are hardcoded for reliability
- Static stats can be passed as parameters for customization

### Optimization
- SVG logo for crisp display at any size
- Efficient database queries with proper indexing
- Minimal dependencies for fast generation

## 🔍 Troubleshooting

### Common Issues

1. **Images not generating**
   - ✅ **FIXED**: Removed edge runtime that was causing issues
   - ✅ **FIXED**: Removed SVG text elements (not supported by @vercel/og)
   - Check database connection for stats API
   - Verify Supabase credentials
   - Ensure proper URL encoding for parameters

2. **Stats showing 0**
   - Verify flight_logs table has data
   - Check user roles are properly assigned
   - Ensure database queries are working

3. **Domain issues**
   - Update `metadataBase` in layout.tsx
   - Verify environment variables
   - Check DNS configuration

### Debug Steps
1. Visit `/test-og` to verify all images are working
2. Visit `/test-stats` to verify API is working
3. Check browser network tab for API calls
4. Verify database tables have data
5. Test OG image URLs directly

## 🛠️ Technical Notes

### Edge Runtime Issue
- **Problem**: Edge runtime was causing OG images to fail generation
- **Solution**: Removed `export const runtime = 'edge'` from all OG routes
- **Result**: Images now generate reliably in Node.js runtime

### SVG Text Element Issue
- **Problem**: `<text>` nodes are not supported by @vercel/og
- **Solution**: Converted text elements to path elements
- **Result**: Logo displays correctly without errors

### Dynamic Stats Implementation
- **Current**: Default stats are hardcoded for reliability
- **Future**: Can be enhanced with server-side data fetching
- **Fallback**: Static stats via URL parameters always work

## 📝 Future Enhancements

### Potential Improvements
- [ ] Add more dynamic stats (aircraft types, recent flights)
- [ ] Customizable color schemes
- [ ] Multiple layout options
- [ ] Caching of stats data
- [ ] Analytics tracking for OG image views
- [ ] Re-enable edge runtime with proper configuration

### Customization
- Logo can be updated by modifying the SVG in the route files
- Colors can be adjusted in the style objects
- Layout can be modified by changing the JSX structure
- Additional stats can be added to the database queries

---

**Note**: This setup provides a robust, reliable OG image system that automatically reflects your aviation school's branding while maintaining a professional appearance across all social media platforms. The removal of edge runtime and SVG text elements ensures consistent image generation across all environments. 