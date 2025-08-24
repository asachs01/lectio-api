#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="lectio-api"
APP_SPEC_FILE="app.yaml"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if doctl is installed
check_doctl() {
    if ! command -v doctl &> /dev/null; then
        print_message "$RED" "Error: doctl CLI is not installed."
        print_message "$YELLOW" "Please install doctl from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        exit 1
    fi
}

# Function to check if authenticated
check_auth() {
    if ! doctl auth list &> /dev/null; then
        print_message "$RED" "Error: Not authenticated with DigitalOcean."
        print_message "$YELLOW" "Please run: doctl auth init"
        exit 1
    fi
}

# Function to validate app spec
validate_spec() {
    if [ ! -f "$APP_SPEC_FILE" ]; then
        print_message "$RED" "Error: App spec file $APP_SPEC_FILE not found."
        exit 1
    fi
    
    print_message "$GREEN" "Validating app spec..."
    if doctl apps spec validate "$APP_SPEC_FILE"; then
        print_message "$GREEN" "✓ App spec is valid"
    else
        print_message "$RED" "✗ App spec validation failed"
        exit 1
    fi
}

# Function to check if app exists
app_exists() {
    doctl apps list --format Name --no-header | grep -q "^${APP_NAME}$"
}

# Function to create app
create_app() {
    print_message "$GREEN" "Creating new app: $APP_NAME"
    
    APP_ID=$(doctl apps create --spec "$APP_SPEC_FILE" --format ID --no-header)
    
    if [ -z "$APP_ID" ]; then
        print_message "$RED" "Failed to create app"
        exit 1
    fi
    
    print_message "$GREEN" "✓ App created with ID: $APP_ID"
    echo "$APP_ID" > .app-id
    
    # Wait for app to be ready
    print_message "$YELLOW" "Waiting for app to be deployed..."
    doctl apps create-deployment "$APP_ID" --wait
}

# Function to update existing app
update_app() {
    print_message "$GREEN" "Updating existing app: $APP_NAME"
    
    # Get app ID
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${APP_NAME}$" | awk '{print $1}')
    
    if [ -z "$APP_ID" ]; then
        print_message "$RED" "Failed to get app ID"
        exit 1
    fi
    
    print_message "$GREEN" "Found app ID: $APP_ID"
    echo "$APP_ID" > .app-id
    
    # Update app spec
    doctl apps update "$APP_ID" --spec "$APP_SPEC_FILE"
    
    # Create a new deployment
    print_message "$YELLOW" "Creating new deployment..."
    DEPLOYMENT_ID=$(doctl apps create-deployment "$APP_ID" --format ID --no-header --wait)
    
    print_message "$GREEN" "✓ Deployment completed: $DEPLOYMENT_ID"
}

# Function to get app URL
get_app_url() {
    if [ -f .app-id ]; then
        APP_ID=$(cat .app-id)
        APP_URL=$(doctl apps get "$APP_ID" --format DefaultIngress --no-header)
        
        if [ ! -z "$APP_URL" ]; then
            print_message "$GREEN" "App URL: https://$APP_URL"
            echo "https://$APP_URL" > .app-url
        fi
    fi
}

# Function to show app logs
show_logs() {
    if [ -f .app-id ]; then
        APP_ID=$(cat .app-id)
        print_message "$YELLOW" "Recent logs:"
        doctl apps logs "$APP_ID" --tail 20
    fi
}

# Function to set secrets
set_secrets() {
    if [ -f .env.production ]; then
        print_message "$GREEN" "Setting production secrets from .env.production"
        
        if [ -f .app-id ]; then
            APP_ID=$(cat .app-id)
            
            # Read .env.production and set secrets
            while IFS='=' read -r key value; do
                # Skip comments and empty lines
                if [[ ! "$key" =~ ^# ]] && [ ! -z "$key" ]; then
                    # Only set specific secrets
                    case "$key" in
                        JWT_SECRET|DB_PASSWORD|REDIS_PASSWORD)
                            print_message "$YELLOW" "Setting secret: $key"
                            doctl apps update "$APP_ID" --spec <(cat "$APP_SPEC_FILE" | \
                                yq eval ".services[0].envs += [{\"key\": \"$key\", \"value\": \"$value\", \"type\": \"SECRET\"}]" -)
                            ;;
                    esac
                fi
            done < .env.production
        fi
    else
        print_message "$YELLOW" "No .env.production file found. Secrets must be set manually in DigitalOcean dashboard."
    fi
}

# Main deployment flow
main() {
    print_message "$GREEN" "Starting deployment process for $APP_NAME"
    
    # Check prerequisites
    check_doctl
    check_auth
    validate_spec
    
    # Deploy or update app
    if app_exists; then
        update_app
    else
        create_app
    fi
    
    # Set secrets if available
    set_secrets
    
    # Get app URL
    get_app_url
    
    # Show recent logs
    show_logs
    
    print_message "$GREEN" "Deployment complete!"
    
    if [ -f .app-url ]; then
        print_message "$GREEN" "Access your API at: $(cat .app-url)"
        print_message "$YELLOW" "Test the health endpoint: $(cat .app-url)/health"
    fi
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    logs)
        show_logs
        ;;
    url)
        get_app_url
        ;;
    destroy)
        if [ -f .app-id ]; then
            APP_ID=$(cat .app-id)
            print_message "$YELLOW" "Destroying app with ID: $APP_ID"
            doctl apps delete "$APP_ID" --force
            rm -f .app-id .app-url
            print_message "$GREEN" "App destroyed"
        else
            print_message "$RED" "No app ID found"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|logs|url|destroy}"
        exit 1
        ;;
esac