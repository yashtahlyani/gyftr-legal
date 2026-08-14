# Backend — Express API.
# Unlike the frontend, every value here is read at RUNTIME from the
# environment, so the same image is promoted across environments unchanged.

FROM node:20-alpine
WORKDIR /app

# Install deps first so a code-only change reuses this layer.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Don't run as root.
USER node

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# The ALB target group health check hits this; schema.sql is applied on boot,
# so a container that reports healthy has a reachable database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
