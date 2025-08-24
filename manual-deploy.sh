#!/bin/bash

echo "📋 Manual Deployment Instructions for Lectio API"
echo "================================================"
echo ""
echo "Since the GitHub Actions deployment is encountering issues,"
echo "here are the steps to deploy manually:"
echo ""
echo "Option 1: DigitalOcean Web Console (Easiest)"
echo "---------------------------------------------"
echo "1. Go to: https://cloud.digitalocean.com/apps"
echo "2. Click 'Create App'"
echo "3. Choose 'GitHub' as the source"
echo "4. Select repository: asachs01/lectio-api"
echo "5. Select branch: main"
echo "6. DigitalOcean will detect the app.yaml file"
echo "7. Review and create the app"
echo ""
echo "Option 2: Using doctl CLI"
echo "-------------------------"
echo "# First, install doctl if not already installed:"
echo "# macOS: brew install doctl"
echo "# Linux: snap install doctl"
echo ""
echo "# Then run these commands:"
cat << 'EOF'
# Authenticate with your token
doctl auth init
# Enter token: (from your .env file)

# Create the app
doctl apps create --spec app.yaml

# Or if app exists, update it:
APP_ID=$(doctl apps list --format ID,Name --no-header | grep "lectio-api" | awk '{print $1}')
if [ ! -z "$APP_ID" ]; then
  doctl apps update $APP_ID --spec app.yaml
  doctl apps create-deployment $APP_ID
else
  doctl apps create --spec app.yaml
fi

# Check deployment status
doctl apps list
EOF
echo ""
echo "Option 3: Direct Link"
echo "---------------------"
echo "Click this link to create an app with your GitHub repo:"
echo "https://cloud.digitalocean.com/apps/new?repo=https://github.com/asachs01/lectio-api"
echo ""
echo "Configuration Notes:"
echo "--------------------"
echo "- The app.yaml file is already configured"
echo "- PostgreSQL and Redis will be provisioned automatically"
echo "- Environment variables are set in the app.yaml"
echo "- The Dockerfile handles the build process"
echo ""
echo "After Deployment:"
echo "-----------------"
echo "1. Run database migrations"
echo "2. Seed the database with: node scripts/seed.js"
echo "3. Access the API at the provided URL"
echo "4. Check health at: https://your-app-url/health"