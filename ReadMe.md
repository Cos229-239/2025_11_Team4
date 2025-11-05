# OrderEasy | Team 4

## This is Sparta ⚔️

Welcome to **OrderEasy**, the dine-in digital ordering project by **Team 4**.

- 📄 **Software Design Document (v.01):** `docs/OrderEasy_SDD_v.01.md`
- 🧭 Branching model: lanes + short-lived features (`frontend/`, `backend/`, `ui/`)
- ✅ CI: GitHub Actions on PRs to `dev/main`


## Run this branch locally

# 1) Get my branch
git fetch origin
git switch -c AntoynePersonal --track origin/AntoynePersonal

# 2) Start the API
cd server
npm i
node index.js     # http://localhost:3000

# 3) Start the web app
cd ../web
npm i
# Windows:
copy .env.example .env
# mac/linux:
# cp .env.example .env
# .env contains: VITE_API_URL=http://localhost:3000
npm run dev       # http://localhost:5173

## What’s included

-- Vite + React app in web/ with Tailwind configured

-- Local API in server/ with GET /health, GET /orders, GET /orders/:id

-- Kitchen Dashboard reading from API

-- .env.example and .gitignore (don’t commit .env)

## What’s next (Antoyne)

-- Kitchen UI states (NEW / IN-PROGRESS / READY) + polling or websockets

-- (Confirm with Eric) Railway deploy plan for server/ and web/

-- SDD updates: API contract + simple ERD