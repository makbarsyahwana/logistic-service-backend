# Build stage
FROM oven/bun:1.3.4 AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Generate Prisma client
COPY prisma ./prisma/
RUN bunx prisma generate

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.3.4 AS production

WORKDIR /app

# Install curl for health checks
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 bunjs \
    && useradd -u 1001 -g bunjs -m -s /bin/sh nestjs

# Copy package files
COPY package.json bun.lock* ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
RUN chown -R nestjs:bunjs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD sh -c "curl -fsS http://localhost:${PORT:-3000}/api/v1/health/live || exit 1"

# Start the application (migrations are controlled externally)
CMD ["bun", "dist/src/main.js"]
