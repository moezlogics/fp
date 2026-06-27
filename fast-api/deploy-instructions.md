# Application Upload
1. Upload the entire `foodies-fastapi` folder contents to `/home/foodiespakistan-fastapi/htdocs/fastapi.foodiespakistan.pk` via CloudPanel File Manager or SFTP.
2. Rename `.env.production` that I just created to `.env`.

# Server Setup
SSH into your server as root (or a user with sudo privileges) and run the following commands line-by-line:

```bash
# 0. Install Python venv package (Run this as root/sudo)
sudo apt update
sudo apt install -y python3-venv

# 0b. Install Hugin / panotools — REQUIRED for 360° equirectangular stitching.
#     The VR-Tour stitcher shells out to these binaries:
#       pto_gen, cpfind, cpclean, linefind, autooptimiser, pano_modify, nona, enblend
#     Without them, panorama creation fails with a clear "Hugin not configured" error.
sudo apt install -y hugin-tools enblend
#     Verify all binaries are on PATH:
for b in pto_gen cpfind cpclean linefind autooptimiser pano_modify nona enblend; do \
  command -v "$b" >/dev/null && echo "OK  $b" || echo "MISSING  $b"; done

# 1. Switch to the site user (ensure site user 'foodiespakistan-fastapi' is created in CloudPanel)
sudo su - foodiespakistan-fastapi
cd /home/foodiespakistan-fastapi/htdocs/fastapi.foodiespakistan.pk

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Exit back to root user
exit

# 5. Move the service file we created into the systemd directory
# (Since you are already in the directory, use the local path)
sudo mv /home/foodiespakistan-fastapi/htdocs/fastapi.foodiespakistan.pk/foodies-fastapi.service /etc/systemd/system/foodies-fastapi.service

# 6. Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable foodies-fastapi
sudo systemctl start foodies-fastapi

# 7. Check if it's running successfully!
sudo systemctl status foodies-fastapi
```

# Nginx 
Ensure your CloudPanel vhost configuration for `fastapi.foodiespakistan.pk` is correctly pointing to the Local Service port `8500`.

# ⚠️ Workers — run SINGLE worker
The VR-Tour capture flow keeps the session state (uploaded frames + their temp
directory) **in memory on the worker that received the request**. If you run
multiple uvicorn workers, the `create-session` / `upload-frame` / `complete-capture`
calls can land on different workers and the session "disappears" (404), breaking
every capture.

In the systemd service (`foodies-fastapi.service`), the start command MUST use a
single worker:

```ini
ExecStart=/home/foodiespakistan-fastapi/htdocs/fastapi.foodiespakistan.pk/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8500 --workers 1
```

Stitching already runs off the event loop (in a thread executor), so one worker
comfortably handles the low VR-tour volume. To scale horizontally later, move
session state to Redis and uploaded frames to shared/object storage, then you can
raise the worker count.
