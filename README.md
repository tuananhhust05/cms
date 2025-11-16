# CMS Next.js

Modern Content Management System built with Next.js, PostgreSQL, and Redis.

## Features

- 🎨 Apple-style design with pure CSS
- 🔐 Authentication with role-based permissions (Admin, Editor, Viewer)
- 📝 Blog post management with categories and tags
- ⚡ Redis caching for performance
- 🐳 Docker support with hot reload
- 📊 Admin dashboard with statistics
- 🎯 Modular architecture for easy extension

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Styling**: Pure CSS (Apple-inspired design)
- **Runtime**: Node.js 22

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 22 (for local development)

### Setup

1. **Start the database services** (if not already running):
   ```bash
   docker-compose -f docker-compose-db.yml up -d
   ```

2. **Build and start the application**:
   ```bash
   docker-compose up -d --build
   ```

3. **Run database migrations**:
   ```bash
   docker-compose exec cms-next npx prisma migrate dev
   ```

4. **Seed the database** (optional):
   ```bash
   docker-compose exec cms-next npx tsx scripts/seed.ts
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Default admin credentials:
     - Email: `admin@example.com`
     - Password: `admin123`

### Development

The application runs in development mode with hot reload enabled. Any changes to the code will automatically restart the server.

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:c4f1f23e9a8d47bfb2e6e65c18fd91f12@postgress_frontend:5432/frontend_db
REDIS_HOST=redis_frontend
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
```

### Database Management

- **Generate Prisma Client**: `npx prisma generate`
- **Create migration**: `npx prisma migrate dev`
- **Open Prisma Studio**: `npx prisma studio`

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── login/             # Login page
│   └── globals.css        # Global styles
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication helpers
│   ├── middleware.ts    # Request middleware
│   ├── prisma.ts        # Prisma client
│   └── redis.ts         # Redis client
├── prisma/               # Prisma schema and migrations
├── scripts/              # Utility scripts
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Docker Compose configuration
```

## User Roles

- **ADMIN**: Full access to all features including user management
- **EDITOR**: Can create, edit, and publish posts
- **VIEWER**: Read-only access

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/posts` - List all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/[id]` - Get post by ID
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag

## Future Enhancements

- Media upload functionality
- Comment system
- Public API endpoints
- Advanced search
- SEO optimization
- Multi-language support

## License

MIT

