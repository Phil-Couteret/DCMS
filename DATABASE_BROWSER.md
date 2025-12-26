# How to Browse the Database in a Browser

## Prisma Studio

Prisma Studio is a visual database browser that lets you view and edit data directly in your browser.

### Start Prisma Studio

```bash
cd backend
npm run prisma:studio
```

This will start Prisma Studio on **http://localhost:5555**

### Using Prisma Studio

1. **Open your browser** and go to `http://localhost:5555`
2. **Browse tables** - You'll see all your database tables on the left sidebar:
   - Locations
   - Customers
   - Bookings
   - Boats
   - Dive Sites
   - Staff
   - Equipment
   - Boat Preps (after migration)
   - Settings (after migration)
   - Government Bonos
   - etc.

3. **View data** - Click on any table to see its data
4. **Edit data** - Click on any record to edit it directly
5. **Add records** - Click the "+ Add record" button to create new entries
6. **Filter/Search** - Use the search bar to filter records

### Features

- ✅ View all tables and their data
- ✅ Edit existing records
- ✅ Add new records
- ✅ Delete records
- ✅ Filter and search
- ✅ See relationships between tables
- ✅ Real-time updates

### Stop Prisma Studio

Press `Ctrl+C` in the terminal where it's running.

## Alternative: API Documentation (Swagger)

You can also browse the API endpoints (which show data from the database) using Swagger:

1. Start the backend server:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Open in browser: **http://localhost:3003/api**

3. This shows all available API endpoints and lets you test them directly

### Swagger Features

- ✅ See all API endpoints
- ✅ Test endpoints directly
- ✅ See request/response schemas
- ✅ Execute GET/POST/PUT/DELETE requests
- ✅ See example data

## Quick Reference

| Tool | URL | Purpose |
|------|-----|---------|
| Prisma Studio | http://localhost:5555 | Direct database browser |
| Swagger API Docs | http://localhost:3003/api | API endpoint browser |

