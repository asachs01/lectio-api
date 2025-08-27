#!/bin/bash

# Build and package MCP server as .dxt file

set -e

echo "Building MCP server..."
npm run build

echo "Creating .dxt package..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="lectio-api-mcp"
VERSION=$(node -p "require('./package.json').version")
DXT_FILE="${PACKAGE_NAME}-${VERSION}.dxt"

# Copy necessary files to temp directory
cp -r dist "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || true
cp mcp.json "$TEMP_DIR/"
cp README.md "$TEMP_DIR/" 2>/dev/null || true

# Create node_modules with production dependencies
cd "$TEMP_DIR"
npm ci --only=production

# Create the .dxt file (which is just a tarball)
tar -czf "../$DXT_FILE" .

# Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "Created $DXT_FILE successfully!"
echo ""
echo "To install this MCP server:"
echo "  1. Copy $DXT_FILE to your MCP extensions directory"
echo "  2. Extract with: tar -xzf $DXT_FILE"
echo "  3. Configure in your MCP client settings"