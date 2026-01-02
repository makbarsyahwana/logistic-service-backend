# Logistics Service Backend

A RESTful API for managing shipment orders built with NestJS, Prisma, and PostgreSQL.

## Features

- **User Authentication**: JWT-based authentication with role-based access control (RBAC)
- **Order Management**: Create, view, update, and cancel shipment orders
- **Order Tracking**: Track orders by tracking number (public endpoint)
- **Filtering & Pagination**: Filter orders by status, sender, recipient with pagination
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Helmet, CORS, rate limiting, input validation
- **Database Optimization**: Indexed queries for optimal performance

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT with Passport
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Docker & Docker Compose

If you want to run without Docker:

- Node.js >= 18
- PostgreSQL >= 14
- bun

## Quick Start with Docker

Docker Compose is intended for production-style deployments (single `docker-compose.yml`).

1. **Create environment file**

```bash
cp .env.example .env
```

At minimum, set these variables in `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=logistics_db

# Host ports exposed by docker-compose.yml
APP_PORT=3000
DB_PORT=5432
REDIS_PORT=6379

# For running the API locally (without Docker), connect via the exposed ports
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logistics_db?schema=public
REDIS_HOST=localhost

JWT_SECRET=change-me-to-a-long-random-secret
JWT_EXPIRATION=24h

PGADMIN_DEFAULT_EMAIL=admin@logistics.com
PGADMIN_DEFAULT_PASSWORD=admin123
PGADMIN_PORT=5050
```

2. **Start all services**

```bash
docker-compose up -d --build
```

Services will be available at:
- **API**: http://localhost:3000 (when `APP_PORT=3000`)
- **Swagger Docs**: http://localhost:3000/api/docs
- **pgAdmin**: http://localhost:5050 (when `PGADMIN_PORT=5050`)

Notes:

- **Postgres and Redis are exposed to the host** via `DB_PORT` / `REDIS_PORT`.
- **pgAdmin is bound to localhost** (`127.0.0.1`) by default.
- Change the exposed API port by setting `APP_PORT`. Example: `APP_PORT=8080` exposes the app on `http://localhost:8080`.
- The `app` container uses Docker-internal hosts (`postgres`, `redis`) via `docker-compose.yml` overrides, even if your `.env` uses `localhost` for local development.

## CI/CD (Cloud agnostic)

This repository includes:

- `CI` workflow (`.github/workflows/ci.yml`) for checks only (format, lint, tests, build)
- `Release` workflow (`.github/workflows/release.yml`) triggered manually to build/push Docker images to GHCR and optionally deploy over SSH

### Required GitHub Environment secrets

Create GitHub Environments named `development`, `staging`, and `production`, then configure these secrets per environment:

- **DEPLOY_HOST**: Hostname/IP of your server
- **DEPLOY_USER**: SSH username
- **DEPLOY_SSH_PRIVATE_KEY**: Private key used by GitHub Actions (recommend a dedicated deploy key)
- **DEPLOY_COMMAND**: Shell commands executed on the server to perform deployment

Optional:

- **DEPLOY_PORT**: SSH port (default: `22`)
- **DEPLOY_KNOWN_HOSTS**: Contents of a `known_hosts` entry for strict host verification (recommended). If not provided, the workflow will use `ssh-keyscan`.
- **DEPLOY_REGISTRY_USERNAME**: Registry username for pulling private images (optional)
- **DEPLOY_REGISTRY_TOKEN**: Registry token/password for pulling private images (optional)

### Example DEPLOY_COMMAND (Docker Compose on any VM)

This example assumes your server already has:

- Docker + Docker Compose installed
- A deployment directory containing a `docker-compose.yml` that runs this app image

Example `DEPLOY_COMMAND`:

```sh
set -euo pipefail

APP_DIR=/opt/logistics-api
cd "$APP_DIR"

# Optional: authenticate to a registry (recommended if your image is private)
if [ -n "${DEPLOY_REGISTRY_TOKEN:-}" ] && [ -n "${DEPLOY_REGISTRY_USERNAME:-}" ]; then
  echo "$DEPLOY_REGISTRY_TOKEN" | docker login ghcr.io -u "$DEPLOY_REGISTRY_USERNAME" --password-stdin
fi

# Pull the exact image built by CI for this environment
docker pull "$IMAGE_REF"

# If your compose file references an image, update it via env or override. Common pattern:
# image: ${IMAGE_REF}
export IMAGE_REF

docker compose up -d
docker image prune -f
```

