# Combined Dockerfile - Builds and runs both frontend and backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json files first
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Copy backend source files (before installing to avoid overwriting node_modules)
COPY backend/ ./backend/
# Remove any node_modules that might have been copied from host
RUN rm -rf ./backend/node_modules || true

# Copy frontend source files (needed for build)
COPY frontend/public ./frontend/public/
COPY frontend/src ./frontend/src/
# Remove any node_modules that might have been copied from host
RUN rm -rf ./frontend/node_modules || true

# Install root dependencies (if any)
RUN npm install || true

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Install frontend dependencies and build
WORKDIR /app/frontend
RUN npm install

# Build frontend
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL:-http://192.168.18.181:3001}
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://192.168.18.181:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend server (which also serves frontend in production)
WORKDIR /app/backend
CMD ["node", "server.js"]

