import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '../../services/dataService';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business as BusinessIcon,
  VpnKey as KeyIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { usePartnerAuth } from '../../utils/partnerAuthContext';

const PartnerLogin = () => {
  const navigate = useNavigate();
  const { login } = usePartnerAuth();
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'apiKey'
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const all = await dataService.getAll('settings') || [];
        const s = Array.isArray(all) && all.length > 0 ? all[0] : null;
        setOrgName(s?.organisation?.name || '');
      } catch (e) {
        console.warn('[PartnerLogin] Error loading settings:', e);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(
      loginMethod === 'email' ? email : apiKey,
      apiSecret,
      loginMethod
    );

    if (result.success) {
      navigate('/partner/dashboard');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper sx={{ p: 4, width: '100%' }} elevation={3}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BusinessIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Partner Portal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orgName || 'Dive Center'} - Partner Access
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={loginMethod}
                exclusive
                onChange={(e, newMethod) => {
                  if (newMethod) setLoginMethod(newMethod);
                }}
                fullWidth
                size="small"
              >
                <ToggleButton value="email">
                  <EmailIcon sx={{ mr: 1 }} />
                  Email
                </ToggleButton>
                <ToggleButton value="apiKey">
                  <KeyIcon sx={{ mr: 1 }} />
                  API Key
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {loginMethod === 'email' ? (
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Use the email address associated with your partner account"
              />
            ) : (
              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                margin="normal"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon />
                    </InputAdornment>
                  ),
                }}
                helperText="Your partner API key"
              />
            )}

            <TextField
              fullWidth
              label={loginMethod === 'email' ? 'Password (API Secret)' : 'API Secret'}
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowSecret(!showSecret)}
                      edge="end"
                    >
                      {showSecret ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText={loginMethod === 'email' 
                ? 'Enter your API Secret (this acts as your password)'
                : 'Your partner API secret'}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Use your API credentials provided by {orgName || 'Dive Center'}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default PartnerLogin;