Your `DEPLOY_COMMAND` can also trigger migrations explicitly (if you want) before restarting the app.

### Docker Commands

```bash
docker-compose up -d --build                                # Start all services (app + db + pgAdmin + redis)
docker-compose down                                        # Stop all services
docker-compose logs -f                                     # View logs
docker-compose down -v --rmi all --remove-orphans          # Clean containers, volumes, and images

docker-compose exec app bunx prisma migrate deploy          # Run database migrations
docker-compose exec app bunx prisma db seed                 # Seed the database

docker-compose exec app sh                                  # Open shell in app container
docker-compose exec postgres psql -U postgres -d logistics_db # Open PostgreSQL shell
```

Docker is intentionally kept production-oriented. For local development, use the "Installation (Without Docker)" section below.

## Installation (Without Docker)

1. **Clone the repository**
```bash
git clone <repository-url>
cd logistic-service-backend
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/logistics_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
NODE_ENV=development
```

4. **Create database and run migrations**
```bash
bunx prisma migrate dev
```

5. **Generate Prisma client**
```bash
bunx prisma generate
```

6. **Seed the database (optional)**
```bash
bun run prisma:seed
```

Default users:
- Admin: `admin@logistics.com` / `admin123`
- User: `user@logistics.com` / `user123`

## Running the Application

```bash
# Development
bun run start:dev

# Production
bun run build
bun run start:prod
```

## API Documentation

After starting the application, visit:
- **Swagger UI**: http://localhost:3000/api/docs

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |

### Users (Admin Only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users/me` | Get current user profile | JWT |
| GET | `/api/v1/users` | Get all users | JWT (Admin) |
| GET | `/api/v1/users/:id` | Get user by ID | JWT (Admin) |
| PATCH | `/api/v1/users/:id/role` | Update user role | JWT (Admin) |
| DELETE | `/api/v1/users/:id` | Delete user | JWT (Admin) |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders` | Create new order | JWT |
| GET | `/api/v1/orders` | Get all orders (with filters) | JWT |
| GET | `/api/v1/orders/:id` | Get order by ID | JWT |
| GET | `/api/v1/orders/track/:trackingNumber` | Track order by tracking number | No |
| PATCH | `/api/v1/orders/:id/status` | Update order status | JWT (Admin) |
| PATCH | `/api/v1/orders/:id/cancel` | Cancel order | JWT |

### Query Parameters for Orders

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | Filter by status: PENDING, IN_TRANSIT, DELIVERED, CANCELED |
| `senderName` | string | Filter by sender name (partial match) |
| `recipientName` | string | Filter by recipient name (partial match) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

## Order Statuses

- `PENDING` - Order created, awaiting processing
- `IN_TRANSIT` - Order is being shipped
- `DELIVERED` - Order has been delivered
- `CANCELED` - Order has been canceled

## RBAC (Role-Based Access Control)

### Roles

- **ADMIN**: Full access to all endpoints
- **USER**: Can manage their own orders

### Permissions

| Action | Admin | User |
|--------|-------|------|
| Create Order | ✅ | ✅ |
| View Own Orders | ✅ | ✅ |
| View All Orders | ✅ | ❌ |
| Track Order (Public) | ✅ | ✅ |
| Update Order Status | ✅ | ❌ |
| Cancel Own Order | ✅ | ✅ |
| Manage Users | ✅ | ❌ |

## Database Schema

### Users Table
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE, INDEXED)
- password (VARCHAR)
- name (VARCHAR)
- role (ENUM: ADMIN, USER, INDEXED)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Orders Table
```sql
- id (UUID, PK)
- tracking_number (VARCHAR, UNIQUE, INDEXED)
- sender_name (VARCHAR, INDEXED)
- recipient_name (VARCHAR, INDEXED)
- origin (VARCHAR)
- destination (VARCHAR)
- status (ENUM, INDEXED)
- user_id (UUID, FK, INDEXED)
- created_at (TIMESTAMP, INDEXED)
- updated_at (TIMESTAMP)
```

## Security Features

1. **Authentication**: JWT tokens with configurable expiration
2. **Authorization**: Role-based access control
3. **Session Management**: Redis-based session tracking with token blacklisting
4. **Input Validation**: class-validator for request validation
5. **Rate Limiting**: Throttler to prevent abuse (100 requests/minute)
6. **Security Headers**: Helmet middleware
7. **CORS**: Configurable cross-origin resource sharing
8. **Password Hashing**: bcrypt with salt rounds
9. **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT signals

## Performance Optimizations

1. **Database Indexes**: Optimized indexes on frequently queried columns
2. **Redis Caching**: Cache frequently accessed data (order tracking)
3. **Pagination**: Built-in pagination for list endpoints
4. **Select Queries**: Only selecting required fields (no over-fetching)
5. **Connection Pooling**: Prisma and Redis connection pooling
6. **Parallel Queries**: Using Promise.all for independent queries

## Redis Features

### Caching
- Order tracking results cached for 5 minutes
- Automatic cache invalidation on order updates

### Session Management
- JWT token session tracking
- Token blacklisting for logout
- Multi-device session management
- Session activity tracking

## Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Detailed health status (DB, Redis) |
| `GET /api/v1/health/live` | Kubernetes liveness probe |
| `GET /api/v1/health/ready` | Kubernetes readiness probe |

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/orders"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "error": "BadRequest",
    "path": "/api/v1/orders",
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## Testing

```bash
# Unit tests
bun test

