#!/bin/bash

# NeonBrush File Server - Quick Start Script

echo "🎨 NeonBrush File Server - Quick Start"
echo "====================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Ask user for environment
echo "Choose your environment:"
echo "1) Development (hot reload)"
echo "2) Production (optimized build)"
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🚀 Starting development environment..."
        docker-compose -f docker-compose.dev.yml up --build
        ;;
    2)
        echo "🚀 Starting production environment..."
        docker-compose up --build -d
        echo "✅ Application is running!"
        echo "📱 Frontend: http://localhost:3000"
        echo "🔗 Backend API: http://localhost:3001"
        echo ""
        echo "To stop the application, run: docker-compose down"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac
