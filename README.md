# Newli Marketplace

Athletics-focused marketplace starter: **Next.js (TypeScript)**, **FastAPI**, and **PostgreSQL** — coaches and students discover each other by sport, goals, and story-driven profiles.

## What ships in this repo

- `web/` — Next.js App Router UI (home, coach directory with filters, coach detail).
- `api/` — FastAPI service with health check, sports catalog, coach profiles, and student goals.
- `api/alembic/` — Initial schema migration plus seed sports and demo coaches/goals.

Local development follows the project skill: **no Docker** for running Postgres, the API, or the web app.

## Prerequisites (Windows)

1. **Node.js** with npm (LTS recommended).
2. **Python 3.12+**  
   Example: `winget install Python.Python.3.12`
3. **PostgreSQL** (service running on `localhost:5432`)  
   Example: `winget install PostgreSQL.PostgreSQL.17`  
   Complete the installer’s prompts (remember the password you set for the `postgres` superuser).

After installation, ensure the database service is running (Services app → PostgreSQL, or the Stack Builder / pgAdmin guidance from the installer).

## One-time database setup

Using **SQL Shell (psql)** or any client, connect as the `postgres` superuser and run:

```sql
CREATE DATABASE newli_marketplace;
```

Create a login that matches your connection string, or reuse `postgres` and align the password with `api/.env`.

## Configure environment

Copy examples and adjust credentials:

```powershell
copy api\.env.example api\.env
copy web\.env.example web\.env
```

`api/.env` keys:

- `DATABASE_URL` — e.g. `postgresql://postgres:YOUR_PASSWORD@localhost:5432/newli_marketplace`
- `ALLOWED_ORIGINS` — include `http://localhost:3000` for browser calls from the Next dev server

`web/.env`:

- `NEXT_PUBLIC_API_URL` — default `http://localhost:8000`

## Run the API

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- Interactive docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

## Run the web app

```powershell
cd web
npm install
npm run dev
```

Open `http://localhost:3000` — the home page calls `/health` and lists counts when the API and database are reachable.

## Smoke test checklist

1. `GET http://localhost:8000/health` returns `{"status":"ok"}`.
2. `GET http://localhost:8000/sports` returns seeded sports (swimming, triathlon, mountain biking, running).
3. `GET http://localhost:8000/coaches` returns three demo coaches.
4. Home page shows **API connected** with non-zero counts.
5. `/coaches` renders cards; filters by `sport_slug` and text `q` work.

## Cursor starter commands

Try `/teach-me` or `/plan` from the `.cursor/commands` folder for guided workflows.

### Anthropic `frontend-design` skill (optional)

This repo vendors the skill at [`.cursor/skills/frontend-design/SKILL.md`](.cursor/skills/frontend-design/SKILL.md). To refresh or install via the CLI (non-interactive):

```powershell
npx --yes skills add https://github.com/anthropics/skills --skill frontend-design -y
```

If the installer still prompts for targets, choose **Cursor** so it lands under `.cursor/skills/`.

## Optional: deploy to GCP

See `.cursor/skills/deploy-to-gcp-serverless/SKILL.md` — cloud deploy uses container images for Cloud Run; that is separate from the local “no Docker” workflow above.
