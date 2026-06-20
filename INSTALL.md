# Finqora — Installation Guide

This guide installs and runs **Finqora** on a fresh machine using **Docker**. The
target machine needs **only Docker** — no Node.js, no source build, no Claude, no
developer tooling.

There are two audiences:

- **Part A — Recipient / Operator:** you were given Finqora and just want to run it.
- **Part B — Distributor:** you are the one packaging Finqora to hand to others.

If you just want to run it, read **Part A**. If you are shipping it to customers,
read **Part B** first (you build and publish the images once), then your recipients
follow **Part A**.

---

## Part A — Install & Run (Recipient)

### A1. Prerequisites (one time)

You need **Docker** with the Compose plugin.

**Windows 10/11**
1. Open PowerShell **as Administrator** and run:
   ```powershell
   wsl --install
   wsl --update
   ```
   Reboot if prompted.
2. Install **Docker Desktop for Windows**: https://www.docker.com/products/docker-desktop/
3. Launch Docker Desktop and wait until it shows **"Engine running"**.

**macOS** — install **Docker Desktop for Mac** from the same link.

**Linux** — install **Docker Engine + Compose plugin**:
https://docs.docker.com/engine/install/

Verify (any OS):
```bash
docker version
docker compose version
```

### A2. Get the Finqora files

You need the project folder (it contains the compose file and the `docker/` build
contexts). Either:

- `git clone <your-finqora-repo-url>` and `cd` into it, **or**
- unzip the Finqora bundle you were given and `cd` into it.

You should see `docker-compose.prod.yml`, an `.env.example` file, and a `docker/`
folder.

### A3. Configure environment

Copy the example env file and fill it in:

```bash
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set **at minimum**:

| Variable | What to set |
|---|---|
| `DB_USER` / `DB_PASSWORD` | A database username and a strong password |
| `DB_ROOT_PASSWORD` | A strong MySQL root password |
| `SYSTEM_DB_NAME` | Leave as `finqora_system` |
| `TENANT_DB_NAME_PERFIX` | Leave as `finqora_tenant_` (the spelling "PERFIX" is intentional — do **not** fix it) |
| `JWT_SECRET` / `APP_JWT_SECRET` | Long random strings |
| `BASE_URL` | `http://localhost` for local use, or your domain |
| `MAIL_*` | Optional — only needed for email (invites / password reset) |

> **Security:** never reuse the example/default secrets in production, and never
> commit your real `.env` to git. It is already covered by `.gitignore`.

### A4. Start the DATABASE first

```bash
docker compose -f docker-compose.prod.yml up -d mysql redis
docker compose -f docker-compose.prod.yml ps        # wait until 'mysql' is Up
```

### A5. Run the database migrations

```bash
docker compose -f docker-compose.prod.yml up -d database_migration
docker compose -f docker-compose.prod.yml logs -f database_migration
```
Wait until you see `All tenants are migrated.` and the container exits (status
`Exited (0)`). This creates the **system** database schema. Per-organization
(tenant) databases are created automatically when you register an organization.

### A6. Start the APPLICATION

```bash
docker compose -f docker-compose.prod.yml up -d server webapp gotenberg proxy
docker compose -f docker-compose.prod.yml ps
```
The first run downloads the app images, which can take several minutes.

### A7. Open and verify

- Open **http://localhost** (or your `BASE_URL`).
- Register the first user / organization — this provisions the first tenant DB.
- API health check: **http://localhost/api/system_db** should return success.

### A8. Everyday operations

```bash
docker compose -f docker-compose.prod.yml logs -f server     # tail API logs
docker compose -f docker-compose.prod.yml restart server     # restart a service
docker compose -f docker-compose.prod.yml stop               # stop (keeps data)
docker compose -f docker-compose.prod.yml up -d              # start again
docker compose -f docker-compose.prod.yml down               # remove containers (keeps data volumes)
docker compose -f docker-compose.prod.yml down -v            # remove containers AND DELETE all data
```

