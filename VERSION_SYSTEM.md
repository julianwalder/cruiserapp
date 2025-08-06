# Automatic Version System

This project includes an automatic version management system that dynamically displays version information throughout the application.

## 🚀 Features

- **Dynamic Version Display**: Version number automatically reads from `package.json`
- **Build Information**: Includes build date, time, and git commit details
- **Automatic Version Bumping**: Scripts to increment version numbers
- **CI/CD Integration**: Build info automatically generated during deployment
- **API Endpoint**: `/api/version` endpoint for programmatic access

## 📋 Version Information Displayed

The version system shows:
- **Version Number**: From `package.json` (e.g., "0.1.1")
- **Build Date**: When the application was built
- **Git Commit Hash**: Short commit hash for tracking
- **Environment**: Development, staging, or production

## 🛠️ Usage

### Version Bumping

```bash
# Increment patch version (0.1.0 -> 0.1.1)
npm run version:patch

# Increment minor version (0.1.0 -> 0.2.0)
npm run version:minor

# Increment major version (0.1.0 -> 1.0.0)
npm run version:major
```

### Build Information

```bash
# Generate build info files
npm run build:info

# This runs automatically before build
npm run build
```

### API Access

```bash
# Get version information via API
curl http://localhost:3000/api/version
```

Response:
```json
{
  "success": true,
  "data": {
    "version": "0.1.1",
    "name": "cruiserapp",
    "buildDate": "2025-08-06",
    "buildTime": "13:11:34",
    "commitHash": "2fea858",
    "commitDate": "2025-08-06",
    "environment": "development"
  }
}
```

## 🔧 Implementation Details

### Files Created

1. **`src/lib/version.ts`** - Main version utility functions
2. **`scripts/bump-version.js`** - Version bumping script
3. **`scripts/set-build-info.js`** - Build information generator
4. **`src/app/api/version/route.ts`** - Version API endpoint
5. **`src/lib/build-info.json`** - Generated build information (auto-created)

### Integration Points

- **UserMenu Footer**: Shows version and last updated date
- **Build Process**: Automatically generates build info before deployment
- **Environment Variables**: Supports Vercel and other deployment platforms

## 🚀 CI/CD Integration

### Vercel Deployment

The system automatically works with Vercel deployments. Build information is generated during the build process and includes:

- Git commit hash from Vercel's environment
- Build date and time
- Environment detection

### Custom Deployment

For custom deployments, you can set environment variables:

```bash
NEXT_PUBLIC_COMMIT_HASH=abc1234
NEXT_PUBLIC_COMMIT_DATE=2025-08-06
NEXT_PUBLIC_VERSION=0.1.1
```

## 📱 User Interface

The version information is displayed in the user menu footer:

```
Version 0.1.1
Last updated: 06/08/2025
0.1.1 - 2fea858
```

- **First line**: Version number
- **Second line**: Last updated date (in user's preferred format)
- **Third line**: Version with short commit hash

## 🔄 Workflow

1. **Development**: Version info is generated when running `npm run build:info`
2. **Version Bump**: Use `npm run version:patch|minor|major` before releases
3. **Build**: Build info is automatically generated during `npm run build`
4. **Deployment**: Version information is included in the deployed application

## 🎯 Benefits

- **Automatic Tracking**: No manual version updates needed
- **Deployment Transparency**: Users can see exactly which version they're using
- **Debugging Support**: Commit hash helps identify specific builds
- **User Confidence**: Clear version information builds trust
- **Development Efficiency**: Automated version management saves time 