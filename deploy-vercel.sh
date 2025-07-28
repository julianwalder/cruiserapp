#!/bin/bash

echo "🚀 Deploying to Vercel..."

# Build the application
echo "📦 Building application..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod --yes

echo "✅ Deployment complete!" 