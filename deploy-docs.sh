#!/bin/bash

# Script to deploy Fern documentation
# Run this after logging in with: fern login

echo "Building and deploying Fern documentation..."

# Check if logged in
if ! fern whoami &>/dev/null; then
    echo "Please login to Fern first with: fern login"
    exit 1
fi

# Validate configuration
echo "Validating Fern configuration..."
if ! fern check; then
    echo "Fern configuration has errors. Please fix them before deploying."
    exit 1
fi

# Generate and publish documentation
echo "Generating documentation..."
fern generate --docs

echo "Documentation deployment initiated!"
echo "Check the status at: https://lectio-api.docs.buildwithfern.com"