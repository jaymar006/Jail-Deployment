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
# REACT_APP_API_URL should be passed as build arg from Render environment variables
# If not set, will fallback to window.location.origin in the frontend code
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
# Disable source maps to avoid warnings from html5-qrcode package
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/backend/data

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 10000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start backend server (which also serves frontend in production)
WORKDIR /app/backend
CMD ["node", "server.js"]

