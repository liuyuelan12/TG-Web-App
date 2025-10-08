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
npm run build

echo "✅ Build completed successfully!"
