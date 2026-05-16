# Deployment Guide (Backend First, Frontend Later)

This guide assumes the backend is deployed to Render first, then the frontend to Vercel. It also supports a temporary backend-only mode while the frontend is pending.

## 1) Prerequisites
- Rotate any leaked secrets before deploying (MongoDB user password, Redis password, SECRET_KEY).
- Ensure you have a MongoDB Atlas database and an Upstash Redis instance.

## 2) GitHub Configuration (CI/CD & Sync)
Add these secrets to your repository (Settings -> Secrets and variables -> Actions):
- **`MONGO_URI`**: Production MongoDB Atlas URL (required for Daily OSINT Sync).
- **`HIBP_API_KEY`**: (Optional) For high-speed synchronization; otherwise, the public API is used.

## 3) Render (Backend)
### Render settings
- Service type: Web
- Root directory: backend
- Build command: ./build.sh
- Start command: gunicorn run:app

### Required environment variables
Set these in Render (Dashboard -> Environment):

Core
- MONGO_URI
- SECRET_KEY
- IP_ANONYMIZATION_SALT
- FLASK_ENV=production

Redis
- RATELIMIT_STORAGE_URL (use rediss://)
- CACHE_REDIS_URL (use rediss://)
- CACHE_TYPE=RedisCache

Security and cookies
- AUTH_COOKIE_SECURE=true
- AUTH_COOKIE_SAMESITE=Lax (use None when frontend is on a different domain)
- AUTH_COOKIE_DOMAIN (optional)
- CSRF_ENABLED=true
- CSRF_COOKIE_NAME=bl_csrf
- CSRF_HEADER_NAME=X-CSRF-Token

Frontend routing (backend-only mode)
- FRONTEND_PENDING=true
- FRONTEND_BASE_URL=https://YOUR-RENDER-APP.onrender.com
- CORS_ORIGINS=https://YOUR-RENDER-APP.onrender.com

Other
- SWAGGER_ENABLED=false

### Deploy
- Push to main (Render watches main).
- Verify health: GET /health returns status ok.
- Verify login and password reset: POST /api/v1/auth/login and /api/v1/auth/forgot-password.

## 4) Vercel (Frontend)
Deploy the frontend after the backend is stable.

### Vercel environment variables
- API base URL (use your Render backend URL).

### Switch backend to frontend live
Update Render env vars:
- FRONTEND_PENDING=false
- FRONTEND_BASE_URL=https://YOUR-VERCEL-APP.vercel.app
- CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app
- AUTH_COOKIE_SAMESITE=None (if frontend is on a different domain)
- AUTH_COOKIE_DOMAIN=.vercel.app (optional, only if needed)

## 5) Post-deploy checks
- **Defense Hub**: Log in and verify that your Personal Threat Advisory and Risk Genome load correctly.
- **Daily Sync**: Check the GitHub "Actions" tab once a day to ensure the `OSINT Data Synchronization` workflow is passing.
- **Alerts**: Verify that the "Open Alerts" panel on the Dashboard correctly pulls unacknowledged events.
- **Rate Limiting**: Enforced (429 after repeated calls on protected endpoints).
- **CORS**: Allows only the frontend origin.

## 6) Local development
Use backend/.env for local values:
- FRONTEND_BASE_URL=http://localhost:4200
- CORS_ORIGINS=http://localhost:4200
- AUTH_COOKIE_SECURE=false
- AUTH_COOKIE_SAMESITE=Lax
