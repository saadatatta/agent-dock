#!/bin/bash
echo "Stopping containers..."
docker-compose down

echo "Starting containers..."
docker-compose up -d

echo "Waiting for services to start..."
sleep 5

echo "Checking backend health..."
curl http://localhost:8000/health

echo -e "\n\nFrontend should be available at: http://localhost:3000"
echo "Backend API should be available at: http://localhost:8000"
echo "API Documentation should be available at: http://localhost:8000/docs" 