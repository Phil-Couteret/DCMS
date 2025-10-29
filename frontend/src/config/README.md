# API Configuration

## Switching Between Mock and Real API

The DCMS frontend supports both mock (localStorage) and real API modes. Switch between them by editing `apiConfig.js`:

### Mock Mode (Current - Uses localStorage)

```javascript
// frontend/src/config/apiConfig.js
export const API_CONFIG = {
  mode: 'mock',  // ← Currently using localStorage
  baseURL: 'http://localhost:3001/api',
  timeout: 30000,
};
```

**Benefits:**
- ✅ Works offline
- ✅ No backend required
- ✅ Fast development
- ✅ Perfect for demos

### Real API Mode (When Backend is Ready)

```javascript
// frontend/src/config/apiConfig.js
export const API_CONFIG = {
  mode: 'api',  // ← Switch to real API
  baseURL: 'http://localhost:3001/api',  // Your backend URL
  timeout: 30000,
};
```

**Benefits:**
- ✅ Real database persistence(localStorage)
- ✅ Multi-user support
- ✅ Server-side validation
- ✅ Production ready

## How It Works

1. **apiService.js** - Main service layer that chooses adapter based on config
2. **mockApiAdapter.js** - Uses localStorage (current dataService functions)
3. **realApiAdapter.js** - Makes HTTP calls to backend
4. **httpClient.js** - Handles HTTP requests, auth, error handling

## Environment Variables

Create `.env` file in frontend directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

This will override the default baseURL in apiConfig.js.

## No Component Changes Needed!

All existing components continue to work without changes. They use `dataService` which now delegates to `apiService`.

