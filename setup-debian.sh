#!/bin/bash

# Setup script for Debian Linux
# Installs: nginx, nodejs, pm2, git

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "Debian Linux Setup Script"
echo "============================================"

# Update package manager
echo "Updating package manager..."
sudo apt-get update
sudo apt-get upgrade -y

# Install git
echo "Installing git..."
sudo apt-get install -y git

# Install Python tooling for the backend
echo "Installing Python and pip..."
sudo apt-get install -y python3 python3-pip python3-venv

# Install nginx
echo "Installing nginx..."
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install nodejs and npm
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify nodejs and npm installation
echo "Node.js version:"
node --version
echo "NPM version:"
npm --version

# Install Python backend dependencies
echo "Installing Python backend dependencies..."
cd "$SCRIPT_DIR/python"
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
cd "$SCRIPT_DIR"

# Install pm2 globally
echo "Installing PM2 globally..."
sudo npm install -g pm2

# Setup pm2 to start on boot
echo "Setting up PM2 startup..."
sudo pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

# Display installation summary
echo ""
echo "============================================"
echo "Installation completed successfully!"
echo "============================================"
echo ""
echo "Installed versions:"
echo "Git: $(git --version)"
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo ""
echo "Nginx status:"
sudo systemctl status nginx --no-pager | head -3
echo ""
echo "============================================"
echo "Next steps:"
echo "1. Configure nginx: sudo nano /etc/nginx/sites-available/default"
echo "2. Start your app: pm2 start <app-name>"
echo "3. Save PM2 config: pm2 save"
echo "============================================"
