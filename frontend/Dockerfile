FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install

# Copy the rest of the source.
COPY . .

EXPOSE 5173

# Run the Vite dev server, listening on all interfaces so it is reachable
# from the host machine.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
