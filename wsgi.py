#!/usr/bin/env python3
"""
WSGI Entry Point for SPMS Flask Application
Production-ready WSGI configuration for Gunicorn deployment
"""

import os
import sys
from pathlib import Path

# Add the application directory to Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

# Set production environment variables
os.environ.setdefault('FLASK_ENV', 'production')

# Import the Flask application
from app import app

# Start the scheduler in production
from scheduler import data_scheduler
data_scheduler.start_scheduler()

# Configure for production
if __name__ == "__main__":
    # This block is for development only
    # In production, Gunicorn will import 'app' directly
    app.run(host='0.0.0.0', port=5000)
else:
    # Production WSGI application
    application = app