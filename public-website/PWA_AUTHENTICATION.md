# PWA Installation - Authentication Requirements

## Overview

The PWA install prompt is **restricted to registered divers only**. Only users who have access to `/my-account` (authenticated customers) can install the app.

## Authentication Flow

### How Users Become "Registered Divers"

A user is considered a registered diver when they have `dcms_user_email` stored in localStorage. This happens in three scenarios:

1. **After Creating a Booking**
   - When a user completes a booking via `/book-dive`
   - The booking service automatically saves their email: `localStorage.setItem('dcms_user_email', bookingData.email)`

2. **After Logging In**
   - When a user logs in via `/login` (Login tab)
   - The email is saved: `localStorage.setItem('dcms_user_email', formData.email)`

3. **After Registering**
   - When a new user registers via `/login` (Register tab)
   - The email is saved: `localStorage.setItem('dcms_user_email', formData.email)`

## PWA Install Prompt Behavior

### When the Prompt Appears

The install prompt will **only** show when **ALL** of these conditions are met:

1. ✅ User is on `/my-account` page
2. ✅ User has `dcms_user_email` in localStorage (authenticated/registered)
3. ✅ User hasn't dismissed the prompt before (stored in `pwa-install-dismissed`)
4. ✅ App is not already installed (not in standalone mode)
5. ✅ Browser supports PWA installation

### When the Prompt Does NOT Appear

- ❌ User is not logged in / not registered
- ❌ User is on any page other than `/my-account`
- ❌ User previously dismissed the prompt
- ❌ App is already installed
- ❌ User is on `/book-dive` (only `/my-account` triggers it)

## Implementation Details

### Component: `PWAInstallPrompt.jsx`

- Uses `useLocation()` to track current route
- Checks `localStorage.getItem('dcms_user_email')` for authentication
- Listens for `dcms_customer_updated` events to detect login/registration
- Only shows on `/my-account` route
- Respects user dismissal preference

### Authentication Check

```javascript
const userEmail = localStorage.getItem('dcms_user_email');
const isAuthenticated = !!userEmail && userEmail.trim() !== '';
```

### Event Listeners

The component listens for:
- `beforeinstallprompt` - Browser PWA install event
- `storage` - Cross-tab localStorage changes
- `dcms_customer_updated` - Custom event when user logs in/registers/books

## User Experience Flow

1. **New Visitor** → Visits website → No PWA prompt
2. **Creates Booking** → Email saved → Redirected to `/my-account` → PWA prompt appears after 3 seconds
3. **Logs In** → Email saved → On `/my-account` → PWA prompt appears after 3 seconds
4. **Registers** → Email saved → On `/my-account` → PWA prompt appears after 3 seconds
5. **Dismisses Prompt** → Preference saved → Won't show again (unless localStorage cleared)

## Testing

### To Test Authentication Requirement

1. **Clear localStorage**: `localStorage.clear()`
2. **Visit `/my-account`**: Should NOT see PWA prompt
3. **Create a booking** or **log in**: Email is saved
4. **Visit `/my-account`**: Should see PWA prompt after 3 seconds

### To Test Dismissal

1. **See prompt** → Click "Maybe Later"
2. **Refresh page**: Prompt should NOT appear again
3. **Clear dismissal**: `localStorage.removeItem('pwa-install-dismissed')`
4. **Refresh**: Prompt should appear again

## Security Notes

- Authentication is currently client-side only (localStorage)
- In production, this should be backed by server-side authentication
- The PWA prompt restriction is a UX feature, not a security measure
- Anyone can manually add `dcms_user_email` to localStorage to see the prompt

## Future Enhancements

- Add server-side authentication check
- Add token-based authentication
- Add session expiration
- Add logout functionality that clears localStorage

