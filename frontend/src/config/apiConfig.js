// API Configuration
// Switch between mock (localStorage) and real API

// Determine API base URL dynamically based on current hostname
// This allows the frontend to work when accessed from different machines on the network
// Multi-tenant: admin.deepblue.couteret.fr -> api.deepblue.couteret.fr (or api.couteret.fr)
const getApiBaseURL = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  // Use same protocol as current page (avoids ERR_CERT_AUTHORITY_INVALID when HTTPS cert invalid)
  if (process.env.REACT_APP_API_URL && typeof window !== 'undefined') {
    try {
      const url = new URL(process.env.REACT_APP_API_URL);
      url.protocol = protocol;
      return url.toString();
    } catch (_) {}
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // Multi-tenant: admin.couteret.fr->api, deepblue.admin.couteret.fr->deepblue.api
  const apiHost = hostname
    .replace(/^(admin|dcms)\./, 'api.')
    .replace(/\.(admin|dcms)\./, '.api.');
  const port = hostname.includes('couteret.fr') ? '' : ':3003';
  return `${protocol}//${apiHost}${port}/api`;
};

export const API_CONFIG = {
  // Set to 'mock' for localStorage, 'api' for real backend
  mode: 'api',
  get baseURL() { return getApiBaseURL(); },
  
  // Request timeout (milliseconds)
  timeout: 30000,
  
  // Enable API response caching (future enhancement)
  enableCache: false,
};

// Helper to check if using mock mode
export const isMockMode = () => API_CONFIG.mode === 'mock';

// Helper to check if using real API
export const isApiMode = () => API_CONFIG.mode === 'api';

