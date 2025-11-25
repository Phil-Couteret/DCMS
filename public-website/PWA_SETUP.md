# PWA Setup for Deep Blue Diving - Diver Portal

## Overview

The public website (diver portal) is now configured as a **Progressive Web App (PWA)** that can be installed on mobile devices directly from the website. This allows divers to:

- Install the app on their phone's home screen
- Access the app offline (cached pages)
- Receive push notifications (future feature)
- Enjoy a native app-like experience

## Key Features

### ✅ Installation
- **Android/Chrome**: Automatic install prompt appears on `/my-account` and `/book-dive` pages
- **iOS/Safari**: Manual installation instructions shown (Share → Add to Home Screen)
- Installation is **only available from the divers portal** (not the admin PWA)

### ✅ Offline Support
- Service worker caches static assets and pages
- Users can view cached content when offline
- Dynamic content (bookings) syncs when connection is restored

### ✅ App-like Experience
- Standalone display mode (no browser UI)
- Custom app icon on home screen
- Splash screen on launch
- Quick access shortcuts (Book Dive, My Account)

## Files Created/Modified

### New Files
1. **`public/service-worker.js`** - Handles caching, offline support, and push notifications
2. **`src/utils/serviceWorkerRegistration.js`** - Registers and manages service worker lifecycle
3. **`src/components/PWAInstallPrompt.jsx`** - Shows install prompt to users
4. **`PWA_ICONS_GUIDE.md`** - Instructions for creating PWA icons
5. **`PWA_SETUP.md`** - This documentation

### Modified Files
1. **`public/manifest.json`** - Enhanced with full PWA configuration
2. **`public/index.html`** - Added PWA meta tags for iOS and Android
3. **`src/index.js`** - Added service worker registration
4. **`src/App.jsx`** - Added PWAInstallPrompt component

## Installation Behavior

### When Users See the Prompt
- Only appears on `/my-account` and `/book-dive` pages
- Shows after 3 seconds (if not previously dismissed)
- User preference is saved in localStorage
- Won't show if app is already installed

### Installation Restrictions
- **Only available from the public website** (divers portal)
- Not available from the admin PWA frontend
- Requires HTTPS in production (localhost works for development)

## Requirements

### For Development
- Local server (React dev server works)
- Modern browser with PWA support (Chrome, Edge, Safari)

### For Production
- **HTTPS is mandatory** (PWAs require secure context)
- Valid SSL certificate
- Service worker must be served from root or same origin

## Testing

### Local Testing
1. Start the dev server: `npm start`
2. Open Chrome DevTools → Application tab
3. Check "Service Workers" section (should show registered)
4. Check "Manifest" section (should show all icons and config)
5. Test install prompt by visiting `/my-account` or `/book-dive`

### Mobile Testing
1. Deploy to HTTPS server
2. Open on mobile device
3. Navigate to `/my-account` or `/book-dive`
4. Wait for install prompt (Android) or follow iOS instructions
5. Verify app appears on home screen
6. Test offline functionality

## Next Steps

### Required
1. **Add PWA Icons**: Follow `PWA_ICONS_GUIDE.md` to create and add all required icon sizes
2. **Test on Real Devices**: Verify installation works on Android and iOS
3. **Deploy with HTTPS**: Ensure production server has valid SSL certificate

### Optional Enhancements
1. **Push Notifications**: Implement backend API for booking confirmations/reminders
2. **Background Sync**: Sync offline bookings when connection is restored
3. **Update Notifications**: Notify users when new app version is available
4. **Analytics**: Track PWA installations and usage

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `service-worker.js` is accessible at root
- Ensure HTTPS (or localhost) is being used

### Install Prompt Not Showing
- Verify you're on `/my-account` or `/book-dive` page
- Check if already installed (standalone mode)
- Clear localStorage: `localStorage.removeItem('pwa-install-dismissed')`
- Check browser support (Chrome/Edge on Android, Safari on iOS)

### Icons Not Loading
- Verify all icon files exist in `/public/pwa-icons/`
- Check `manifest.json` paths are correct
- Clear browser cache and service worker cache

## Security Considerations

- Service worker only caches same-origin requests
- API calls are not cached (privacy/security)
- HTTPS required in production
- No sensitive data stored in service worker cache

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS 11.3+)
- ✅ Firefox (Android)
- ⚠️ Safari (Desktop) - Limited PWA support
- ❌ Internet Explorer - Not supported

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA Checklist](https://web.dev/pwa-checklist/)
- [PWA Builder](https://www.pwabuilder.com/)

