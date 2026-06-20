# Finqora — Deployment / Run Guide

How to run Finqora locally or self-hosted. The recommended path is **Docker** (one command set, everything containerized). A "from source" dev path is included at the end.

Repo location on this machine: `C:\Users\ASHYA ENT\Desktop\finqora\bigcapital`

---

## Architecture (what actually runs)

Finqora is a multi-container stack orchestrated by Docker Compose:

| Container | Image | Role |
|-----------|-------|------|
| `proxy` | envoy | Edge proxy on ports 80/443 → routes to webapp + API |
| `webapp` | `*/finqora-webapp` (nginx) | React SPA |
| `server` | `*/finqora-server` (NestJS) | API on port 3000 |
| `database_migration` | built from `docker/migration/Dockerfile` | Runs DB migrations on boot, then exits |
| `mysql` | MariaDB | System DB + one DB per organization (tenant) |
| `redis` | Redis | Queues / cache |
| `gotenberg` | gotenberg | PDF rendering |

Services find each other by **service name** (`mysql`, `redis`, `server`, …), not container name.

---

## Path A — Run with Docker (recommended)

### Step 0 — Install Docker Desktop (one time)
Docker is **not currently installed** on this machine. On Windows 10/11:

```powershell
wsl --install        # installs WSL2 backend; reboot if prompted
```
Then install **Docker Desktop for Windows** from https://www.docker.com/products/docker-desktop/, launch it, and wait until it reports **running**. Verify:
```powershell
docker version
docker compose version
```

### Step 1 — Configure environment
A `.env` file has already been generated at the repo root with secure secrets and
branded DB names (`finqora_system`, `finqora_tenant_`). Review it and, if you want
email (invites / verification) to work, fill in the `MAIL_*` values. Otherwise leave them blank.

> The tenant prefix env var is intentionally spelled `TENANT_DB_NAME_PERFIX` (legacy typo in the code) — do not "correct" it.

### Step 2 — Build & publish your Finqora images (Docker Hub: `udco`)
Run from the repo root:
```powershell
docker login                                              # log in as udco
docker build -t udco/finqora-server:latest -f packages/server/Dockerfile .
docker build -t udco/finqora-webapp:latest -f packages/webapp/Dockerfile .
docker push udco/finqora-server:latest
docker push udco/finqora-webapp:latest
```
Then make compose use your images (3 references):
- `server.image` and `webapp.image` in `docker-compose.prod.yml` → `udco/finqora-server:latest` / `udco/finqora-webapp:latest`
- `FROM bigcapitalhq/server:latest` in `docker/migration/Dockerfile` → `FROM udco/finqora-server:latest`

> Skip Step 2 entirely if you just want to smoke-test the stack — the current
> `docker-compose.prod.yml` already points at the public `bigcapitalhq/*` images
> (but those won't show your Finqora rebrand).

### Step 3 — Bring up the DATABASE first
```powershell
docker compose -f docker-compose.prod.yml up -d mysql redis
docker compose -f docker-compose.prod.yml ps      # wait until mysql is healthy/up
```

### Step 4 — Run migrations
```powershell
docker compose -f docker-compose.prod.yml up -d database_migration
docker compose -f docker-compose.prod.yml logs -f database_migration
```
This creates the **system** database schema. (Per-organization tenant DBs are
created automatically when you register an organization in the app.)

### Step 5 — Bring up the APPLICATION
```powershell
docker compose -f docker-compose.prod.yml up -d server webapp gotenberg proxy
docker compose -f docker-compose.prod.yml ps
```

### Step 6 — Open & verify
- Open **http://localhost**
- Register the first user / organization (this provisions a tenant DB)
- Health check: `http://localhost/api/system_db` should return success

### Everyday commands
```powershell
docker compose -f docker-compose.prod.yml logs -f server     # tail API logs
docker compose -f docker-compose.prod.yml restart server     # restart a service
docker compose -f docker-compose.prod.yml down               # stop (keeps data)
docker compose -f docker-compose.prod.yml down -v            # stop + DELETE all data volumes
```

---

## Path B — Run from source (development)

Use this for active development with hot-reload. Requires **Node 18.16.1** and **pnpm 9**.

```powershell
# 1) Infra only (DB/cache/PDF) via Docker — exposes 3306/6379 on localhost
docker compose -f docker-compose.yml up -d

# 2) Install workspace deps
pnpm install

# 3) Server env: copy packages/server/.env.example -> packages/server/.env
#    and set DB_HOST=localhost (since DB is exposed locally, not via the 'mysql' service name)

# 4) Migrate
pnpm run system:migrate:latest
pnpm run tenants:migrate:latest

# 5) Run (two terminals, or `pnpm run dev` for both)
pnpm run dev:server      # API at http://localhost:3000
pnpm run dev:webapp      # webapp dev server (Vite)
```

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `docker: command not found` | Docker Desktop not installed/running (Step 0) |
| `pull access denied for udco/finqora-server` | You haven't pushed the image yet (Step 2) or compose points at a non-existent image |
| Server can't reach DB | In Docker use `DB_HOST=mysql`; from source use `DB_HOST=localhost` |
| Migrations hang | They wait for MySQL — confirm `mysql` is healthy first (Step 3) |
| Emails not sending | `MAIL_*` not configured in `.env` (optional) |
| Want a clean reset | `docker compose -f docker-compose.prod.yml down -v` then redo from Step 3 |
