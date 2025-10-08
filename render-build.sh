#!/bin/bash
set -e

echo "🚀 Starting build process..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run Prisma migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# Build Next.js application
echo "⚡ Building Next.js application..."
npm run build 2>&1 | tee build.log || {
  echo "❌ Build failed! Last 50 lines of output:"
  tail -n 50 build.log
  exit 1
}

# Copy static files for standalone mode
echo "📦 Copying static files for standalone build..."
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

echo "✅ Build completed successfully!"
