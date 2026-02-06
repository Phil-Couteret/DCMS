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
  Alert,
  FormControlLabel,
  Checkbox,
  Box
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookingService from '../services/bookingService';
import consentService from '../services/consentService';
import passwordMigrationService from '../services/passwordMigrationService';
import passwordHash from '../utils/passwordHash';
import PasswordChangeDialog from '../components/PasswordChangeDialog';

const Login = () => {
  const { t } = useTranslation();
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
  const [consents, setConsents] = useState({
    dataProcessing: true, // Required for service
    medicalData: true, // Required for diving
    marketing: false // Optional
  });
  const [passwordChangeDialogOpen, setPasswordChangeDialogOpen] = useState(false);
  const [customerNeedingPasswordChange, setCustomerNeedingPasswordChange] = useState(null);
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
          setError(t('login.errorEnterBoth'));
          setLoading(false);
          return;
        }

        // Check if customer exists (async - fetch from server)
        let customer = await bookingService.getCustomerByEmail(formData.email);
        
        if (!customer) {
          setError(t('login.errorNoAccount'));
          setLoading(false);
          return;
        }

        // Clean up expired accounts before login
        passwordMigrationService.cleanupExpiredAccounts();

        // Verify password (handles both plaintext and hashed)
        if (!customer.password) {
          // Customer exists but no password set - allow login (legacy accounts)
          // Set password for future logins (will be hashed)
          const hashedPassword = await passwordHash.storeHashedPassword(formData.password);
          await bookingService.updateCustomerProfile(formData.email, {
            password: hashedPassword
          });
        } else {
          // Verify password (supports both plaintext legacy and hashed)
          const isValid = await passwordMigrationService.verifyPassword(
            formData.password,
            customer.password
          );

          if (!isValid) {
            setError(t('login.errorIncorrectPassword'));
            setLoading(false);
            return;
          }

          // Check if password change is required (plaintext password detected)
          if (passwordMigrationService.isPasswordChangeRequired(customer)) {
            // Check if account should be deleted
            if (passwordMigrationService.shouldDeleteAccount(customer)) {
              // Account expired - delete it
              await bookingService.deleteCustomerAccount(formData.email);
              consentService.deleteCustomerConsents(customer.id);
              setError('Your account has been deleted due to security requirements. Please register a new account.');
              setLoading(false);
              return;
            }

            // Mark password change as required if not already marked
            passwordMigrationService.markPasswordChangeRequired(formData.email);
            
            // Reload customer to get updated timestamp (async - fetch from server)
            customer = await bookingService.getCustomerByEmail(formData.email);
            
            // Show password change dialog
            setCustomerNeedingPasswordChange(customer);
            setPasswordChangeDialogOpen(true);
            setLoading(false);
            return;
          }
        }

        // Login successful
        localStorage.setItem('dcms_user_email', formData.email);
        
        // Pull latest customer data from sync server (in case admin updated it)
        if (typeof window !== 'undefined' && window.syncService) {
          await window.syncService.pullChanges();
        }
        
        // Fetch latest customer data (async - fetch from server)
        customer = await bookingService.getCustomerByEmail(formData.email);
        
        // Only set defaults if customerType/centerSkillLevel are truly missing (null/undefined)
        // Don't overwrite existing values - they may have been set by admin
        if (customer && (customer.customerType === null || customer.customerType === undefined || 
            customer.centerSkillLevel === null || customer.centerSkillLevel === undefined)) {
          await bookingService.updateCustomerProfile(formData.email, {
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

        // Validate required consents
        if (!consents.dataProcessing || !consents.medicalData) {
          setError('Please accept the required consents to create an account.');
          setLoading(false);
          return;
        }

        // Check if customer already exists (async - fetch from server)
        const existingCustomer = await bookingService.getCustomerByEmail(formData.email);
        if (existingCustomer) {
          setError('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        }

        // Hash password before storing
        const hashedPassword = await passwordHash.storeHashedPassword(formData.password);

        // Create new customer account
        // Note: Public website is for diving customers, so default to 'tourist'
        const customerData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || '',
          password: hashedPassword, // Store hashed password
          customerType: 'tourist', // Default to tourist for diving customers
          centerSkillLevel: 'beginner', // Default skill level
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

        // Find or create customer (this will create if doesn't exist) - async
        const customer = await bookingService.findOrCreateCustomer(customerData);
        
        // Update with hashed password (in case findOrCreateCustomer didn't use it) - async
        await bookingService.updateCustomerProfile(formData.email, {
          password: hashedPassword
        });

        // Record GDPR consents
        const customerId = customer.id;
        const ipAddress = null; // Could be retrieved from request if available
        const userAgent = navigator.userAgent;

        // Record required consents (data processing and medical data)
        consentService.recordConsent(customerId, 'data_processing', consents.dataProcessing, 'online', ipAddress, userAgent);
        consentService.recordConsent(customerId, 'medical_data', consents.medicalData, 'online', ipAddress, userAgent);
        
        // Record optional marketing consent
        if (consents.marketing) {
          consentService.recordConsent(customerId, 'marketing', true, 'online', ipAddress, userAgent);
        }

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
      setError(err.message || t('login.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
            <Tab label={t('login.tabLogin')} />
            <Tab label={t('login.tabRegister')} />
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
                  label={t('login.email')}
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
                  label={t('login.password')}
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
                  {loading ? t('login.loggingIn') : t('login.tabLogin')}
                </Button>
                <Typography variant="body2" align="center">
                  <Link href="#" underline="hover">{t('login.forgotPassword')}</Link>
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  label={t('login.firstName')}
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
                <TextField
                  label={t('login.lastName')}
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
                <TextField
                  label={t('login.email')}
                  type="email"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
                <TextField
                  label={t('login.phone')}
                  fullWidth
                  sx={{ mb: 2 }}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
                <TextField
                  label={t('login.password')}
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                <TextField
                  label={t('login.confirmPassword')}
                  type="password"
                  fullWidth
                  required
                  sx={{ mb: 2 }}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                />
                
                {/* GDPR Consent Section */}
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t('login.privacyConsent')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('login.privacyIntro')}{' '}
                    <Link href="/privacy-policy" target="_blank" underline="always">
                      {t('login.privacyPolicy')}
                    </Link>.
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consents.dataProcessing}
                        onChange={(e) => setConsents(prev => ({ ...prev, dataProcessing: e.target.checked }))}
                        required
                        disabled={loading}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('login.consentDataProcessing')}
                      </Typography>
                    }
                    sx={{ mb: 1, display: 'block' }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consents.medicalData}
                        onChange={(e) => setConsents(prev => ({ ...prev, medicalData: e.target.checked }))}
                        required
                        disabled={loading}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('login.consentMedicalData')}
                      </Typography>
                    }
                    sx={{ mb: 1, display: 'block' }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={consents.marketing}
                        onChange={(e) => setConsents(prev => ({ ...prev, marketing: e.target.checked }))}
                        disabled={loading}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {t('login.consentMarketing')}
                      </Typography>
                    }
                    sx={{ display: 'block' }}
                  />
                </Box>
                
                {!consents.dataProcessing && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {t('login.alertDataRequired')}
                  </Alert>
                )}
                
                {!consents.medicalData && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {t('login.alertMedicalRequired')}
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  disabled={loading || !consents.dataProcessing || !consents.medicalData}
                >
                  {loading ? t('login.creatingAccount') : t('login.createAccount')}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <PasswordChangeDialog
        open={passwordChangeDialogOpen}
        customer={customerNeedingPasswordChange}
        onClose={() => {
          setPasswordChangeDialogOpen(false);
          setCustomerNeedingPasswordChange(null);
        }}
        onSuccess={() => {
          setPasswordChangeDialogOpen(false);
          setCustomerNeedingPasswordChange(null);
          // Login successful after password change
          localStorage.setItem('dcms_user_email', customerNeedingPasswordChange.email);
          
          // Pull latest customer data
          if (typeof window !== 'undefined' && window.syncService) {
            window.syncService.pullChanges().then(() => {
              navigate('/my-account');
            });
          } else {
            navigate('/my-account');
          }
        }}
      />
    </Container>
  );
};

export default Login;

