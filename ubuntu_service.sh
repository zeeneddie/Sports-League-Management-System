#!/bin/bash
# Ubuntu Systemd Service Setup for SPMS
# This script creates a systemd service for background running

set -e

echo "🔧 SPMS Systemd Service Setup"
echo "============================="

# Get current directory and user
CURRENT_DIR=$(pwd)
CURRENT_USER=$(whoami)
SERVICE_NAME="spms"

echo "Current directory: $CURRENT_DIR"
echo "Current user: $CURRENT_USER"
echo "Service name: $SERVICE_NAME"

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "Creating systemd service file..."

sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=SPMS (Sports League Management System)
After=network.target
Wants=network.target

[Service]
Type=simple
User=$CURRENT_USER
Group=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment=PATH=$CURRENT_DIR/venv/bin
ExecStart=$CURRENT_DIR/venv/bin/python app.py
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=spms

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$CURRENT_DIR

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created: $SERVICE_FILE"

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Enable service
echo "Enabling service to start on boot..."
sudo systemctl enable $SERVICE_NAME

echo ""
echo "🎉 SERVICE SETUP COMPLETED!"
echo ""
echo "Service management commands:"
echo "  sudo systemctl start $SERVICE_NAME      # Start the service"
echo "  sudo systemctl stop $SERVICE_NAME       # Stop the service"
echo "  sudo systemctl restart $SERVICE_NAME    # Restart the service"
echo "  sudo systemctl status $SERVICE_NAME     # Check service status"
echo "  sudo journalctl -u $SERVICE_NAME -f     # View live logs"
echo "  sudo journalctl -u $SERVICE_NAME        # View all logs"
echo ""
echo "To start the service now:"
echo "  sudo systemctl start $SERVICE_NAME"
echo ""
echo "To check if it's running:"
echo "  sudo systemctl status $SERVICE_NAME"