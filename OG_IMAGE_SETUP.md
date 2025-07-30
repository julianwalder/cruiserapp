# OG Image Generation Setup

This document explains how to use the Open Graph (OG) image generation feature in the Cruiser aviation app.

## Available Routes

### 1. Simple Route (`/api/og/simple`)
- **Status**: ✅ Working
- **Features**: Clean, simple design with title, subtitle, and stats
- **Best for**: Basic social media sharing

**Usage:**
```
/api/og/simple?title=Your Title&subtitle=Your Subtitle&stats=Flights:150,Hours:1,250
```

### 2. Basic Route (`/api/og`)
- **Status**: ✅ Working
- **Features**: Aviation-themed design with plane icon, gradients, and stats
- **Best for**: General aviation content

**Usage:**
```
/api/og?title=Your Title&subtitle=Your Subtitle&type=default&stats=Flights:150,Hours:1,250
```

### 3. Advanced Route (`/api/og/advanced`)
- **Status**: ✅ Working
- **Features**: Multiple layouts, stats display, user information
- **Best for**: Dashboard and detailed content

**Usage:**
```
/api/og/advanced?title=Dashboard&type=dashboard&user=John Doe&stats=Flights:150,Hours:1,250
```

### 4. Negative Route (`/api/og/negative`)
- **Status**: ✅ Working
- **Features**: Inverted colors - black background with white elements
- **Best for**: Dark theme applications or high contrast needs

**Usage:**
```
/api/og/negative?title=Your Title&subtitle=Your Subtitle&stats=Flights:150,Hours:1,250
```

### 5. Negative Advanced Route (`/api/og/negative/advanced`)
- **Status**: ✅ Working
- **Features**: Inverted colors with multiple layouts and stats
- **Best for**: Dark theme dashboards and detailed content

**Usage:**
```
/api/og/negative/advanced?title=Dashboard&type=dashboard&user=John Doe&stats=Flights:150,Hours:1,250
```

## Implementation

### Stats Format

All routes support a `stats` parameter that displays key metrics in card format:

**Format:** `Label:Value,Label:Value,Label:Value`

**Examples:**
- `Flights:150,Hours:1,250,Aircraft:12`
- `Students:45,Instructors:8,Pass Rate:95%`
- `Revenue:$125K,Expenses:$85K,Profit:$40K`

**Features:**
- Automatically splits by comma and colon
- Displays value prominently with label below
- Responsive card layout
- Consistent styling across all routes

### Meta Tags Example

Add these meta tags to your page `<head>` section:

```html
<head>
  <title>Your Page Title</title>
  <meta property="og:title" content="Your Page Title" />
  <meta property="og:description" content="Your page description" />
  <meta property="og:image" content="https://your-domain.com/api/og/simple?title=Your Title&subtitle=Your Subtitle" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Your Page Title" />
  <meta name="twitter:description" content="Your page description" />
  <meta name="twitter:image" content="https://your-domain.com/api/og/simple?title=Your Title&subtitle=Your Subtitle" />
</head>
```

### Dynamic Implementation

For dynamic pages, you can generate the OG image URL based on page content:

```typescript
// Example for a flight log page
const generateOGUrl = (flightData: any) => {
  const params = new URLSearchParams({
    title: `Flight ${flightData.id}`,
    subtitle: `${flightData.origin} → ${flightData.destination}`,
    stats: `Flights:${flightData.totalFlights},Hours:${flightData.totalHours},Aircraft:${flightData.aircraftCount}`,
  });
  
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/og/simple?${params.toString()}`;
};
```

## Testing

### Local Testing
1. Visit `http://localhost:3000/test-og`
2. Use the interactive form to test different parameters
3. Copy generated URLs for use in meta tags

### Social Media Testing
- **Facebook**: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **Twitter**: [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- **LinkedIn**: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Troubleshooting

### Common Issues

1. **Images not appearing**: Check that the URL is accessible and returns a 200 status
2. **Wrong image size**: Ensure the URL includes proper parameters
3. **Caching issues**: Social platforms cache images, use debuggers to refresh

### Debugging

Test the OG image URL directly in your browser:
```
http://localhost:3000/api/og/simple?title=Test&subtitle=Debug
```

### Performance

- Images are automatically cached by Vercel's edge network
- First generation may take 1-2 seconds
- Subsequent requests are served from cache

## Customization

### Adding New Layouts

1. Create a new route in `src/app/api/og/[layout-name]/route.tsx`
2. Follow the pattern of existing routes
3. Use only supported CSS properties (flex, block, none, -webkit-box)
4. Avoid complex fonts or external resources initially

### Supported CSS Properties

- `display`: flex, block, none, -webkit-box
- `flexDirection`, `alignItems`, `justifyContent`
- `position`, `top`, `left`, `right`, `bottom`
- `width`, `height`, `padding`, `margin`
- `backgroundColor`, `color`, `border`
- `fontSize`, `fontWeight`, `textAlign`
- `borderRadius`, `borderWidth`

### Limitations

- No `inline-flex` or `grid` display
- Limited font support (use system fonts initially)
- Maximum bundle size: 500KB
- No external image loading in basic setup

## Deployment

The OG image routes will work automatically when deployed to Vercel. No additional configuration is required.

## Future Enhancements

- [x] Fix advanced route with proper CSS compatibility
- [x] Add negative color scheme variants
- [ ] Add more layout templates
- [ ] Support for custom images
- [ ] Dynamic color schemes
- [ ] Multi-language support
- [ ] Custom font loading 