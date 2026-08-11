# GyfTR Legal — Frontend (Vite multi-page → static serve)
# Base image is ARM — build/run on linux/arm64 (e.g. Graviton).
#
# Build:
#   docker build --platform linux/arm64 \
#     --build-arg VITE_API_URL=https://backend-legal.gyftr.net \
#     --build-arg VITE_COGNITO_USER_POOL_ID=ap-south-1_xxx \
#     --build-arg VITE_COGNITO_CLIENT_ID=xxx \
#     -t gyftr-legal-frontend ./frontend
#
# Run:
#   docker run --platform linux/arm64 -p 7979:7979 gyftr-legal-frontend

ARG BASE_IMAGE=653380732738.dkr.ecr.ap-south-1.amazonaws.com/node-24.18.0-alpine3.24-arm:node-24.18.0-alpine3.24-arm

# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM ${BASE_IMAGE} AS build

WORKDIR /app

COPY package.json package-lock.json ./

# Base image sets NODE_ENV=production (skips vite in devDependencies).
# Override for install only — vite build must run in production mode.
RUN NODE_ENV=development npm ci --include=dev

COPY index.html app.html vite.config.js ./
COPY src ./src

ARG VITE_API_URL
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_OPENAI_API_KEY
ARG VITE_GOOGLE_DOCS_API_KEY
ARG VITE_GOOGLE_DRIVE_API_KEY
ARG VITE_GOOGLE_PICKER_API_KEY
ARG VITE_GOOGLE_OAUTH_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_OPENAI_API_KEY=$VITE_OPENAI_API_KEY \
    VITE_GOOGLE_DOCS_API_KEY=$VITE_GOOGLE_DOCS_API_KEY \
    VITE_GOOGLE_DRIVE_API_KEY=$VITE_GOOGLE_DRIVE_API_KEY \
    VITE_GOOGLE_PICKER_API_KEY=$VITE_GOOGLE_PICKER_API_KEY \
    VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID

RUN npm run build

# ── Stage 2: serve static files (MPA: index.html + app.html) ────────────────
FROM ${BASE_IMAGE}

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 7979

# No -s flag: this is a multi-page app (login + portal), not a single SPA.
CMD ["serve", "dist", "-l", "7979"]
