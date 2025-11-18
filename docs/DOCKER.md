# 🐳 Docker Setup Guide - Jail Information System

This guide explains how to run the Jail Information System using Docker.

## 📋 Prerequisites

- Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

## 🚀 Quick Start

### 1. Setup Environment

First, create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit `.env` and set your values:

```env
JWT_SECRET=your_very_secure_jwt_secret_here_make_it_long_and_random
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:3001
```

**Important**: Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Build and Run (Production)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 3. Development Mode

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📦 Docker Architecture

### Services

1. **Backend Service** (`backend`)
   - Node.js/Express API server
   - SQLite database
   - Port: 3001
   - Health check enabled

2. **Frontend Service** (`frontend`)
   - React application (built and served via nginx)
   - Port: 3000 (mapped to nginx port 80)
   - Health check enabled

### Volumes

- `database_data`: Persistent storage for SQLite database
- Local `./backend/data`: Mounted for easy database access

## 🔧 Docker Commands

### Build Images

```bash
# Build backend
docker build -f Dockerfile.backend -t jail-system-backend .

# Build frontend
docker build -f Dockerfile.frontend -t jail-system-frontend .

# Build combined (single service)
docker build -f Dockerfile -t jail-system-app .
```

### Run Individual Containers

```bash
# Backend only
docker run -d \
  --name jail-backend \
  -p 3001:3001 \
  -v $(pwd)/backend/data:/app/data \
  -e JWT_SECRET=your_secret \
  -e DB_PATH=/app/data/jail_visitation.sqlite \
  jail-system-backend

# Frontend only
docker run -d \
  --name jail-frontend \
  -p 3000:80 \
  -e REACT_APP_API_URL=http://localhost:3001 \
  jail-system-frontend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Execute Commands in Container

```bash
# Access backend container
docker exec -it jail-system-backend sh

# Access frontend container
docker exec -it jail-system-frontend sh
```

### Database Backup

```bash
# Backup SQLite database
docker cp jail-system-backend:/app/data/jail_visitation.sqlite ./backup_$(date +%Y%m%d).sqlite

# Restore database
docker cp ./backup_20240101.sqlite jail-system-backend:/app/data/jail_visitation.sqlite
```

## 🛠️ Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check container status
docker ps -a

# Restart services
docker-compose restart
```

### Database issues

```bash
# Check if data directory exists
docker exec jail-system-backend ls -la /app/data

# Verify database file
docker exec jail-system-backend ls -la /app/data/jail_visitation.sqlite
```

### Port conflicts

If ports 3000 or 3001 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"  # Change host port
```

### Rebuild after code changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Security Considerations

1. **JWT Secret**: Always use a strong, random JWT secret in production
2. **Environment Variables**: Never commit `.env` files
3. **Database**: Consider using a volume for database persistence
4. **Network**: Use Docker networks to isolate services
5. **Updates**: Regularly update base images for security patches

## 📊 Production Deployment

For production, consider:

1. **Reverse Proxy**: Use nginx or Traefik as reverse proxy
2. **SSL/TLS**: Configure HTTPS certificates
3. **Database**: Consider migrating to PostgreSQL for better scalability
4. **Monitoring**: Add monitoring tools (Prometheus, Grafana)
5. **Backup**: Set up automated database backups
6. **Scaling**: Use Docker Swarm or Kubernetes for orchestration

## 🧹 Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes database)
docker-compose down -v

# Remove images
docker rmi jail-system-backend jail-system-frontend

# Full cleanup (removes everything)
docker system prune -a --volumes
```

## 📝 Notes

- The SQLite database is persisted in `./backend/data/` directory
- Frontend is built during Docker build process
- Backend serves frontend static files in production mode
- Health checks ensure services are running properly
- Use `docker-compose.dev.yml` for development with hot reload


