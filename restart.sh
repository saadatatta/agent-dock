#!/bin/bash
echo "Restarting containers..."

# Instead of removing containers, just restart them
docker-compose restart

echo "Waiting for services to start..."
sleep 15

echo "Checking backend health..."
curl http://localhost:8000/health

echo -e "\n\nFrontend should be available at: http://localhost:3000"
echo "Backend API should be available at: http://localhost:8000"
echo "API Documentation should be available at: http://localhost:8000/docs" 