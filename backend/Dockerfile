# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Expose port 3001
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["npm", "start"]
