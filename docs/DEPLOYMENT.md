# 🚀 Docker Deployment Guide

Complete guide for deploying your Jail Information System using Docker.

## 📋 Table of Contents

1. [Quick Deploy to Any Server](#quick-deploy-to-any-server)
2. [Deploy to Cloud Platforms](#deploy-to-cloud-platforms)
3. [Production Checklist](#production-checklist)
4. [Post-Deployment](#post-deployment)

---

## 🖥️ Quick Deploy to Any Server

### Prerequisites
- Server with Docker installed (Ubuntu/Debian recommended)
- SSH access to your server
- Domain name (optional, but recommended)

### Step 1: Install Docker on Server

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add your user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect

# Verify installation
docker --version
docker compose version
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2: Transfer Your Code

**Option A: Using Git (Recommended)**
```bash
# On your server
git clone <your-repository-url>
cd Jail-InformationSystem
```

**Option B: Using SCP**
```bash
# From your local machine
scp -r . user@your-server-ip:/path/to/Jail-InformationSystem
```

**Option C: Using rsync**
```bash
# From your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ user@your-server-ip:/path/to/Jail-InformationSystem
```

### Step 3: Configure Environment

```bash
# On your server
cd Jail-InformationSystem

# Create .env file
cp env.example .env
nano .env  # or use vi/vim
```

**Update `.env` with production values:**
```env
# Generate a secure secret
JWT_SECRET=<generate_secure_secret_here>
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production

# Update these for your domain
FRONTEND_URL=http://yourdomain.com
REACT_APP_API_URL=http://yourdomain.com
```

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Build and Run

```bash
# Build the Docker image
docker compose build

# Start the application
docker compose up -d

# Check if it's running
docker compose ps

# View logs
docker compose logs -f app
```

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Should return: {"status":"ok"}
```

**Access your application:**
- If on same network: `http://your-server-ip:3001`
- If domain configured: `http://yourdomain.com`

---

## ☁️ Deploy to Cloud Platforms

### Option 1: Railway

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway auto-detects Docker
6. Add environment variables:
   - `JWT_SECRET` (generate one)
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DB_PATH=/app/backend/data/jail_visitation.sqlite`
7. Click "Deploy"

**Railway automatically:**
- Builds your Docker image
- Runs `docker-compose up`
- Provides HTTPS URL
- Handles restarts

**Custom domain:**
- Go to Settings → Networking
- Add your domain
- Railway provides SSL automatically

---

### Option 2: Render

**Steps:**
1. Go to [render.com](https://render.com)
2. Sign up/login with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: jail-information-system
   - **Environment**: Docker
   - **Build Command**: `docker compose build`
   - **Start Command**: `docker compose up`
6. Add environment variables (same as Railway)
7. Click "Create Web Service"

**Render automatically:**
- Builds and deploys
- Provides HTTPS URL
- Auto-restarts on crashes

---

### Option 3: DigitalOcean App Platform

**Steps:**
1. Go to [digitalocean.com](https://digitalocean.com)
2. Sign up/login
3. Go to Apps → Create App
4. Connect GitHub repository
5. Select "Docker" as source type
6. Configure:
   - Dockerfile path: `Dockerfile`
   - Port: `3001`
7. Add environment variables
8. Choose plan and region
9. Click "Create Resources"

**Pricing:** Starts at $5/month

---

### Option 4: AWS EC2 / Lightsail

**AWS Lightsail (Easier):**
1. Go to AWS Lightsail
2. Create instance → "Container"
3. Connect GitHub or upload Docker image
4. Configure environment variables
5. Deploy

**AWS EC2 (More Control):**
1. Launch EC2 instance (Ubuntu)
2. SSH into instance
3. Follow "Quick Deploy to Any Server" steps above

---

### Option 5: Fly.io

**Steps:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Follow prompts:
# - App name: jail-system
# - Region: choose closest
# - Postgres: No (using SQLite)
# - Redis: No

# Deploy
fly deploy
```

**Add environment variables:**
```bash
fly secrets set JWT_SECRET=your_secret_here
fly secrets set NODE_ENV=production
```

---

### Option 6: Google Cloud Run

**Steps:**
```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Build and push image
gcloud builds submit --tag gcr.io/PROJECT-ID/jail-system

# Deploy
gcloud run deploy jail-system \
  --image gcr.io/PROJECT-ID/jail-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars JWT_SECRET=your_secret,NODE_ENV=production
```

---

### Option 7: Azure Container Instances

**Steps:**
```bash
# Install Azure CLI
# https://docs.microsoft.com/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name jail-system-rg --location eastus

# Deploy container
az container create \
  --resource-group jail-system-rg \
  --name jail-system \
  --image your-image-name \
  --dns-name-label jail-system \
  --ports 3001 \
  --environment-variables JWT_SECRET=your_secret NODE_ENV=production
```

---

## 🔒 Production Checklist

### Security

- [ ] **Strong JWT Secret**: Use a long, random secret (64+ characters)
- [ ] **Environment Variables**: Never commit `.env` file
- [ ] **HTTPS**: Set up SSL certificate (Let's Encrypt recommended)
- [ ] **Firewall**: Only expose necessary ports
- [ ] **Database Backups**: Set up automated backups
- [ ] **Updates**: Keep Docker and base images updated

### Performance

- [ ] **Resource Limits**: Set CPU/memory limits in docker-compose.yml
- [ ] **Caching**: Enable reverse proxy caching (Nginx)
- [ ] **CDN**: Use CDN for static assets (optional)
- [ ] **Monitoring**: Set up application monitoring

### Reliability

- [ ] **Health Checks**: Verify health endpoint works
- [ ] **Auto-restart**: Configure restart policies
- [ ] **Logging**: Set up log aggregation
- [ ] **Backups**: Test backup/restore process

---

## 🌐 Setting Up HTTPS with Nginx (Reverse Proxy)

### Install Nginx

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Configure Nginx

Create `/etc/nginx/sites-available/jail-system`:

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

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/jail-system /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

### Get SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically:
- Configures SSL
- Sets up auto-renewal
- Redirects HTTP to HTTPS

### Update Environment Variables

Update `.env`:
```env
FRONTEND_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com
```

Restart Docker:
```bash
docker compose down
docker compose up -d
```

---

## 📊 Post-Deployment

### Monitor Your Application

**View logs:**
```bash
docker compose logs -f app
```

**Check status:**
```bash
docker compose ps
docker stats jail-system-app
```

**Health check:**
```bash
curl https://yourdomain.com/api/health
```

### Set Up Automated Backups

Create backup script `/usr/local/bin/backup-jail-system.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/jail-system"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker cp jail-system-app:/app/backend/data/jail_visitation.sqlite \
  $BACKUP_DIR/db_$DATE.sqlite

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sqlite" -mtime +30 -delete

echo "Backup completed: db_$DATE.sqlite"
```

Make executable:
```bash
chmod +x /usr/local/bin/backup-jail-system.sh
```

Add to crontab (daily at 2 AM):
```bash
crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-jail-system.sh
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### Scale (Multiple Instances)

Edit `docker-compose.yml`:
```yaml
services:
  app:
    # ... existing config ...
    deploy:
      replicas: 3  # Run 3 instances
```

Use Docker Swarm:
```bash
docker swarm init
docker stack deploy -c docker-compose.yml jail-system
```

---

## 🐛 Troubleshooting Deployment

### Application Not Accessible

```bash
# Check if container is running
docker compose ps

# Check logs
docker compose logs app

# Check if port is open
sudo netstat -tlnp | grep 3001
```

### Database Issues

```bash
# Check database file
docker exec jail-system-app ls -la /app/backend/data/

# Check permissions
docker exec jail-system-app ls -l /app/backend/data/jail_visitation.sqlite
```

### Out of Memory

```bash
# Check memory usage
docker stats jail-system-app

# Add memory limit to docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :3001

# Change port in docker-compose.yml
ports:
  - "3002:3001"  # Use 3002 externally
```

---

## 📝 Quick Reference

### Essential Commands

```bash
# Deploy
docker compose build
docker compose up -d

# Update
git pull
docker compose down
docker compose build
docker compose up -d

# Monitor
docker compose logs -f app
docker compose ps
docker stats jail-system-app

# Backup
docker cp jail-system-app:/app/backend/data/jail_visitation.sqlite ./backup.sqlite

# Restore
docker cp ./backup.sqlite jail-system-app:/app/backend/data/jail_visitation.sqlite
docker compose restart app
```

---

## 🎉 You're Deployed!

Your application should now be:
- ✅ Running in production
- ✅ Accessible via HTTPS (if configured)
- ✅ Backing up automatically (if configured)
- ✅ Monitoring and logging

**Next Steps:**
1. Test all features
2. Set up monitoring alerts
3. Configure automated backups
4. Document your deployment process
5. Train team members on deployment

Happy deploying! 🚀
