#!/bin/bash
echo "=== Pulling API Updates from GitHub ==="
if [ ! -d ".deploy-source" ]; then
  echo "Error: .deploy-source directory not found!"
  echo "Please clone the repository into .deploy-source first."
  exit 1
fi

cd .deploy-source
git pull origin main
cd ..

echo "=== Syncing files to Root ==="
rsync -av --delete \
  --exclude='.deploy-source/' \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='pull.sh' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='logs/' \
  .deploy-source/api/ .

echo "=== Running Deploy Actions ==="
if [ -f "ecosystem.config.js" ]; then
  echo "PM2 config found. Restarting API..."
  pm2 reload ecosystem.config.js || pm2 restart ecosystem.config.js
else
  echo "No ecosystem.config.js found. Please restart manually."
fi

echo "=== API Updated Successfully ==="
