FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the source.
COPY . .

EXPOSE 4000

CMD ["node", "server.js"]
