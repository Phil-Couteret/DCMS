import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import syncService from './services/syncService'; // Initialize sync service for POC

// Make sync service available globally
if (typeof window !== 'undefined') {
  window.syncService = syncService;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service worker registration is now handled by vite-plugin-pwa
// (registerType: 'autoUpdate' in vite.config.js), which auto-injects the
// registration script into the built index.html - replaces the old
// src/serviceWorkerRegistration.js + explicit .register() call here.
