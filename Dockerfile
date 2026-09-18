# Multi-Stage Dockerfile for MemoryOS (Backend + Frontend)
# Deployable to Railway, Render, Fly.io, or Docker Desktop

# Stage 1: Build Frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:24-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Production Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_FILE=/app/data/memoryos.db

# Install production backend dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy compiled frontend into frontend/dist for Express static serving
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Persistent data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 5000

CMD ["node", "dist/server.js"]
