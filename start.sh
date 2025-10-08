#!/bin/bash
set -e

echo "🚀 Starting application..."

# Check if .next directory exists
if [ ! -d ".next" ]; then
  echo "⚠️  .next directory not found!"
  echo "📊 Current directory: $(pwd)"
  echo "📂 Directory contents:"
  ls -la
  
  echo ""
  echo "❌ Build artifacts missing. This should not happen in production."
  echo "Please check Render build configuration."
  exit 1
fi

echo "✅ .next directory found, starting Next.js with memory limit..."
# Limit Node.js to 450MB to fit in 512MB container
exec node --max-old-space-size=450 ./node_modules/.bin/next start
