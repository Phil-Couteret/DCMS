// API Configuration
// Switch between mock (localStorage) and real API

export const API_CONFIG = {
  // Set to 'mock' for localStorage, 'api' for real backend
  mode: 'mock',
  
  // Backend API base URL (used when mode === 'api')
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // Request timeout (milliseconds)
  timeout: 30000,
  
  // Enable API response caching (future enhancement)
  enableCache: false,
};

// Helper to check if using mock mode
export const isMockMode = () => API_CONFIG.mode === 'mock';

// Helper to check if using real API
export const isApiMode = () => API_CONFIG.mode === 'api';

