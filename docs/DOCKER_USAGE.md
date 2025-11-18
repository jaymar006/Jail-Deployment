# 🐳 Docker Usage Guide - What You Can Do Now

Now that your Docker setup is working, here's what you can do with it!

## 🎯 Key Benefits You Now Have

### 1. **Portability**
- Your app runs the same way on any machine with Docker
- No more "it works on my machine" issues
- Easy to share with team members

### 2. **Easy Deployment**
- Deploy to any server with Docker installed
- No need to install Node.js, npm, or configure environments
- One command to start everything

### 3. **Isolation**
- Your app runs in its own container
- Doesn't interfere with other applications
- Easy to clean up (just remove the container)

### 4. **Consistency**
- Same environment for development, testing, and production
- Dependencies are locked in the container

---

## 📋 Common Docker Operations

### **View Running Containers**
```bash
docker ps
```
Shows all running containers with their status, ports, and names.

### **View All Containers (Including Stopped)**
```bash
docker ps -a
```

### **View Container Logs**
```bash
# Follow logs in real-time
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app

# View logs for specific time period
docker-compose logs --since 10m app
```

### **Stop the Application**
```bash
docker-compose down
```
Stops and removes containers (but keeps volumes/data).

### **Start the Application**
```bash
docker-compose up -d
```
Starts containers in detached mode (background).

### **Restart the Application**
```bash
docker-compose restart app
```
Quick restart without rebuilding.

### **Rebuild After Code Changes**
```bash
# Stop containers
docker-compose down

# Rebuild with latest code
docker-compose build

# Start again
docker-compose up -d
```

### **Access Container Shell**
```bash
# Get a shell inside the running container
docker exec -it jail-system-app sh

# Once inside, you can:
# - Check files: ls -la
# - View environment: env
# - Check processes: ps aux
# - Exit: exit
```

### **Check Container Resource Usage**
```bash
docker stats jail-system-app
```
Shows CPU, memory, and network usage in real-time.

### **Inspect Container Configuration**
```bash
docker inspect jail-system-app
```
Shows detailed container configuration, environment variables, volumes, etc.

---

## 🔄 Development Workflow

### **Option 1: Development Mode (Recommended for Active Development)**

Use volume mounts to see code changes instantly without rebuilding:

```bash
# Edit docker-compose.dev.yml if needed, then:
docker-compose -f docker-compose.dev.yml up
```

This mounts your local code, so changes reflect immediately.

### **Option 2: Production Mode (Current Setup)**

For testing production builds:
```bash
docker-compose up -d
```

Changes require rebuild:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🚀 Deployment Options

### **1. Deploy to Any Server**

**On your server:**
```bash
# Clone your repository
git clone <your-repo-url>
cd Jail-InformationSystem

# Copy .env file and configure
cp env.example .env
# Edit .env with production values

# Build and run
docker-compose build
docker-compose up -d
```

**That's it!** Your app is running on the server.

### **2. Deploy to Cloud Platforms**

#### **DigitalOcean / AWS / Azure / Google Cloud**
- Create a VM/instance
- Install Docker: `curl -fsSL https://get.docker.com | sh`
- Follow "Deploy to Any Server" steps above

#### **Railway**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### **Render**
- Connect your GitHub repo
- Set build command: `docker-compose build`
- Set start command: `docker-compose up`
- Add environment variables in dashboard

#### **Fly.io**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch
```

### **3. Use Docker Hub (Optional)**

Build and push your image to Docker Hub for easy distribution:

```bash
# Build and tag
docker build -t yourusername/jail-system:latest .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push yourusername/jail-system:latest

# Others can now pull and run:
docker run -p 3001:3001 yourusername/jail-system:latest
```

---

## 💾 Data Management

### **Backup Database**
```bash
# Copy database file from container
docker cp jail-system-app:/app/backend/data/jail_visitation.sqlite ./backup_$(date +%Y%m%d).sqlite

# Or backup the volume
docker run --rm -v jail-system-app_backend-data:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz /data
```

### **Restore Database**
```bash
# Copy database file to container
docker cp ./backup_20240101.sqlite jail-system-app:/app/backend/data/jail_visitation.sqlite

# Restart container
docker-compose restart app
```

### **View Database Location**
```bash
# Database is persisted in: ./backend/data/jail_visitation.sqlite
# This directory is mounted as a volume, so data persists even if container is removed
```

---

## 🔧 Maintenance Tasks

### **Update Dependencies**
```bash
# 1. Update package.json files locally
# 2. Rebuild container
docker-compose build --no-cache
docker-compose up -d
```

### **Clean Up Docker**
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (CAREFUL: may delete data)
docker volume prune

# Remove everything unused
docker system prune -a
```

### **Update Docker Image**
```bash
# Pull latest base image
docker pull node:18-alpine

# Rebuild
docker-compose build --pull
docker-compose up -d
```

### **Monitor Health**
```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' jail-system-app

# Should return: healthy
```

---

## 🐛 Troubleshooting

### **Container Won't Start**
```bash
# Check logs
docker-compose logs app

# Check if port is in use
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux

# Check container status
docker ps -a
```

### **Application Errors**
```bash
# View real-time logs
docker-compose logs -f app

# Access container to debug
docker exec -it jail-system-app sh
```

### **Database Issues**
```bash
# Check if database file exists
docker exec jail-system-app ls -la /app/backend/data/

# Check database permissions
docker exec jail-system-app ls -l /app/backend/data/jail_visitation.sqlite
```

### **Reset Everything**
```bash
# Stop and remove containers, volumes, and images
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Monitoring & Performance

### **View Resource Usage**
```bash
# Real-time stats
docker stats jail-system-app

# Container details
docker inspect jail-system-app | grep -A 10 "State"
```

### **Check Application Health**
```bash
# Health check endpoint
curl http://localhost:3001/api/health

# Should return: {"status":"ok"}
```

### **View Network Connections**
```bash
# Container network info
docker network inspect jail-informationsystem_default
```

---

## 🔐 Security Best Practices

### **1. Use Environment Variables**
- Never hardcode secrets in Dockerfile
- Use `.env` file (already configured)
- Rotate JWT_SECRET regularly

### **2. Keep Images Updated**
```bash
# Regularly update base images
docker pull node:18-alpine
docker-compose build --pull
```

### **3. Limit Container Resources**
Add to `docker-compose.yml`:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

### **4. Use Non-Root User (Advanced)**
Modify Dockerfile to run as non-root user for better security.

---

## 🎓 Next Steps

1. **Set up automated backups** - Schedule database backups
2. **Configure reverse proxy** - Use Nginx for HTTPS/SSL
3. **Set up monitoring** - Use tools like Prometheus or Datadog
4. **CI/CD Pipeline** - Automate builds and deployments
5. **Multi-container setup** - Separate frontend/backend if needed
6. **Load balancing** - Scale to multiple containers

---

## 📚 Useful Commands Cheat Sheet

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart app

# View logs
docker-compose logs -f app

# Rebuild
docker-compose build

# Access shell
docker exec -it jail-system-app sh

# Check status
docker ps

# View stats
docker stats jail-system-app

# Clean up
docker system prune
```

---

## 🎉 You're All Set!

Your application is now containerized and ready for:
- ✅ Easy deployment to any server
- ✅ Consistent development environment
- ✅ Simple scaling and maintenance
- ✅ Team collaboration without setup hassles

Happy Dockerizing! 🐳

