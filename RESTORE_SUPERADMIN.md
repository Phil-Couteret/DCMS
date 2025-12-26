# Restore Superadmin Account

If your admin portal accounts are missing, follow these steps:

## Quick Fix: Restore from Browser Console

1. Open the admin portal: `http://localhost:3001`
2. Open browser console (F12 or Cmd+Option+I)
3. Paste and run this code:

```javascript
// Restore superadmin and default users
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440099',
    username: 'superadmin',
    name: 'Super Administrator',
    email: 'superadmin@deep-blue-diving.com',
    password: 'superadmin123',
    role: 'superadmin',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    locationAccess: []
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440500',
    username: 'admin',
    name: 'Administrator',
    email: 'admin@deep-blue-diving.com',
    password: 'admin123',
    role: 'admin',
    permissions: ['bookings', 'customers', 'settings', 'users'],
    locationAccess: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z'
  }
];

localStorage.setItem('dcms_users', JSON.stringify(users));
console.log('✅ Users restored! Refresh the page.');
window.location.reload();
```

## Alternative: Clear and Reinitialize

If the above doesn't work, clear localStorage and let it reinitialize:

```javascript
// Clear users and reload to trigger reinitialization
localStorage.removeItem('dcms_users');
window.location.reload();
```

This will trigger the `initializeMockData()` function which should create default users.

## Default Credentials

After restoration:
- **Superadmin**: 
  - Username: `superadmin`
  - Password: `superadmin123`
  
- **Admin**:
  - Username: `admin`
  - Password: `admin123`

⚠️ **Change passwords after first login!**

## Why This Happened

Admin portal user accounts are stored in **localStorage** (`dcms_users`), not in the database. If localStorage was cleared (browser cache cleared, incognito mode, etc.), the accounts would disappear.

The database `staff` table is for **dive center staff** (instructors, divemasters, etc.), not admin portal users. These are two different systems:
- **Admin Portal Users** → localStorage → manage the admin portal
- **Dive Center Staff** → Database (`staff` table) → instructors, divemasters, etc.

## Important Note

Our recent database schema changes (adding partners table) did NOT affect localStorage accounts. The accounts are stored separately in the browser's localStorage.