Your data lives in the named Docker volumes (`*_prod_mysql`, `*_prod_redis`) and
survives `stop`/`down`. Only `down -v` deletes it.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `docker: command not found` / engine won't start | Docker Desktop not installed/running (A1). On Windows, run `wsl --update`, then fully quit & relaunch Docker Desktop, or reboot. |
| `pull access denied for .../server` | The compose file points at images that don't exist or you can't access. The distributor must publish them (Part B) or you must `docker login`. |
| Server can't reach DB | DB isn't ready yet — confirm `mysql` is Up before migrating (A4). |
| Migrations hang | They wait for MySQL. Confirm `mysql` is healthy first. |
| Port 80 already in use | Another app owns port 80. Change `PUBLIC_PROXY_PORT` in `.env` to e.g. `8080` and use `http://localhost:8080`. |

---

## Part B — Package & Distribute (Distributor)

The cleanest distribution model: **publish versioned `server` and `webapp` images to
a container registry once**, then hand recipients the repo files. They never build
application code — they just pull your images and run Compose.

### B1. Pick a registry namespace

Use Docker Hub or GitHub Container Registry (GHCR). Examples below use a placeholder
`YOURNS` (e.g. your Docker Hub username). Log in:

```bash
docker login                      # Docker Hub
# or: echo $TOKEN | docker login ghcr.io -u YOURNS --password-stdin
```

### B2. Build and push the application images

Use a **real version tag**, not just `latest`, so deployments are reproducible:

```bash
VERSION=1.0.0

docker build -t YOURNS/finqora-server:$VERSION -f packages/server/Dockerfile .
docker build -t YOURNS/finqora-webapp:$VERSION -f packages/webapp/Dockerfile .

docker push YOURNS/finqora-server:$VERSION
docker push YOURNS/finqora-webapp:$VERSION
```

### B3. Point the compose file at your images

In `docker-compose.prod.yml`, set:

- `server.image:` → `YOURNS/finqora-server:1.0.0`
- `webapp.image:` → `YOURNS/finqora-webapp:1.0.0`

And in `docker/migration/Dockerfile`, change the first line:

- `FROM bigcapitalhq/server:latest` → `FROM YOURNS/finqora-server:1.0.0`

> Pin the **same version** in all three places so the migration logic always matches
> the running server.

### B4. Prepare the hand-off bundle

Ship the recipient a copy of the repo that includes:

- `docker-compose.prod.yml` (pointing at your published images)
- the entire `docker/` folder (mariadb, redis, migration build contexts)
- `.env.example` (with **placeholders only** — never your real secrets)
- `INSTALL.md` (this file)

Do **NOT** include:

- your real `.env` (contains live secrets)
- `node_modules`, `.git` history with secrets, local override files
  (e.g. `docker-compose.dbeaver.yml`, which exposes DB ports for local debugging)

Easiest: tag a release in your private repo and let recipients `git clone`, or
`git archive` a clean zip:

```bash
git archive --format=zip --output=finqora-1.0.0.zip HEAD \
  docker-compose.prod.yml docker .env.example INSTALL.md README.md
```

### B5. Distribution best practices

- **Version everything.** Tag images `1.0.0`, `1.0.1`, … and tag git releases to
  match. Avoid shipping `:latest` to customers — it makes "what's deployed?"
  unanswerable.
- **Never ship secrets.** Ship `.env.example` with blank/placeholder values. Each
  install generates its own secrets. If a real secret was ever committed or shared,
  rotate it.
- **Document the upgrade path.** To upgrade: `git pull` (or unzip the new bundle),
  then `docker compose -f docker-compose.prod.yml pull && up -d`. Migrations re-run
  automatically via the `database_migration` service.
- **Back up data.** Tell operators their data is in the named volumes; document a
  `mysqldump` backup command for production.
- **Licensing.** Finqora is built on Bigcapital and distributed under **AGPL**. If
  you distribute it, you must comply with the AGPL (keep the `LICENSE`, provide
  corresponding source). Keep the attribution in `README.md`.
- **For multi-machine / production**, put the `proxy` behind TLS (real certs), set a
  real `BASE_URL` (https), and restrict which ports are published to the host.
```
