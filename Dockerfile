# Base image with Node.js and Python
FROM node:20-bullseye

# Install Python 3.11 and pip
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and Prisma schema first
COPY package*.json ./
COPY requirements.txt ./
COPY prisma ./prisma/

# Install Node.js dependencies (postinstall will run prisma generate)
RUN npm install

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy rest of application code
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Create init script to set up volume directories
RUN echo '#!/bin/sh\n\
mkdir -p /app/data/sessions /app/data/uploads /app/data/scraped_data\n\
chmod -R 777 /app/data\n\
exec npm start' > /app/start.sh && chmod +x /app/start.sh

# Start application with init script
CMD ["/app/start.sh"]
