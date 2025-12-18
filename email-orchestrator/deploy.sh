#!/bin/bash
# deploy.sh

echo "🚀 Starting Email Orchestrator Deployment..."

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install it first."
    exit 1
fi

# Create necessary directories
mkdir -p ./credentials ./logs ./n8n-workflows

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

echo "✅ Deployment completed!"
echo ""
echo "📊 Dashboard: http://localhost:3000/admin/queues"
echo "🔌 API: http://localhost:3000/api/automation"
echo "📈 Redis UI: http://localhost:8081"
echo "🗄️  MongoDB UI: http://localhost:8082"
echo "🤖 n8n: http://localhost:5678"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f api     # View API logs"
echo "   docker-compose logs -f worker  # View worker logs"
echo "   docker-compose down           # Stop all services"
echo "   docker-compose restart api    # Restart API"