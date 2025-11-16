#!/bin/bash

# Docker Start Script for Jail Information System
# This script helps you get started with Docker quickly

set -e

echo "🏛️  Jail Information System - Docker Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from env.example..."
    cp env.example .env
    echo "⚠️  Please edit .env and set your JWT_SECRET!"
    echo "   Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Ensure data directory exists
echo "📁 Creating data directory..."
mkdir -p backend/data

# Build the Docker image
echo "🔨 Building Docker image (this may take a few minutes)..."
docker-compose build

# Start the container
echo "🚀 Starting container..."
docker-compose up -d

# Wait for container to be healthy
echo "⏳ Waiting for services to start..."
sleep 5

# Check if container is running
if docker ps | grep -q jail-system-app; then
    echo "✅ Container is running!"
    echo ""
    echo "🌐 Access your application at:"
    echo "   http://localhost:3001"
    echo ""
    echo "📊 View logs with:"
    echo "   docker-compose logs -f app"
    echo ""
    echo "🛑 Stop the container with:"
    echo "   docker-compose down"
else
    echo "❌ Container failed to start. Check logs with:"
    echo "   docker-compose logs app"
    exit 1
fi


