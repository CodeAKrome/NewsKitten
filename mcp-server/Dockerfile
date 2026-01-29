# Multi-stage build for NewsKit MCP Server
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the project
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip3 install --break-system-packages \
    chromadb \
    sentence-transformers \
    pandas \
    numpy \
    scikit-learn

# Copy package files
COPY package*.json ./

# Install production Node.js dependencies
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/build ./build

# Copy Python bridge
COPY python_bridge.py ./

# Set executable permissions
RUN chmod +x build/index.js

# Create directory for ChromaDB
RUN mkdir -p /app/chroma_db

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONPATH=/app

# Expose no ports (uses stdio transport)

# Run the server
ENTRYPOINT ["node", "build/index.js"]