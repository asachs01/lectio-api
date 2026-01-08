#!/bin/bash

# Build and package MCP server as .mcpb file for Claude Desktop
# Uses the official mcpb CLI tool

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building Lectionary API MCP Server...${NC}"

# Step 1: Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/
rm -f *.mcpb

# Step 2: Build TypeScript
echo "Compiling TypeScript..."
npm run build

# Step 3: Create a staging directory with only necessary files
echo "Preparing bundle contents..."
STAGING_DIR=$(mktemp -d)
trap "rm -rf $STAGING_DIR" EXIT

# Copy manifest
cp manifest.json "$STAGING_DIR/"

# Copy compiled code
cp -r dist "$STAGING_DIR/"

# Copy package files for npm install
cp package.json "$STAGING_DIR/"
cp package-lock.json "$STAGING_DIR/" 2>/dev/null || true

# Install production dependencies only
echo "Installing production dependencies..."
cd "$STAGING_DIR"
npm ci --only=production --silent

# Remove unnecessary files from node_modules to reduce size
echo "Optimizing bundle size..."
find node_modules -name "*.md" -delete 2>/dev/null || true
find node_modules -name "*.ts" -not -name "*.d.ts" -delete 2>/dev/null || true
find node_modules -name "LICENSE*" -delete 2>/dev/null || true
find node_modules -name "CHANGELOG*" -delete 2>/dev/null || true
find node_modules -name ".npmignore" -delete 2>/dev/null || true
find node_modules -name ".eslintrc*" -delete 2>/dev/null || true
find node_modules -name "tsconfig.json" -delete 2>/dev/null || true
rm -rf node_modules/**/test 2>/dev/null || true
rm -rf node_modules/**/tests 2>/dev/null || true
rm -rf node_modules/**/__tests__ 2>/dev/null || true

cd "$SCRIPT_DIR"

# Step 4: Pack using mcpb
echo "Creating MCPB bundle..."
VERSION=$(node -p "require('./package.json').version")
OUTPUT_FILE="lectio-api-mcp-${VERSION}.mcpb"

mcpb pack "$STAGING_DIR" "$OUTPUT_FILE"

# Step 5: Validate the bundle
echo "Validating bundle..."
mcpb info "$OUTPUT_FILE"

# Get file size
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo -e "${GREEN}Successfully created: ${OUTPUT_FILE} (${SIZE})${NC}"
echo ""
echo "To install in Claude Desktop:"
echo "  1. Double-click the .mcpb file, or"
echo "  2. Go to Settings > Extensions > Install Extension"
echo ""
echo "To verify the bundle:"
echo "  mcpb info $OUTPUT_FILE"
