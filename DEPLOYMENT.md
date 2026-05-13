# Deployment Guide (Backend First, Frontend Later)

This guide assumes the backend is deployed to Render first, then the frontend to Vercel. It also supports a temporary backend-only mode while the frontend is pending.

## 1) Prerequisites
- Rotate any leaked secrets before deploying (MongoDB user password, Redis password, SECRET_KEY).
- Ensure you have a MongoDB Atlas database and an Upstash Redis instance.

## 2) Render (Backend)
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

## 3) Vercel (Frontend)
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

## 4) Post-deploy checks
- Auth flow works (login, logout, reset password).
- Exposure-check requires auth.
- Rate limiting enforced (429 after repeated calls).
- CORS allows only the frontend origin.

## 5) Local development
Use backend/.env for local values:
- FRONTEND_BASE_URL=http://localhost:4200
- CORS_ORIGINS=http://localhost:4200
- AUTH_COOKIE_SECURE=false
- AUTH_COOKIE_SAMESITE=Lax
