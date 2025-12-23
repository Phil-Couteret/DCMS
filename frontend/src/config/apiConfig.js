// API Configuration
// Switch between mock (localStorage) and real API

// Determine API base URL dynamically based on current hostname
// This allows the frontend to work when accessed from different machines on the network
const getApiBaseURL = () => {
  // If REACT_APP_API_URL is explicitly set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Otherwise, use the current hostname (works for localhost and network IPs)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const port = '3003';
  return `http://${hostname}:${port}/api`;
};

export const API_CONFIG = {
  // Set to 'mock' for localStorage, 'api' for real backend
  mode: 'api', // Changed to 'api' to use database
  
  // Backend API base URL (used when mode === 'api')
  // Dynamically determined based on current hostname for network access
  baseURL: getApiBaseURL(),
  
  // Request timeout (milliseconds)
  timeout: 30000,
  
  // Enable API response caching (future enhancement)
  enableCache: false,
};

// Helper to check if using mock mode
export const isMockMode = () => API_CONFIG.mode === 'mock';

// Helper to check if using real API
export const isApiMode = () => API_CONFIG.mode === 'api';

