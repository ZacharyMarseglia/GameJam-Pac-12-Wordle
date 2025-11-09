FROM node:20-alpine

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy everything, including data/
COPY . .

# Ensure Node runs in production mode
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "server.js"]
