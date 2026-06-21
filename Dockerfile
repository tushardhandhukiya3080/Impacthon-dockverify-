# ---- DocVerify production image (for Coolify / any Docker host) ----
# Node ESM Express app that serves the vanilla frontend + REST API.
FROM node:20-bookworm-slim

# System deps:
#  - python3/make/g++  -> build native addons (bcrypt) during npm ci
#  - ca-certificates    -> outbound HTTPS (MongoDB Atlas, Pinata, Gemini, RPC)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the application source.
COPY . .

# Let the unprivileged "node" user own the app dir so runtime writes
# (e.g. tesseract.js OCR language cache, temp files) succeed.
RUN chown -R node:node /app

# Runtime config. Coolify can override PORT; the app reads process.env.PORT.
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Drop root for runtime (the node image ships an unprivileged "node" user).
USER node

CMD ["node", "server.js"]
