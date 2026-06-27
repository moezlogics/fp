#!/bin/bash
echo "=== Pulling FastAPI Updates from GitHub ==="
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
  --exclude='venv/' \
  --exclude='__pycache__/' \
  .deploy-source/fast-api/ .

echo "=== Running Deploy Actions ==="
if systemctl is-active --quiet foodies-fastapi; then
  echo "Restarting foodies-fastapi systemd service..."
  sudo systemctl restart foodies-fastapi
else
  echo "foodies-fastapi service is not running or sudo is required. Please check service manually."
fi

echo "=== FastAPI Updated Successfully ==="
