# 🖥️ Server Deployment - Step by Step

Complete guide for deploying to your own server.

## 📋 What You Need

- A server (VPS, cloud instance, or physical server)
- SSH access to your server
- Domain name (optional, but recommended)
- Basic Linux command line knowledge

---

## 🔧 Step-by-Step Deployment

### Step 1: Prepare Your `.env` File

**On your local machine**, create/update your `.env` file with these changes:

#### **Required Changes:**

1. **JWT_SECRET** - Generate a secure secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copy the output and use it as your `JWT_SECRET`

2. **NODE_ENV** - Change to `production`:
   ```env
   NODE_ENV=production
   ```

3. **FRONTEND_URL** - Set to your server's URL:
   ```env
   # Option A: Using IP address
   FRONTEND_URL=http://YOUR_SERVER_IP:3001
   
   # Option B: Using domain name
   FRONTEND_URL=https://yourdomain.com
   
   # Option C: Using domain with port
   FRONTEND_URL=http://yourdomain.com:3001
   ```

4. **REACT_APP_API_URL** - Must match FRONTEND_URL:
   ```env
   # Must match FRONTEND_URL exactly
   REACT_APP_API_URL=http://YOUR_SERVER_IP:3001
   # OR
   REACT_APP_API_URL=https://yourdomain.com
   ```

#### **Complete `.env` Example:**

**For IP-based access (no domain):**
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://123.45.67.89:3001
REACT_APP_API_URL=http://123.45.67.89:3001
```

**For domain-based access (with HTTPS):**
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://jailsystem.yourdomain.com
REACT_APP_API_URL=https://jailsystem.yourdomain.com
```

---

### Step 2: Install Docker on Your Server

**SSH into your server:**
```bash
ssh user@your-server-ip
```

**Install Docker (Ubuntu/Debian):**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Add your user to docker group (to avoid using sudo)
sudo usermod -aG docker $USER

# Log out and back in for group change to take effect
exit
```

**SSH back in and verify:**
```bash
ssh user@your-server-ip
docker --version
docker compose version
```

---

### Step 3: Transfer Your Code to Server

**Option A: Using Git (Recommended)**
```bash
# On your server
cd ~
git clone <your-repository-url>
cd Jail-InformationSystem
```

**Option B: Using SCP (from your local machine)**
```bash
# From your local machine
scp -r . user@your-server-ip:~/Jail-InformationSystem
```

**Option C: Using rsync (from your local machine)**
```bash
# From your local machine (excludes node_modules and .git)
rsync -avz --exclude 'node_modules' --exclude '.git' \
  --exclude 'backend/data/*.sqlite' \
  ./ user@your-server-ip:~/Jail-InformationSystem
```

---

### Step 4: Configure Environment on Server

**On your server:**
```bash
cd ~/Jail-InformationSystem

# Create .env file
nano .env
# OR use vi: vi .env
```

**Paste your production `.env` configuration** (from Step 1)

**Save and exit:**
- Nano: `Ctrl+X`, then `Y`, then `Enter`
- Vi: Press `Esc`, type `:wq`, press `Enter`

**Verify the file:**
```bash
cat .env
```

---

### Step 5: Build and Deploy

**On your server:**
```bash
cd ~/Jail-InformationSystem

# Build the Docker image (this may take 5-10 minutes)
docker compose build

# Start the application
docker compose up -d

# Check if it's running
docker compose ps

# View logs to verify everything started correctly
docker compose logs -f app
```

**Press `Ctrl+C` to exit logs view**

---

### Step 6: Verify Deployment

**Check health endpoint:**
```bash
curl http://localhost:3001/api/health
```

**Should return:**
```json
{"status":"ok"}
```

**Test from your browser:**
- Open: `http://YOUR_SERVER_IP:3001`
- You should see the login page

---

## 🔒 Security: Set Up Firewall

**Allow necessary ports:**
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3001/tcp  # Your app
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🌐 Optional: Set Up Domain & HTTPS

### Using Nginx Reverse Proxy

**Install Nginx:**
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

**Create Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/jail-system
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/jail-system /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

**Get SSL certificate:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Update `.env` to use HTTPS:**
```bash
nano .env
```

Change:
```env
FRONTEND_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com
```

**Restart Docker:**
```bash
docker compose down
docker compose up -d
```

---

## 📊 Monitor Your Deployment

**View logs:**
```bash
docker compose logs -f app
```

**Check container status:**
```bash
docker compose ps
docker stats jail-system-app
```

**Check health:**
```bash
curl http://localhost:3001/api/health
```

---

## 🔄 Update Your Application

**When you make changes:**
```bash
# On your server
cd ~/Jail-InformationSystem

# Pull latest code
git pull

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

---

## 💾 Backup Database

**Create backup:**
```bash
docker cp jail-system-app:/app/backend/data/jail_visitation.sqlite \
  ~/backup_$(date +%Y%m%d).sqlite
```

**Restore backup:**
```bash
docker cp ~/backup_20240101.sqlite \
  jail-system-app:/app/backend/data/jail_visitation.sqlite
docker compose restart app
```

---

## 🐛 Troubleshooting

### Can't access application

```bash
# Check if container is running
docker compose ps

# Check logs for errors
docker compose logs app

# Check if port is open
sudo netstat -tlnp | grep 3001
```

### Database issues

```bash
# Check database file exists
docker exec jail-system-app ls -la /app/backend/data/

# Check permissions
docker exec jail-system-app ls -l /app/backend/data/jail_visitation.sqlite
```

### Port already in use

```bash
# Find what's using port 3001
sudo lsof -i :3001

# Change port in docker-compose.yml if needed
```

---

## ✅ Quick Reference

| Task | Command |
|------|---------|
| Deploy | `docker compose build && docker compose up -d` |
| View logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Stop | `docker compose down` |
| Update | `git pull && docker compose down && docker compose build && docker compose up -d` |
| Backup DB | `docker cp jail-system-app:/app/backend/data/jail_visitation.sqlite ~/backup.sqlite` |

---

## 🎉 You're Done!

Your application should now be:
- ✅ Running on your server
- ✅ Accessible via IP or domain
- ✅ Secured with HTTPS (if configured)
- ✅ Ready for production use

**Access your app:**
- `http://YOUR_SERVER_IP:3001` (or `https://yourdomain.com` if configured)

