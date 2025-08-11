#!/bin/bash

# Production startup script for Replit deployment
echo "🚀 Starting CricProAce in production mode..."

# Ensure build artifacts exist
if [ ! -f "dist/index.js" ]; then
    echo "❌ No build artifacts found. Running build first..."
    ./build.sh
fi

# Ensure frontend files are in the correct location
if [ ! -d "server/public" ]; then
    echo "❌ Frontend files not found. Running build first..."
    ./build.sh
fi

# Start the production server
echo "🌐 Starting production server on port 5000..."
NODE_ENV=production node dist/index.js