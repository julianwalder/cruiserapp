# Vercel Blob Storage Setup

## Overview
This project now uses Vercel Blob Storage for image uploads instead of file system storage. This provides:
- ✅ **Global CDN** - Images served from edge locations worldwide
- ✅ **Automatic optimization** - Images are optimized automatically
- ✅ **Persistence** - Files survive server restarts and redeploys
- ✅ **Scalability** - No storage limits like file system
- ✅ **Security** - Built-in access control and validation

## Setup Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Link your project to Vercel
```bash
vercel link
```

### 3. Add Blob Storage to your project
```bash
vercel blob create
```

### 4. Environment Variables
The following environment variables will be automatically added to your `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

### 5. Deploy
```bash
vercel --prod
```

## How It Works

### Upload Flow
1. User selects an image in the fleet management interface
2. Image is uploaded to `/api/upload` endpoint
3. Endpoint validates file type and size
4. Image is stored in Vercel Blob with a unique filename
5. Blob URL is returned and stored in the database
6. Image is served directly from Vercel's global CDN

### Benefits Over File System Storage
- **No 404 errors** - Images are always available
- **Better performance** - Global CDN delivery
- **Automatic optimization** - WebP conversion, resizing, etc.
- **No storage limits** - Scalable cloud storage
- **Built-in security** - Access control and validation

## Migration from File System
Existing images stored in the file system will continue to work through the `/api/uploads/` fallback route, but new uploads will use Vercel Blob.

## Cost
Vercel Blob pricing:
- **Free tier**: 1GB storage, 100GB bandwidth/month
- **Pro tier**: $0.10/GB storage, $0.10/GB bandwidth
- **Enterprise**: Custom pricing

For most applications, the free tier is sufficient. 