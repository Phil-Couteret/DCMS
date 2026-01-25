# Test VPS-style installation locally with Docker

Run the **same stack** you’d use on a VPS (Postgres + backend + frontend) **on your Mac** via Docker, to verify the installation before deploying.

---

## 1. What you need on your Mac

| Tool | Purpose |
|------|--------|
| **Docker Desktop** | Engine + Compose. [Install](https://docs.docker.com/desktop/install/mac-install/). |
| **Docker Compose** | Usually included with Docker Desktop (v2). |

Check:

```bash
docker --version
docker compose version
```

---

## 2. What the stack runs

- **Postgres 15** – DB `dcms`, user `dcms` / password `dcms`. Schema + migrations + sample data applied on first run.
- **Backend** – NestJS API on port **3003**. Waits for Postgres, runs seed (users + settings), then starts.
- **Frontend** – Built React admin app served by nginx on port **3000**.

**URLs:**

| Service | URL |
|--------|-----|
| **Admin UI** | http://localhost:3000 |
| **API** | http://localhost:3003 |
| **Swagger** | http://localhost:3003/api |

**Default login (after seed):** `superadmin` / `superadmin123` or `admin` / `admin123`.

---

## 3. Run it

From the **project root** (where `docker-compose.yml` is):

```bash
# Build and start (detached)
docker compose up -d

# Follow logs
docker compose logs -f
```

Wait until the backend is up (you’ll see “DCMS Backend API is running”). Then open http://localhost:3000.

**Stop:**

```bash
docker compose down
```

**Reset (remove DB volume):**

```bash
docker compose down -v
docker compose up -d
```

---

## 4. Initial DB setup

On first `up`, Postgres runs `docker/postgres-init/init-dcms.sh`, which:

1. Applies `database/schema/001_create_tables.sql`
2. Applies `database/migrations/002` … `009`
3. Loads `database/seeds/002_sample_data.sql`

Then the backend entrypoint runs `seed-users` and `seed-settings` (idempotent).

If you add or change migrations, **reset the volume** (`down -v` then `up -d`) so init runs again. Otherwise Postgres reuses existing data.

---

## 5. Import host DB into Docker

To use your **existing host database** (e.g. from `./start-poc.sh`) inside the Docker stack:

**1. Dump the host DB** (optional: stop backend first so data is consistent):

```bash
pg_dump -U postgres -h localhost -d dcms -F p --no-owner --no-acl -f dcms_export.sql
```

Use your actual DB name if different (`dcms_test`, etc.). `--no-owner` and `--no-acl` avoid permission issues when restoring into Docker.

**2. Run the import script:**

```bash
./scripts/import-host-db-to-docker.sh dcms_export.sql
```

This will:

- Stop the stack and remove the Docker DB volume
- Start Postgres **without** init (no schema/migrations/sample data)
- Restore your dump into the Docker `dcms` database
- Start backend and frontend

**3. Open** http://localhost:3000 and log in with your **existing** users (same as on the host).

**Manual steps** (if you prefer not to use the script):

```bash
docker compose down -v
docker compose -f docker-compose.yml -f docker-compose.import.yml up -d db
# wait until ready, then:
docker compose exec -T db psql -U dcms -d dcms < dcms_export.sql
docker compose -f docker-compose.yml -f docker-compose.import.yml up -d
```

The **import override** (`docker-compose.import.yml`) skips the init script so the DB is empty before restore. Use it whenever you import a host dump.

---

## 6. Troubleshooting

**Init script not executable**

```bash
chmod +x docker/postgres-init/init-dcms.sh
```

**Backend won’t start / “Cannot connect to db”**

- Wait 30–60 s for Postgres to finish init.
- Check: `docker compose logs db` and `docker compose logs backend`.

**“Port already in use”**

- Stop `./start-poc.sh` (or anything on 3000 / 3003).
- Change ports in `docker-compose.yml` if needed (e.g. `"3004:3003"` for backend).

**Frontend can’t reach API**

- Frontend is built with `REACT_APP_API_URL=http://localhost:3003/api`. You must use the app at **http://localhost:3000** (same host). If you use another host/port, rebuild the frontend image with the correct `REACT_APP_API_URL`.

**Re-build after code changes**

```bash
docker compose up -d --build
```

---

## 7. Files involved

| File | Role |
|------|------|
| `docker-compose.yml` | Defines `db`, `backend`, `frontend` and volumes. |
| `backend/Dockerfile` | Builds NestJS app, runs seeds, then `node dist/main.js`. |
| `backend/docker-entrypoint.sh` | Waits for Postgres, runs seed, then starts the app. |
| `frontend/Dockerfile` | Builds React app, nginx serves it. |
| `frontend/docker/nginx.conf` | Nginx config for SPA. |
| `docker/postgres-init/init-dcms.sh` | Postgres init: schema, migrations, sample data. |
| `database/migrations/006b_add_settings.sql` | Creates `settings` table. |
| `database/migrations/009_add_users_table.sql` | Creates `users` table and `user_role` enum. |
| `docker-compose.import.yml` | Override: DB without init, for host-DB import. |
| `scripts/import-host-db-to-docker.sh` | Imports a host `pg_dump` into Docker Postgres. |

---

## 8. Summary

1. Install **Docker Desktop** on your Mac.
2. From project root: `docker compose up -d`.
3. Open **http://localhost:3000**, log in with `superadmin` / `superadmin123`.
4. Use `docker compose down` (and `-v` to reset DB) when done.

This matches a minimal **VPS-style** deployment (Postgres + backend + frontend) so you can test the installation locally before going to a real VPS.
