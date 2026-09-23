// Admin Login - username/password form for API mode
// Calls POST /api/users/login and stores JWT for authenticated API requests

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../utils/authContext';
import { httpClient } from '../../services/api/httpClient';
import { API_CONFIG } from '../../config/apiConfig';
import realApiAdapter from '../../services/api/realApiAdapter';

const AdminLogin = ({ onSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Populated when the account has 2+ tenants and login() can't pick one on
  // its own - shows a "which center?" popup instead of failing the login.
  const [tenantChoices, setTenantChoices] = useState(null);

  const completeLogin = (access_token, user) => {
    const transformedUser = realApiAdapter.transformResponse('users', user);
    httpClient.setAuthToken(access_token);
    login(transformedUser);
    onSuccess?.();
  };

  const describeFetchError = (err, path) => {
    const base = typeof API_CONFIG.baseURL === 'function' ? API_CONFIG.baseURL() : API_CONFIG.baseURL;
    const url = `${base}${path}`;
    if (err?.message === 'Failed to fetch' || err?.name === 'TypeError') {
      return `Cannot reach the API at ${url}. Check that the backend is running and that ${window.location.hostname} can access it (DNS, VPN, CORS).`;
    }
    return err.message || 'Login failed';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const base = typeof API_CONFIG.baseURL === 'function' ? API_CONFIG.baseURL() : API_CONFIG.baseURL;
      const response = await fetch(`${base}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Login failed (${response.status})`);
      }

      if (data.requiresTenantSelection) {
        // Multiple centers - show the picker instead of completing login.
        setTenantChoices(data.tenants || []);
        return;
      }

      const { access_token, user } = data;
      if (!access_token || !user) {
        throw new Error('Invalid login response');
      }
      completeLogin(access_token, user);
    } catch (err) {
      setError(describeFetchError(err, '/users/login'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = async (tenantId) => {
    setError('');
    setLoading(true);
    try {
      const base = typeof API_CONFIG.baseURL === 'function' ? API_CONFIG.baseURL() : API_CONFIG.baseURL;
      const response = await fetch(`${base}/users/login/select-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, tenantId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `Login failed (${response.status})`);
      }

      const { access_token, user } = data;
      if (!access_token || !user) {
        throw new Error('Invalid login response');
      }
      setTenantChoices(null);
      completeLogin(access_token, user);
    } catch (err) {
      setError(describeFetchError(err, '/users/login/select-tenant'));
      setTenantChoices(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 2 }}>
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" gutterBottom align="center">
          DCMS Admin Login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
          Enter your username and password
        </Typography>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            margin="normal"
            required
            autoComplete="username"
            autoFocus
          />
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !username.trim() || !password}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
          {(() => {
            const base = typeof API_CONFIG.baseURL === 'function' ? API_CONFIG.baseURL() : API_CONFIG.baseURL;
            const isDev = typeof base === 'string' && (base.includes('localhost') || base.includes('127.0.0.1'));
            if (!isDev) return null;
            return (
              <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary" align="center">
                Default: superadmin / superadmin123 or admin / admin123. Can&apos;t connect? In backend run: npm run reset-password
              </Typography>
            );
          })()}
        </form>
      </Paper>

      <Dialog open={!!tenantChoices} onClose={() => !loading && setTenantChoices(null)} fullWidth maxWidth="xs">
        <DialogTitle>Which center?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your account has access to more than one diving center. Choose which one to log into.
          </Typography>
          <List>
            {(tenantChoices || []).map((t) => (
              <ListItemButton key={t.tenantId} onClick={() => handleSelectTenant(t.tenantId)} disabled={loading}>
                <ListItemText primary={t.name || t.slug || t.tenantId} secondary={t.role} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdminLogin;
