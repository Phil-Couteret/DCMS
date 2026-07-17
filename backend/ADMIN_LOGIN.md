# DCMS Admin Login (API mode)

When the frontend uses the **real API** (not mock/localStorage), admin login uses the backend database. Use the credentials below or reset the password if you can't connect.

## Default credentials (after seed)

| Username   | Password       | Scope        |
|-----------|----------------|--------------|
| superadmin | superadmin123 | All tenants (switch tenant in app) |
| admin      | admin123      | Default tenant only |

## Newly created tenants

When you create a **new tenant** (e.g. in Tenant Management), a default admin user is created for that tenant:

| Username     | Password | Scope        |
|-------------|----------|--------------|
| admin-{slug} | admin123 | That tenant only |

Example: tenant with slug `acme-diving` → log in as **admin-acme-diving** / **admin123**. The frontend must use that tenant as context (e.g. select the tenant as superadmin first, or use the tenant’s subdomain so the API receives `X-Tenant-Slug: acme-diving`).

**Tenant created before this behaviour existed?** From `backend` run:

```bash
TENANT_SLUG=your-tenant-slug npm run create-tenant-admin
```

Then use **admin-your-tenant-slug** / **admin123** with that tenant selected.

Usernames are **case-sensitive** (e.g. `admin`, not `Admin`).

## If you can't connect

1. **Ensure users exist**  
   From the `backend` folder:
   ```bash
   npm run seed:users
   ```
   This creates `superadmin` and `admin` with the default passwords above.

2. **Reset password(s)**  
   From the `backend` folder:
   ```bash
   npm run reset-password
   ```
   This sets both accounts back to the default passwords.

   To set a single user and/or custom password:
   ```bash
   RESET_ADMIN_USER=superadmin RESET_ADMIN_PASSWORD=yournewpass npm run reset-password
   RESET_ADMIN_USER=admin RESET_ADMIN_PASSWORD=yournewpass npm run reset-password
   ```

3. **Check backend and DB**  
   - Backend must be running (e.g. `npm run start:dev` in `backend`).  
   - Frontend `REACT_APP_API_URL` (or default) must point to that API (e.g. `http://localhost:3003/api`).  
   - Database must be migrated and reachable (Prisma).

If you use **mock mode** (localStorage), see the frontend doc: `frontend/ADD_SUPERADMIN.md`.
