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

# Verify .next directory exists
echo "🔍 Verifying build output..."
if [ -d ".next" ]; then
  echo "✅ .next directory found"
  ls -la .next/ | head -20
else
  echo "❌ .next directory not found!"
  exit 1
fi

echo "✅ Build completed successfully!"
