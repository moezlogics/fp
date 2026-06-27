#!/bin/bash
echo "=== Pulling Frontend Updates from GitHub ==="
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
  --exclude='.next/' \
  --exclude='out/' \
  .deploy-source/frontend/ .

echo "=== Frontend Updated Successfully (Build/Restart manually) ==="
