# Running BOTH apps (old + new) on another machine

This brings up **two apps that share ONE database** on a fresh machine:

| App | URL | What it is |
|-----|-----|------------|
| **Old** | http://localhost | Upstream Bigcapital (public images `bigcapitalhq/server:latest` + `webapp:latest`) |
| **New** | http://localhost:8095 | Finqora brand logo + Phase 1‑3 features, **built from this repo's source** |

Both read/write the **same MySQL** (`finqora-mysql`), so the same login and data work on both. No private image registry is needed — the new app is built from the cloned repo.

---

## 0. Prerequisites

- **Git**
- **Docker Engine + Docker Compose v2** (the `docker compose` subcommand, not the old `docker-compose`)
- Free host ports **80** and **8095**
- ~4 GB free disk + RAM for the build

### Install Docker

**Ubuntu**
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER        # then log out/in so 'docker' works without sudo
docker compose version               # verify v2
```

**Windows**
- Install **Docker Desktop** (includes Compose v2) and **Git for Windows**.
- Start Docker Desktop and wait until it says *Engine running*.
- Use **PowerShell** for the commands below.
- Make sure nothing else owns port 80 (IIS, Skype, etc.).

---

## 1. Get the code

**Ubuntu (bash)**
```bash
git clone https://github.com/theUsamasaleem/bigcapital.git
cd bigcapital
git checkout finqora/features
```

**Windows (PowerShell)** — keep LF line endings so the in-container shell scripts work:
```powershell
git config --global core.autocrlf input
git clone https://github.com/theUsamasaleem/bigcapital.git
cd bigcapital
git checkout finqora/features
```

> ⚠️ **Windows line-endings matter.** The MySQL/Redis images copy shell scripts
> (`docker/mariadb/docker-entrypoint.sh`). If Git rewrites them to CRLF the DB
> container fails to initialize. Setting `core.autocrlf input` **before** cloning
> (as above) prevents this. If you already cloned, run:
> `git rm --cached -r . ; git reset --hard` after setting the config.

---

## 2. Provide the `.env` file

`.env` holds secrets (DB passwords, mail, JWT) and is **git‑ignored**, so it is *not* in the clone. Copy the working `.env` from your current machine to the repo root on the new machine.

- **Ubuntu/Mac → new machine:** `scp .env user@NEWHOST:/path/to/bigcapital/.env`
- **Windows:** copy the file via USB / shared drive / `scp` into the repo folder.

The DB user/password in `.env` are what the database is initialized with on first boot — both apps and DBeaver use them. (If you don't have the old `.env`, copy `.env.example` to `.env` and fill in the same values you used originally; the passwords must match across both apps.)

---

## 3. Bring up the OLD app (creates the shared DB)

Run it under the project name **`finqora`** (this fixes the network name the new app references).

**Ubuntu (bash)**
```bash
docker compose -p finqora -f docker-compose.prod.yml --env-file .env up -d --build
```

**Windows (PowerShell)**
```powershell
docker compose -p finqora -f docker-compose.prod.yml --env-file .env up -d --build
```

Wait for the one‑shot migration to finish (it creates the system schema), then confirm:
```bash
docker logs -f finqora-database-migration      # Ctrl-C when it stops/exits
docker ps                                        # finqora-server should be healthy
```
The old app is now at **http://localhost**.

---

## 4. Bring up the NEW app (shares that DB, builds from source)

Project name **`finqora-new`**. First run builds the new webapp + server from source (a few minutes).

**Ubuntu (bash)**
```bash
docker compose -p finqora-new -f docker-compose.newapp.yml --env-file .env up -d --build
```

**Windows (PowerShell)**
```powershell
docker compose -p finqora-new -f docker-compose.newapp.yml --env-file .env up -d --build
```

This builds `finqora-new-webapp:local` and `finqora-new-server:local`, applies the
Phase 1‑3 migration delta to the **shared** DB, and starts the new app at
**http://localhost:8095**.

Confirm:
```bash
docker logs finqora-new-migration     # should print 'MIGRATIONS DONE'
docker ps                              # finqora-new-server healthy
```

---

## 5. Create your account (do this on the NEW app)

Because both apps share one DB and you're starting fresh, **sign up on the NEW app first** so the new organization/tenant gets the full Phase 1‑3 schema:

1. Open **http://localhost:8095** → register your user + organization.
2. That same login then works on the **old** app at **http://localhost** too (it tolerates the extra Phase 1‑3 tables).

> Sign-up is enabled and email confirmation is off (see `.env`
> `SIGNUP_DISABLED=false`, `SIGNUP_EMAIL_CONFIRMATION=false`), so no mail is needed.

---

## 6. (Optional) Inspect the DB with DBeaver

The DB isn't published to the host by default. To connect a desktop client, publish a port once:
```bash
# add to the prod mysql service, or run a temporary forwarder; e.g. recreate with a host port:
docker run -d --name db-forward --network finqora_bigcapital_network -p 3306:3306 \
  alpine/socat tcp-listen:3306,fork,reuseaddr tcp-connect:finqora-mysql:3306
```
Then in DBeaver (MariaDB driver): Host `localhost`, Port `3306`, User/Password from `.env`.

---

## Common commands

```bash
# Stop everything (keeps data)
docker compose -p finqora-new -f docker-compose.newapp.yml down
docker compose -p finqora      -f docker-compose.prod.yml   down

# Stop AND delete the shared DB data
docker compose -p finqora -f docker-compose.prod.yml down -v   # removes bigcapital_prod_* volumes

# Rebuild the new app after pulling new code
git pull
docker compose -p finqora-new -f docker-compose.newapp.yml --env-file .env up -d --build
```

## Notes / gotchas

- **Order matters:** the old stack must be up first (it owns the shared MySQL and the `finqora_bigcapital_network` the new app joins).
- **Project names matter:** always pass `-p finqora` (old) and `-p finqora-new` (new). The new app references the old network by the name `finqora_bigcapital_network`, which only exists when the old stack runs under `-p finqora`.
- **Ubuntu vs Windows:** the `docker compose` commands are identical. The only real differences are Docker install and the Windows line‑ending config in step 1.
- **Want to pull prebuilt images instead of building?** The new webapp is already on Docker Hub as `udco/finqora-webapp:latest`. The new *server* image push was blocked by a safety guard (it carries repo source); building from source as above avoids needing it.
