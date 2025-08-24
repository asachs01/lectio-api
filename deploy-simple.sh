#!/bin/bash

# Simple deployment script for lectio-api
set -e

echo "🚀 Starting deployment process..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t lectio-api:latest .

echo "✅ Docker image built successfully"

# Tag for deployment
docker tag lectio-api:latest lectio-api:production

echo "🎉 Build complete! Next steps:"
echo ""
echo "To deploy to DigitalOcean App Platform:"
echo "1. Go to https://cloud.digitalocean.com/apps"
echo "2. Click 'Create App'"
echo "3. Connect your GitHub repository: github.com/asachs01/lectio-api"
echo "4. Follow the deployment wizard"
echo ""
echo "Or install doctl and run: ./scripts/deploy.sh"
echo ""
echo "The app.yaml file is already configured for deployment."