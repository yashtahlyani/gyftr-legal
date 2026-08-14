# Frontend — build the static bundle, serve it with nginx.
#
# Multi-page app: index.html is the login page, app.html is the portal.
#
# Vite inlines VITE_* variables at BUILD time, so they are build args here, not
# runtime env vars. Passing them at `docker run` has no effect — the values are
# already baked into the JavaScript.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_COGNITO_USER_POOL_ID
ARG VITE_COGNITO_CLIENT_ID
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ARG VITE_GOOGLE_DOCS_API_KEY
ARG VITE_GOOGLE_DRIVE_API_KEY
ARG VITE_GOOGLE_PICKER_API_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID \
    VITE_GOOGLE_DOCS_API_KEY=$VITE_GOOGLE_DOCS_API_KEY \
    VITE_GOOGLE_DRIVE_API_KEY=$VITE_GOOGLE_DRIVE_API_KEY \
    VITE_GOOGLE_PICKER_API_KEY=$VITE_GOOGLE_PICKER_API_KEY

# NODE_ENV=production makes Vite strip the dev-only demo login. Never build
# this image with NODE_ENV=development.
RUN npm run build

# ── Serve ────────────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
