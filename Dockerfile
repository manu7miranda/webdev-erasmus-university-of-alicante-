# Club events: the image that runs in the codespace and on Render.
FROM node:22-slim

WORKDIR /app

# Install dependencies first, so this layer is reused when only the code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public

ENV NODE_ENV=production
EXPOSE 3000

# Run as the unprivileged "node" user, not as root.
USER node

# Real values come from the environment (Render settings or --env-file), never from the image.
CMD ["node", "src/server.js"]
