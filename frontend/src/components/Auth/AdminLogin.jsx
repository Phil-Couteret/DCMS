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

      const { access_token, user } = data;
      if (!access_token || !user) {
        throw new Error('Invalid login response');
      }

      const transformedUser = realApiAdapter.transformResponse('users', user);
      httpClient.setAuthToken(access_token);
      login(transformedUser);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Login failed');
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
        </form>
      </Paper>
    </Box>
  );
};

export default AdminLogin;
