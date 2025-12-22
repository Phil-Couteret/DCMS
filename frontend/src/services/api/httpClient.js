// HTTP Client for real API calls
// Uses fetch API with error handling and timeout

import { API_CONFIG } from '../../config/apiConfig';

class HttpClient {
  constructor(baseURL, timeout = 30000) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const config = {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add authentication token if available
    const token = this.getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response body
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = `${errorMessage}: ${errorData.message}`;
            } else if (errorData.error) {
              errorMessage = `${errorMessage}: ${typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)}`;
            } else {
              errorMessage = `${errorMessage}: ${JSON.stringify(errorData)}`;
            }
          } else {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = `${errorMessage}: ${errorText}`;
            }
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
          console.warn('Could not parse error response:', e);
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  getAuthToken() {
    // Get auth token from localStorage or context
    // This will be implemented when authentication is added
    return localStorage.getItem('auth_token');
  }

  setAuthToken(token) {
    localStorage.setItem('auth_token', token);
  }

  clearAuthToken() {
    localStorage.removeItem('auth_token');
  }
}

// Create singleton instance
export const httpClient = new HttpClient(API_CONFIG.baseURL, API_CONFIG.timeout);

