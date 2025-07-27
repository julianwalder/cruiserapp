#!/bin/bash

echo "🚀 Deploying to Cloudflare Pages..."

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Cloudflare Pages
echo "🌐 Deploying to Cloudflare Pages..."
npx wrangler pages deploy .next --project-name=cruiserapp

echo "✅ Deployment complete!" 