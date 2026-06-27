# Application Upload
1. Upload the entire `foodies-fastapi` folder contents to `/home/foodiespakistan-fastapi/htdocs/fastapi.foodiespakistan.pk` via CloudPanel File Manager or SFTP.
2. Rename `.env.production` that I just created to `.env`.

# Server Setup
SSH into your server as root (or a user with sudo privileges) and run the following commands line-by-line:

```bash
# 0. Install Python venv package (Run this as root/sudo)
sudo apt update
sudo apt install -y python3-venv

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
