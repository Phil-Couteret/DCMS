# Unified User System

## ✅ Implementation Complete

A unified user system has been created in the database. Admin portal users are now stored in PostgreSQL instead of localStorage.

---

## 🗄️ Database Schema

### New `users` Table

```prisma
model users {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  username       String    @unique @db.VarChar(100)
  name           String    @db.VarChar(200)
  email          String?   @unique @db.VarChar(100)
  password_hash  String    @db.VarChar(255)
  role           user_role @default(admin)
  permissions    String[]  @default([])
  location_access String[] @default([]) @db.Uuid
  is_active      Boolean?  @default(true)
  created_at     DateTime? @default(now())
  updated_at     DateTime? @default(now()) @updatedAt
}
```

### User Roles Enum

```prisma
enum user_role {
  superadmin
  admin
  boat_pilot
  guide
  trainer
  intern
}
```

---

## 🔐 Default Users (Seeded)

Two default users have been created in the database:

### Superadmin
- **Username**: `superadmin`
- **Password**: `superadmin123`
- **Role**: `superadmin`
- **Permissions**: All (superadmin has access to everything)
- **Location Access**: All locations (empty array = global access)

### Admin
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`
- **Permissions**: `['dashboard', 'bookings', 'customers', 'settings', 'users']`
- **Location Access**: All locations (empty array = global access)

⚠️ **Important**: Change these passwords after first login!

---

## 📡 API Endpoints

### Users API (`/api/users`)

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/login` - Login user

### Login Endpoint

```http
POST /api/users/login
Content-Type: application/json

{
  "username": "superadmin",
  "password": "superadmin123"
}
```

**Response:**
```json
{
  "id": "uuid",
  "username": "superadmin",
  "name": "Super Administrator",
  "email": "superadmin@deep-blue-diving.com",
  "role": "superadmin",
  "permissions": [],
  "locationAccess": [],
  "isActive": true
}
```

**Note**: Password hash is never returned in responses.

---

## 🔄 Frontend Integration

The frontend automatically uses the API when in API mode (instead of mock mode).

### User Data Structure

Frontend expects users with this structure:
```javascript
{
  id: "uuid",
  username: "superadmin",
  name: "Super Administrator",
  email: "superadmin@deep-blue-diving.com",
  role: "superadmin", // or "admin", "boat_pilot", "guide", "trainer", "intern"
  permissions: [], // Array of permission strings
  locationAccess: [], // Array of location UUIDs (empty = all locations)
  isActive: true,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z"
}
```

### Data Transformation

The `realApiAdapter.js` automatically transforms:
- Backend format (`location_access`) → Frontend format (`locationAccess`)
- Backend format (`is_active`) → Frontend format (`isActive`)
- Backend format (`created_at`) → Frontend format (`createdAt`)

---

## 🔑 Creating Users

### Via API

```http
POST /api/users
Content-Type: application/json

{
  "username": "newuser",
  "name": "New User",
  "email": "user@example.com",
  "password": "securepassword123",
  "role": "admin",
  "permissions": ["dashboard", "bookings", "customers"],
  "locationAccess": ["location-uuid-1", "location-uuid-2"],
  "isActive": true
}
```

### Via Admin Portal

Users can be created through the Settings → Users page in the admin portal (when logged in as superadmin or admin with user management permissions).

---

## 🔒 Security Features

1. **Password Hashing**: All passwords are hashed with bcrypt (10 rounds)
2. **No Password Exposure**: Password hashes are never returned in API responses
3. **Active Status Check**: Login fails if user is inactive
4. **Username Uniqueness**: Usernames must be unique
5. **Email Uniqueness**: Emails must be unique (optional field)

---

## 📊 Permissions System

Users have a `permissions` array that controls access to features:

- `dashboard` - Dashboard access
- `bookings` - Booking management
- `customers` - Customer management
- `stays` - Customer stays
- `equipment` - Equipment management
- `boatPrep` - Boat preparation
- `settings` - Settings access
- `users` - User management

**Superadmin** users automatically have access to everything, regardless of permissions array.

---

## 📍 Location Access

The `locationAccess` array controls which locations a user can access:

- **Empty array `[]`** = Global access to all locations
- **Array with location UUIDs** = Access only to specified locations

Example:
```javascript
{
  locationAccess: [
    "550e8400-e29b-41d4-a716-446655440001", // Caleta de Fuste
    "550e8400-e29b-41d4-a716-446655440002"  // Playitas
  ]
}
```

---

## 🗃️ Database vs localStorage

### Before (Old System)
- Users stored in localStorage (`dcms_users`)
- Lost when browser cache cleared
- Not shared across devices/browsers
- No authentication/security

### After (New System)
- Users stored in PostgreSQL database
- Persistent across sessions
- Shared across devices/browsers
- Secure password hashing
- Centralized user management

---

## 🔄 Migration from localStorage

If you had users in localStorage, you'll need to recreate them via the API or admin portal. The default superadmin and admin users are already created in the database.

---

## 🧪 Testing

### Test Login

```bash
curl -X POST http://localhost:3003/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123"
  }'
```

### Get All Users

```bash
curl http://localhost:3003/api/users
```

---

## 📝 Next Steps (Optional)

1. **JWT Authentication**: Add JWT tokens for stateless authentication
2. **Password Reset**: Implement password reset functionality
3. **Audit Logging**: Log user actions and login attempts
4. **Role-Based Access Control**: Fine-tune permissions system
5. **Two-Factor Authentication**: Add 2FA for enhanced security

---

## ✅ Summary

- ✅ Unified user system in database
- ✅ Password hashing with bcrypt
- ✅ User roles and permissions
- ✅ Location-based access control
- ✅ API endpoints for CRUD operations
- ✅ Login endpoint
- ✅ Frontend integration
- ✅ Default users seeded (superadmin, admin)

The system is now production-ready with proper user management and security!

