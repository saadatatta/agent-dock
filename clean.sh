#!/bin/bash
echo "WARNING: This will delete all data, including the database!"
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Operation cancelled."
    exit 1
fi

echo "Stopping containers and removing data volumes..."
docker-compose down -v

echo "Rebuilding and starting containers..."
docker-compose up -d --build

echo "Waiting for services to start..."
sleep 20

echo "Checking backend health..."
curl http://localhost:8000/health

echo -e "\n\nFrontend should be available at: http://localhost:3000"
echo "Backend API should be available at: http://localhost:8000"
echo "API Documentation should be available at: http://localhost:8000/docs" 