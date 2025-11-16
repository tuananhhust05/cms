# Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- Network `gobig-services` must exist (created by docker-compose-db.yml)

## Setup Steps

### 1. Start Database Services

```bash
docker-compose -f docker-compose-db.yml up -d
```

### 2. Build and Start Application

```bash
docker-compose up -d --build
```

### 3. Run Database Migrations

```bash
docker-compose exec cms-next npx prisma migrate dev
```

### 4. (Optional) Seed Database

```bash
docker-compose exec cms-next npx tsx scripts/seed.ts
```

## Access the Application

- **URL**: http://localhost:3000
- **Admin Login**:
  - Email: `admin@example.com`
  - Password: `admin123`
- **Editor Login**:
  - Email: `editor@example.com`
  - Password: `editor123`

## Development Mode

The application runs in development mode with hot reload enabled. Any changes to your code will automatically restart the server.

### View Logs

```bash
docker-compose logs -f cms-next
```

### Stop Application

```bash
docker-compose down
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

## Environment Variables

Make sure to set these environment variables in your `.env` file or docker-compose.yml:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`: Redis hostname (redis_frontend)
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: Secret key for JWT tokens

## Troubleshooting

### Database Connection Issues

1. Check if database services are running:
   ```bash
   docker-compose -f docker-compose-db.yml ps
   ```

2. Verify network connectivity:
   ```bash
   docker network inspect gobig-services
   ```

### Hot Reload Not Working

1. Check if volumes are mounted correctly
2. Verify NODE_ENV is set to `development`
3. Check Docker logs for errors

### Prisma Issues

1. Regenerate Prisma Client:
   ```bash
   docker-compose exec cms-next npx prisma generate
   ```

2. Reset database (WARNING: This will delete all data):
   ```bash
   docker-compose exec cms-next npx prisma migrate reset
   ```

