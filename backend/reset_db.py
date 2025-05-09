#!/usr/bin/env python
"""
Reset the database by dropping all tables and recreating them.
This script is useful after modifying database models.
"""

import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import the init_db function
from init_db import init_db

if __name__ == "__main__":
    logger.info("Resetting database (dropping all tables and recreating them)...")
    init_db(drop_all=True)
    logger.info("Database reset complete.") 