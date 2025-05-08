#!/bin/bash
echo "Stopping containers (preserving data)..."
docker-compose down

echo "Rebuilding and starting containers..."
docker-compose up -d --build

echo "Waiting for services to start..."
sleep 20

echo "Checking backend health..."
curl http://localhost:8000/health

echo -e "\n\nFrontend should be available at: http://localhost:3000"
echo "Backend API should be available at: http://localhost:8000"
echo "API Documentation should be available at: http://localhost:8000/docs" 