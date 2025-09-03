# Gunicorn Configuration for SPMS Flask Application
# Production-ready configuration for Hostinger VPS deployment

import multiprocessing
import os

# Server socket
bind = "127.0.0.1:5000"
backlog = 2048

# Worker processes
workers = min(4, multiprocessing.cpu_count() * 2 + 1)
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2

# Restart workers after this many requests, to prevent memory leaks
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "/var/www/spms/logs/access.log"
errorlog = "/var/www/spms/logs/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "spms_flask_app"

# Daemon mode (for systemd service)
daemon = False
pidfile = "/var/www/spms/logs/gunicorn.pid"

# User and group (will be set by systemd)
# user = "spms"
# group = "spms"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Performance
preload_app = True
enable_stdio_inheritance = True

# SSL (handled by Nginx reverse proxy)
# We don't configure SSL here since Nginx handles it

# Environment variables
raw_env = [
    'FLASK_ENV=production',
    'PYTHONPATH=/var/www/spms',
]

# Callbacks
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting SPMS Flask application...")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Reloading SPMS Flask application...")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"Worker {worker.pid} killed by signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"Worker {worker.pid} is being forked")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker {worker.pid} has been forked")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("SPMS Flask application is ready to serve requests")