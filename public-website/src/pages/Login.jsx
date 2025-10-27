import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tabValue === 0) {
      // Login logic
      console.log('Login:', formData);
      navigate('/my-account');
    } else {
      // Registration logic
      console.log('Register:', formData);
      navigate('/my-account');
    }
  };

  return (
    <Container sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>

          <form onSubmit={handleSubmit}>
            {tabValue === 0 ? (
              <>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                <Button type="submit" variant="contained" fullWidth size="large" sx={{ mb: 2 }}>
                  Login
                </Button>
                <Typography variant="body2" align="center">
                  <Link href="#" underline="hover">Forgot password?</Link>
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  sx={{ mb: 2 }}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
                <Button type="submit" variant="contained" fullWidth size="large">
                  Create Account
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Login;

