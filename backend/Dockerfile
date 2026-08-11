# GyfTR Legal — Backend API
ARG BASE_IMAGE=653380732738.dkr.ecr.ap-south-1.amazonaws.com/node-24.18.0-alpine3.24-arm:node-24.18.0-alpine3.24-arm
FROM ${BASE_IMAGE}

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=7978

EXPOSE 7978

# Env vars (DB_*/AWS_SECRET_NAME, COGNITO_*, FRONTEND_URL, DRAFTS_BUCKET, etc.)
# are injected at runtime — do not bake secrets into the image.
CMD ["node", "server.js"]
