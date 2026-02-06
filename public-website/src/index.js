import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialize i18n
import App from './App';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';
import syncService from './services/syncService'; // Initialize sync service for POC

// Make sync service available globally for bookingService
if (typeof window !== 'undefined') {
  window.syncService = syncService;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// Register service worker for PWA (production only to avoid dev errors)
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register({
    onSuccess: () => {},
    onUpdate: (registration) => {
      // Could show a toast to prompt user to refresh
    },
    onError: (error) => {
      console.error('[PWA] Service worker registration error:', error);
    }
  });
} else {
  // In development, ensure any existing SW is removed to prevent caching issues
  serviceWorkerRegistration.unregister();
}

