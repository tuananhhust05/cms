#!/bin/bash

echo "🚀 Setting up CMS Next.js..."

# Check if docker-compose-db.yml exists and services are running
if [ -f "docker-compose-db.yml" ]; then
    echo "📦 Checking database services..."
    docker-compose -f docker-compose-db.yml up -d
fi

# Build and start the application
echo "🏗️  Building application..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Run migrations
echo "🗄️  Running database migrations..."
docker-compose exec cms-next npx prisma migrate dev --name init || echo "Migrations may already exist"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec cms-next npx prisma generate

# Seed database (optional)
read -p "Do you want to seed the database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    docker-compose exec cms-next npx tsx scripts/seed.ts
fi

echo "✅ Setup complete!"
echo "🌐 Application is running at http://localhost:3000"
echo "📧 Default admin credentials:"
echo "   Email: admin@example.com"
echo "   Password: admin123"

