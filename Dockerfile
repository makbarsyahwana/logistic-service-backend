# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS production

WORKDIR /app

# Install netcat for health checks
RUN apk add --no-cache netcat-openbsd

# Create non-root user for security
RUN addgroup -g 1001 -S bunjs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package.json bun.lockb* ./

# Install only production dependencies
RUN bun install --production

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set ownership to non-root user
RUN chown -R nestjs:bunjs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1 || exit 1

# Start the application with entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
