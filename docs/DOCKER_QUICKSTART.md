# 🐳 Docker Quick Start Guide

## Step-by-Step Setup

### Step 1: Prepare Environment File

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp env.example .env
```

Edit `.env` and set your values:

```env
JWT_SECRET=your_very_secure_jwt_secret_here_make_it_long_and_random
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3001
REACT_APP_API_URL=http://localhost:3001
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 2: Build the Docker Image

```bash
docker-compose build
```

This will:
- Install all dependencies
- Build the React frontend
- Create the Docker image

**Expected time:** 5-10 minutes (first time)

### Step 3: Start the Container

```bash
docker-compose up -d
```

The `-d` flag runs in detached mode (background).

### Step 4: Verify It's Running

```bash
# Check container status
docker ps

# View logs
docker-compose logs -f app

# Check health
curl http://localhost:3001/api/health
```

### Step 5: Access the Application

- **Application**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **Default Login**: 
  - Username: `admin`
  - Password: `admin123`

## 🔍 Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker-compose logs app

# Check if port is already in use
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Mac/Linux
```

### Database issues

```bash
# Check if data directory exists
ls -la backend/data/

# Verify database file
ls -la backend/data/jail_visitation.sqlite
```

### Rebuild after code changes

```bash
# Stop containers
docker-compose down

# Rebuild with no cache
docker-compose build --no-cache

# Start again
docker-compose up -d
```

## 📝 Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Restart service
docker-compose restart app

# Execute command in container
docker exec -it jail-system-app sh

# Remove everything (WARNING: deletes database)
docker-compose down -v
```

## ✅ Next Steps After Setup

1. **Test the application** - Login and verify all features work
2. **Backup database** - Copy `backend/data/jail_visitation.sqlite` to a safe location
3. **Configure production** - Update environment variables for your domain
4. **Set up monitoring** - Consider adding health check monitoring
5. **Automate backups** - Set up scheduled database backups


