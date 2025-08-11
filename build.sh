#!/bin/bash

# Production build script for Replit deployment
echo "🔨 Building application for production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf server/public

# Build the frontend with Vite
echo "⚛️ Building frontend..."
vite build

# Build the backend with esbuild
echo "🖥️ Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Copy built frontend files to where the server expects them
echo "📂 Copying frontend files to server/public..."
mkdir -p server/public
cp -r dist/public/* server/public/

echo "✅ Build completed successfully!"
echo "📍 Frontend files are now available in server/public/"
echo "📍 Backend file is available at dist/index.js"