# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Build the MCP server mounted at /mcp
WORKDIR /app/mcp-server
RUN npm ci --ignore-scripts && npm run build
WORKDIR /app

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# Copy data and config files
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/ormconfig.js ./ormconfig.js
# MCP server (ESM) and its production dependencies, used by /mcp
COPY mcp-server/package*.json ./mcp-server/
RUN cd mcp-server && npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
# Copy startup script
COPY scripts/start-production.sh ./scripts/start-production.sh
RUN chmod +x ./scripts/start-production.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application with migrations
CMD ["/bin/sh", "./scripts/start-production.sh"]