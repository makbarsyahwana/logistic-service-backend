.PHONY: help build up down logs restart clean dev prod migrate seed shell db-shell

# Default target
help:
	@echo "Logistics Service - Docker Commands"
	@echo ""
	@echo "Usage:"
	@echo "  make dev          Start development environment (DB + pgAdmin + Redis only)"
	@echo "  make prod         Start production environment (all services)"
	@echo "  make build        Build Docker images"
	@echo "  make up           Start all services"
	@echo "  make down         Stop all services"
	@echo "  make logs         View logs"
	@echo "  make restart      Restart all services"
	@echo "  make clean        Remove all containers, volumes, and images"
	@echo "  make migrate      Run database migrations"
	@echo "  make seed         Seed the database"
	@echo "  make shell        Open shell in app container"
	@echo "  make db-shell     Open psql shell in database container"

# Development mode - only starts database services
dev:
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "Development services started!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgAdmin:    http://localhost:5050"
	@echo "  Redis:      localhost:6379"
	@echo ""
	@echo "Run 'npm run start:dev' to start the application locally"

# Production mode - starts all services including app
prod:
	@echo "Starting production environment..."
	docker-compose up -d --build
	@echo ""
	@echo "Production services started!"
	@echo "  API:        http://localhost:3000"
	@echo "  Swagger:    http://localhost:3000/api/docs"
	@echo "  pgAdmin:    http://localhost:5050"

# Build images
build:
	docker-compose build

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# View logs
logs:
	docker-compose logs -f

# Restart services
restart: down up

# Clean everything
clean:
	docker-compose down -v --rmi all --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans

# Run migrations
migrate:
	docker-compose exec app npx prisma migrate deploy

# Seed database
seed:
	docker-compose exec app npx prisma db seed

# Open shell in app container
shell:
	docker-compose exec app sh

# Open psql shell
db-shell:
	docker-compose exec postgres psql -U postgres -d logistics_db
