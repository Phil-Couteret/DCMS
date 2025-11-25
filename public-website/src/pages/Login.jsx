import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Link,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import bookingService from '../services/bookingService';

const Login = () => {
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tabValue === 0) {
        // Login logic
        if (!formData.email || !formData.password) {
          setError('Please enter both email and password');
          setLoading(false);
          return;
        }

        // Check if customer exists
        let customer = bookingService.getCustomerByEmail(formData.email);
        
        if (!customer) {
          setError('No account found with this email. Please register first.');
          setLoading(false);
          return;
        }

        // Check password (stored in customer data)
        // For now, we'll check if password exists and matches
        // In production, this would be hashed and verified securely
        if (!customer.password) {
          // Customer exists but no password set - allow login (legacy accounts)
          // Set password for future logins
          bookingService.updateCustomerProfile(formData.email, {
            password: formData.password // In production, this should be hashed
          });
        } else if (customer.password !== formData.password) {
          setError('Incorrect password. Please try again.');
          setLoading(false);
          return;
        }

        // Login successful
        localStorage.setItem('dcms_user_email', formData.email);
        
        // Pull latest customer data from sync server (in case admin updated it)
        if (typeof window !== 'undefined' && window.syncService) {
          await window.syncService.pullChanges();
        }
        
        // Migrate existing customers to ensure they have required fields
        bookingService.migrateExistingCustomers();
        
        // Only set defaults if customerType/centerSkillLevel are truly missing (null/undefined)
        // Don't overwrite existing values - they may have been set by admin
        customer = bookingService.getCustomerByEmail(formData.email);
        if (customer && (customer.customerType === null || customer.customerType === undefined || 
            customer.centerSkillLevel === null || customer.centerSkillLevel === undefined)) {
          bookingService.updateCustomerProfile(formData.email, {
            customerType: customer.customerType ?? 'tourist',
            centerSkillLevel: customer.centerSkillLevel ?? 'beginner'
          });
        }
        
        // Dispatch event to notify other components (like PWA prompt)
        window.dispatchEvent(new CustomEvent('dcms_customer_updated', {
          detail: { email: formData.email }
        }));
        
        navigate('/my-account');
      } else {
        // Registration logic
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        // Check if customer already exists
        const existingCustomer = bookingService.getCustomerByEmail(formData.email);
        if (existingCustomer) {
          setError('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        }

        // Create new customer account
        const customerData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || '',
          password: formData.password, // In production, this should be hashed
          preferences: {
            ownEquipment: false,
            tankSize: '12L',
            equipmentOwnership: {},
            suitPreferences: {
              style: 'full',
              thickness: '5mm',
              hood: false
            }
          },
          certifications: []
        };

        // Find or create customer (this will create if doesn't exist)
        bookingService.findOrCreateCustomer(customerData);
        
        // Update with password
        bookingService.updateCustomerProfile(formData.email, {
          password: formData.password // In production, this should be hashed
        });

        // Registration successful - log them in
        localStorage.setItem('dcms_user_email', formData.email);
        
        // Manually trigger sync to ensure data is pushed to server immediately
        if (typeof window !== 'undefined' && window.syncService) {
          window.syncService.markChanged('customers');
          // Also push immediately
          setTimeout(() => {
            window.syncService.pushPendingChanges().catch(err => {
              console.warn('[Login] Failed to sync customer:', err);
            });
          }, 200);
        }
        
        // Dispatch event to notify other components (like PWA prompt)
        window.dispatchEvent(new CustomEvent('dcms_customer_updated', {
          detail: { email: formData.email }
        }));
        
        navigate('/my-account');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

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
                  onChange={(e) => {
                    handleChange('email', e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 3 }}
                  value={formData.password}
                  onChange={(e) => {
                    handleChange('password', e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  size="large" 
                  sx={{ mb: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
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
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
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

