# ---------------------------
# FRONTEND BUILD STAGE
# ---------------------------
FROM node:18-alpine as frontend-build

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# REACT_APP_API_URL should be passed as build arg from Render environment variables
# If not set, will fallback to window.location.origin in the frontend code
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# ---------------------------
# BACKEND STAGE
# ---------------------------
FROM node:18-alpine

WORKDIR /app

# Backend install
COPY backend/package*.json ./
RUN npm install --production

# Copy backend code
COPY backend/ ./

# Copy built frontend into backend's public folder
COPY --from=frontend-build /frontend/build ./public

# Make SQLite folder
RUN mkdir -p /app/data

EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 10000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]

