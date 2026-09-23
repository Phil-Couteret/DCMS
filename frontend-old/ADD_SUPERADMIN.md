# Adding Superadmin Account

If the Super Administrator account is not showing up, you can add it manually:

## Option 1: Refresh the page
The initialization code will automatically add the superadmin if it's missing. Just refresh the admin portal page.

## Option 2: Run in browser console
Open the admin portal (http://localhost:3001), open the browser console (F12), and paste this:

```javascript
// Add superadmin user
const users = JSON.parse(localStorage.getItem('dcms_users') || '[]');
const superadminExists = users.some(u => u.role === 'superadmin' || u.username === 'superadmin');

if (!superadminExists) {
  const superadmin = {
    id: '550e8400-e29b-41d4-a716-446655440099',
    username: 'superadmin',
    name: 'Super Administrator',
    email: 'superadmin@deep-blue-diving.com',
    password: 'superadmin123',
    role: 'superadmin',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z'
  };
  users.unshift(superadmin);
  localStorage.setItem('dcms_users', JSON.stringify(users));
  console.log('✅ Superadmin added! Refresh the page to see it.');
  window.location.reload();
} else {
  console.log('Superadmin already exists');
}
```

## Option 3: Clear localStorage and refresh
If you want to start fresh:

```javascript
localStorage.removeItem('dcms_users');
window.location.reload();
```

## Default Credentials
- **Username**: `superadmin`
- **Password**: `superadmin123` (change after first login)
- **Role**: `superadmin` (full access to all features)

