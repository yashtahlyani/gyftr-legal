# GyfTR Legal Portal

Vite frontend + Express backend — legal agreement tracking on AWS.

## Structure

```
gyftr-legal/
├── frontend/          # Vite app (index.html login + app.html portal) + Dockerfile
├── backend/           # Express API + Dockerfile
├── docker-compose.yml # Local run of both services
├── migration/         # Cognito / DB migration scripts
├── infra/             # AWS setup notes
└── package.json       # Convenience scripts
```

## Ports

| Service  | Port |
|----------|------|
| Frontend | **7979** |
| Backend  | **7978** |

## Local development

```bash
npm run install:all

# Terminal 1 — API
cp backend/.env.example backend/.env   # fill values
npm run dev:backend

# Terminal 2 — UI
cp frontend/.env.example frontend/.env.local
npm run dev:frontend
```

## Docker

```bash
cp .env.example .env   # fill Cognito + DB values
docker compose up --build
```

- Frontend: http://localhost:7979  
- Backend:  http://localhost:7978/health  

See `infra/HANDOVER.md` and `infra/aws-setup.md` for production AWS deployment.
