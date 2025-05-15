# Use a base image with Python and Node.js for backend and frontend
FROM python:3.9-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend

# Install Node.js for frontend
FROM node:16 AS frontend

# Copy frontend code
COPY frontend /app/frontend
WORKDIR /app/frontend

# Install frontend dependencies
RUN npm install

# Build frontend
RUN npm run build

# Final stage: Combine backend and frontend
FROM python:3.9-slim

# Copy backend and frontend build
COPY --from=backend /app /app
COPY --from=frontend /app/frontend/build /app/frontend/build

# Expose ports
EXPOSE 5000 3000

# Start backend and serve frontend
CMD ["python", "/app/backend/app.py"]