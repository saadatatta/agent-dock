#!/bin/bash
# This script runs the database setup script inside the backend container

set -e

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running or not installed. Please start Docker and try again."
  exit 1
fi

echo "====== AGENT-DOCK DATABASE SETUP ======"
echo "This script will reset and initialize the database with all necessary data."
echo "Warning: This will delete ALL existing data in the database!"
echo ""
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Starting database setup process..."
  
  # Check if the backend container is running
  if ! docker ps | grep -q "agent-dock-backend"; then
    echo "Backend container is not running. Starting containers..."
    docker-compose up -d
    echo "Waiting for containers to start..."
    sleep 10
  fi
  
  # Execute the setup script inside the container
  echo "Executing database setup script..."
  docker exec -it agent-dock-backend-1 python /app/setup_db.py
  
  if [ $? -eq 0 ]; then
    echo "====== DATABASE SETUP COMPLETED SUCCESSFULLY ======"
    echo "The database has been reset and initialized with all necessary data."
  else
    echo "====== DATABASE SETUP FAILED ======"
    echo "Please check the logs for more information."
    exit 1
  fi
else
  echo "Database setup cancelled."
fi 