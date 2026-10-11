# 🌍 EcoTrack

Track your daily environmental impact. Log eco-friendly (and not so eco-friendly) activities, earn points and badges, set goals, follow your streak, see an estimate of the CO₂ you've saved, and compare with others on the leaderboard.

- **Frontend:** React 19 (Create React App), axios, Chart.js
- **Backend:** Node.js, Express 5, Mongoose
- **Database:** MongoDB (local or MongoDB Atlas)

```
backend/    Express API (server.js, routes/, services/, models/, middleware/)
frontend/   React app (src/)
```

## Features

- Accounts (register / log in) plus a shared **demo account** anyone can try with one click. The demo is re-seeded with sample data every few hours.
- Predefined and custom activities, with edit, delete and CSV export
- Points, badges, daily/weekly/monthly goals with history, and streaks
- Estimated CO₂ saved (today / 7 days / all time). These are rough estimates, not measurements.
- Leaderboard by points or by badges
- Dark mode and a mobile-friendly layout

## Run locally

You need Node.js 20+ and a MongoDB database (a local server, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
# edit .env and set MONGO_URI (see "Environment variables")
npm start                 # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start                 # http://localhost:3000
```

The frontend talks to `http://localhost:5000` by default. Open http://localhost:3000 and click **Try the demo**.

## Environment variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string. For Atlas, include the database name: `...mongodb.net/ecotrack?retryWrites=true&w=majority` |
| `JWT_SECRET` | in production | Secret for signing login tokens. The server refuses to start without it when `NODE_ENV=production`. |
| `FRONTEND_URL` | in production | Allowed CORS origin(s), comma-separated, no trailing slash. Empty allows any origin (development only). |
| `NODE_ENV` | no | Set to `production` when deployed |
| `PORT` | no | Defaults to 5000 (Render sets it for you) |
| `DEMO_RESET_HOURS` | no | How often the demo account is reset (default 6) |

### Frontend (`frontend/.env`, see `frontend/.env.example`)

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend base URL. **Baked in at build time**, so changing it needs a rebuild/redeploy. Defaults to `http://localhost:5000`. |

> **Never commit a real `.env`.** Both `.gitignore` files exclude it; use the `.env.example` files as templates.

## Deploying

Recommended setup: **MongoDB Atlas** (database) + **Render** (backend) + **Vercel** (frontend).

1. **Atlas:** create an M0 cluster and a database user. Under *Network Access* allow `0.0.0.0/0` (Render's free tier has no fixed IP). Copy the connection string and add `/ecotrack` as the database name.
2. **Render:** New → Web Service from this repo.
   - Root Directory `backend`, Build Command `npm install`, Start Command `npm start`
   - Health Check Path `/healthz`
   - Environment: `MONGO_URI`, `JWT_SECRET` (a long random value), `NODE_ENV=production`, and `FRONTEND_URL` (set after step 3)
3. **Vercel:** import this repo with Root Directory `frontend` (Create React App preset).
   - Set `REACT_APP_API_URL` to your Render URL **before the first build**.
   - Then set `FRONTEND_URL` on Render to your Vercel URL.

Notes:
- Render's free tier sleeps after ~15 minutes idle, so the first request can take 30–60 seconds. The app shows a "Waking up the server…" banner while this happens.
- Generate a JWT secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## API overview

All routes except `/api/auth/*`, `/api/test` and `/healthz` require `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/demo`; `GET /api/auth/me` |
| Activities | `GET/POST /api/activities`, `PUT/DELETE /api/activities/:id`, `GET /api/activities/export.csv` |
| Goals | `GET/POST /api/goals`, `GET /api/goals/history`, `PUT/DELETE /api/goals/:id`, `PUT /api/goals/:id/archive` |
| Stats | `GET /api/stats`, `GET /api/summary`, `GET /api/badges`, `GET /api/leaderboard/points`, `/api/leaderboard/badges` |
