# Run DCMS automation locally on Mac

What to install and how to run the **start-standalone** automation on your Mac.

---

## 1. What to install

### Required (all modes)

| Tool | Version | Install on Mac |
|------|---------|----------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) (LTS) or `brew install node` |
| **npm** | 9+ | Comes with Node.js |
| **Git** | — | `xcode-select --install` or `brew install git` |

### Required only for Full Demo (backend + database)

| Tool | Version | Install on Mac |
|------|---------|----------------|
| **PostgreSQL** | 14+ | `brew install postgresql@14` then `brew services start postgresql@14` |

**Alternative:** [Postgres.app](https://postgresapp.com/) — download, drag to Applications, open and start.

### Optional but useful

- **Homebrew:** [brew.sh](https://brew.sh) — makes installing Node and PostgreSQL easier.

---

## 2. One-time setup

### 2.1 Clone and install deps (if not already done)

```bash
cd /path/to/DCMS   # or wherever you cloned it
npm install
```

### 2.2 Make scripts executable (Mac/Linux)

```bash
chmod +x start-standalone.sh setup-database.sh
```

---

## 3. Run the automation

From the project root:

```bash
./start-standalone.sh
```

You’ll be asked to choose a mode:

| Option | Mode | What runs | Needs PostgreSQL? |
|--------|------|-----------|-------------------|
| **1** | **Quick Demo** | Admin frontend only (mock, localStorage) | No |
| **2** | **Full POC** | Public site + Admin + Sync (mock) | No |
| **3** | **Full Demo** | Backend + DB + Admin frontend | Yes |

### Quick Demo (1) — fastest

- Only **Node.js** required.
- Admin app at **http://localhost:3000**.
- Data in browser localStorage; no backend.

### Full POC (2)

- **Node.js** only.
- Public site: **http://localhost:3000**
- Admin: **http://localhost:3001**
- Sync: **http://localhost:3002**
- Still mock; no database.

### Full Demo (3) — backend + database

- Needs **Node.js** and **PostgreSQL**.
- Script will:
  - Create `backend/.env` if missing.
  - Run `./setup-database.sh` (creates DB `dcms_test`, schema, optional seeds).
  - Run `prisma generate` in backend.
  - Start backend (API) and frontend (admin).
- **Admin:** http://localhost:3000  
- **API:** http://localhost:3003  
- **Swagger:** http://localhost:3003/api  

**PostgreSQL:** Default setup uses `postgres` / `postgres` and DB `dcms_test`. If you use a different user (e.g. your Mac user with no password), edit `backend/.env` and set:

```bash
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/dcms_test?schema=public"
```

Then run `./start-standalone.sh` again and choose **3**.

---

## 4. Ports

| Service | Port |
|---------|------|
| Admin frontend (Quick Demo, or Full Demo) | 3000 |
| Admin frontend (Full POC only) | 3001 |
| Sync server (Full POC only) | 3002 |
| Backend API (Full Demo only) | 3003 |

---

## 5. Stopping

Press **Ctrl+C** in the terminal where `start-standalone.sh` is running. It will stop all services it started.

---

## 6. Troubleshooting

**“PostgreSQL (psql) not found”**  
- Install PostgreSQL (see above) and ensure `psql` is on your `PATH`.  
- Homebrew: `export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"` (or `15`), then run the script again.

**“Database already exists” / setup-database errors**  
- `setup-database.sh` will offer to drop and recreate `dcms_test`.  
- Or fix `DATABASE_URL` in `backend/.env` and use your existing DB name.

**“Port already in use”**  
- Stop anything using 3000, 3001, 3002, or 3003.  
- Check: `lsof -i :3000` (or other port).

**Backend won’t start (Full Demo)**  
- Check `backend/.env` has a correct `DATABASE_URL`.  
- Run `cd backend && npm run prisma:generate` and retry.  
- Look at `backend.log` in the project root.

**Frontend can’t reach API**  
- Backend must run on **3003** (frontend expects `http://localhost:3003/api`).  
- In `backend/.env`, use `PORT=3003` (or leave unset; backend defaults to 3003).

---

## 7. Summary

1. Install **Node.js 18+** (and **PostgreSQL 14+** for Full Demo).
2. `chmod +x start-standalone.sh setup-database.sh`
3. `./start-standalone.sh` → choose **1**, **2**, or **3**.
4. Open the URLs shown (Admin usually http://localhost:3000).
5. **Ctrl+C** to stop.

That’s enough to try the automation locally on your Mac.