# Test with watch
bun test --watch

# Test coverage
bun test --coverage
```

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/              # Data transfer objects
│   ├── strategies/       # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── common/               # Shared utilities
│   ├── decorators/       # Custom decorators (Roles, CurrentUser)
│   ├── filters/          # Exception filters
│   ├── guards/           # Custom guards (RolesGuard)
│   ├── interceptors/     # Logging, Transform interceptors
│   └── dto/              # Shared DTOs (Pagination)
├── health/               # Health check module
│   ├── health.controller.ts
│   ├── health.module.ts
│   └── health.service.ts
├── orders/               # Orders module
│   ├── dto/              # Data transfer objects
│   ├── orders.controller.ts
│   ├── orders.module.ts
│   └── orders.service.ts
├── prisma/               # Prisma module
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── prisma-query.helper.ts
├── redis/                # Redis module
│   ├── redis.module.ts
│   ├── redis.service.ts
│   ├── session.service.ts
│   └── cache-keys.ts
├── users/                # Users module
│   ├── dto/              # Data transfer objects
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## Engineering Recommendations

### For Production Deployment

1. **Environment Configuration**
   - Use strong JWT secrets (32+ characters)
   - Configure proper CORS origins
   - Set NODE_ENV=production

2. **Database**
   - Enable connection pooling limits
   - Set up read replicas for scaling
   - Regular backups and point-in-time recovery
   - Monitor slow queries

3. **Redis**
   - Enable Redis persistence (AOF/RDB)
   - Set up Redis Sentinel or Cluster for HA
   - Configure maxmemory and eviction policies

4. **Monitoring & Observability**
   - Integrate APM (DataDog, New Relic, or similar)
   - Set up structured logging (JSON format)
   - Create dashboards for key metrics
   - Configure alerting for errors and latency

5. **Security**
   - Enable HTTPS only
   - Implement API versioning strategy
   - Add request signing for sensitive operations
   - Regular security audits and dependency updates

6. **Scaling**
   - Horizontal scaling with load balancer
   - Stateless design (sessions in Redis)
   - Consider message queues for async operations
   - Implement circuit breakers for external services

### Future Enhancements

- [ ] Add order history/audit trail
- [ ] Implement webhooks for status updates
- [ ] Add file attachments for orders
- [ ] Multi-tenant support
- [ ] GraphQL API option
- [ ] WebSocket for real-time tracking
- [ ] Email/SMS notifications
- [ ] Batch order operations
- [ ] Export functionality (CSV/PDF)
- [ ] API rate limiting per user tier

## License

MIT
