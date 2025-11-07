import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon, CheckCircle as VerifiedIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  const isReadOnly = !isAdmin() && customerId; // Read-only for non-admins viewing existing customers
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    customerType: 'tourist',
    centerSkillLevel: 'beginner',
    preferences: {
      bcdSize: 'M',
      finsSize: 'M',
      bootsSize: 'M',
      wetsuitSize: 'M',
      tankSize: '12L',
      ownEquipment: false
    },
    medicalConditions: [],
    certifications: [],
    medicalCertificate: {
      hasCertificate: false,
      certificateNumber: '',
      issueDate: '',
      expiryDate: '',
      verified: false
    },
    divingInsurance: {
      hasInsurance: false,
      insuranceProvider: '',
      policyNumber: '',
      issueDate: '',
      expiryDate: '',
      verified: false
    }
  });
  const [saved, setSaved] = useState(false);
  const [newCertification, setNewCertification] = useState({
    agency: '',
    level: '',
    certificationNumber: '',
    issueDate: '',
    expiryDate: ''
  });
  const [verifyingIndex, setVerifyingIndex] = useState(null);

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomer = () => {
    const customer = dataService.getById('customers', customerId);
    if (customer) {
      setFormData(customer);
    }
  };

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleVerifyCertification = (agency, certificationNumber, index) => {
    console.log('Verifying certification:', agency, certificationNumber, index);
    
    try {
      // Get settings from localStorage
      const settingsData = dataService.getAll('settings');
      const settings = settingsData.length > 0 ? settingsData[0] : null;
      
      if (!settings || !settings.certificationUrls) {
        console.error('Settings not found or certification URLs not configured');
        alert('Certification verification URLs not configured. Please check Settings page.');
        return;
      }
      
      const url = settings.certificationUrls[agency];
      console.log('Opening URL:', url);
      
      if (url) {
        // Open verification portal in popup window
        const popup = window.open(
          url,
          'certification-verification',
          'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
        );
        
        console.log('Popup result:', popup);
        
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          alert('Please allow popups for certification verification or check your popup blocker settings');
          console.log('Popup blocked or failed to open');
        } else {
          console.log('Popup opened successfully');
          
          // Mark as verified after opening the popup
          // The user will manually verify it in the popup
          setFormData(prev => {
            const updatedCerts = [...prev.certifications];
            if (updatedCerts[index]) {
              updatedCerts[index] = {
                ...updatedCerts[index],
                verified: true,
                verifiedDate: new Date().toISOString().split('T')[0]
              };
            }
            return {
              ...prev,
              certifications: updatedCerts
            };
          });
          
          alert(`Verification portal opened for ${agency}. After verifying the certification, it will be marked as verified.`);
        }
      } else {
        alert(`No verification URL configured for ${agency}. Please configure it in Settings.`);
      }
    } catch (error) {
      console.error('Error verifying certification:', error);
      alert('Error opening verification portal. Please try again.');
    }
  };

  const addCertification = () => {
    if (newCertification.agency && newCertification.level && newCertification.certificationNumber) {
      const certification = {
        agency: newCertification.agency,
        level: newCertification.level,
        certificationNumber: newCertification.certificationNumber,
        issueDate: newCertification.issueDate || null,
        expiryDate: newCertification.expiryDate || null,
        verified: false // Default to not verified, user will verify manually
      };
      
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, certification]
      }));
      
      setNewCertification({
        agency: '',
        level: '',
        certificationNumber: '',
        issueDate: '',
        expiryDate: ''
      });
    }
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isReadOnly) {
      // In read-only mode, only update equipment preferences
      if (customerId) {
        const customer = dataService.getById('customers', customerId);
        if (customer) {
          dataService.update('customers', customerId, {
            ...customer,
            preferences: formData.preferences,
            // Allow guides/staff to update centerSkillLevel even in read-only mode
            centerSkillLevel: formData.centerSkillLevel
          });
        }
      }
    } else {
      // Full edit mode for admins
      if (customerId) {
        dataService.update('customers', customerId, formData);
      } else {
        dataService.create('customers', formData);
      }
    }
    
    setSaved(true);
    setTimeout(() => {
      navigate('/customers');
    }, 1500);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isReadOnly ? 'View Customer' : (customerId ? 'Edit Customer' : 'New Customer')}
      </Typography>
      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You are viewing this customer in read-only mode. You can only modify equipment sizes for preparation purposes.
        </Alert>
      )}

      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Customer saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="First Name"
                fullWidth
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Date of Birth"
                type="date"
                fullWidth
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Nationality"
                fullWidth
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
                disabled={isReadOnly}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Customer Type"
                fullWidth
                value={formData.customerType}
                onChange={(e) => handleChange('customerType', e.target.value)}
                disabled={isReadOnly}
              >
                <MenuItem value="tourist">Tourist</MenuItem>
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="recurrent">Recurrent</MenuItem>
              </TextField>
            </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              select
              label="Center Skill Level"
              fullWidth
              value={formData.centerSkillLevel || 'beginner'}
              onChange={(e) => handleChange('centerSkillLevel', e.target.value)}
              helperText="Operational assessment by staff"
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
              </TextField>
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Equipment Sizes
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="BCD Size"
                fullWidth
                value={formData.preferences.bcdSize || 'M'}
                onChange={(e) => handleChange('preferences.bcdSize', e.target.value)}
              >
                <MenuItem value="XS">XS</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="XL">XL</MenuItem>
                <MenuItem value="XXL">XXL</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Fins Size"
                fullWidth
                value={formData.preferences.finsSize || 'M'}
                onChange={(e) => handleChange('preferences.finsSize', e.target.value)}
              >
                <MenuItem value="XS">XS</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="XL">XL</MenuItem>
                <MenuItem value="XXL">XXL</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Boots Size"
                fullWidth
                value={formData.preferences.bootsSize || 'M'}
                onChange={(e) => handleChange('preferences.bootsSize', e.target.value)}
              >
                <MenuItem value="XS">XS</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="XL">XL</MenuItem>
                <MenuItem value="XXL">XXL</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Wetsuit Size"
                fullWidth
                value={formData.preferences.wetsuitSize || 'M'}
                onChange={(e) => handleChange('preferences.wetsuitSize', e.target.value)}
              >
                <MenuItem value="XS">XS</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="XL">XL</MenuItem>
                <MenuItem value="XXL">XXL</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Tank Size"
                fullWidth
                value={formData.preferences.tankSize || '12L'}
                onChange={(e) => handleChange('preferences.tankSize', e.target.value)}
                helperText="Required for all dives"
              >
                <MenuItem value="10L">10L (Normal)</MenuItem>
                <MenuItem value="12L">12L (Normal)</MenuItem>
                <MenuItem value="15L">15L (Normal)</MenuItem>
                <MenuItem value="Nitrox 10L">Nitrox 10L</MenuItem>
                <MenuItem value="Nitrox 12L">Nitrox 12L</MenuItem>
                <MenuItem value="Nitrox 15L">Nitrox 15L</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.preferences.ownEquipment}
                    onChange={(e) => handleChange('preferences.ownEquipment', e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Customer brings own equipment"
              />
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            {/* Certifications Section - Admin only */}
            {isAdmin() && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Diving Certifications
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Add customer's diving certifications. Click verify buttons to check with certification agencies.
                  </Typography>
                </Grid>

                {formData.certifications && formData.certifications.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {formData.certifications.map((cert, index) => (
                        <Box 
                          key={index} 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            p: 1.5,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            backgroundColor: '#fafafa',
                            '&:hover': {
                              backgroundColor: '#f5f5f5'
                            }
                          }}
                        >
                          <Chip
                            label={`${cert.agency} ${cert.level}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                            #{cert.certificationNumber}
                          </Typography>
                          {cert.verified ? (
                            <Chip
                              icon={<VerifiedIcon />}
                              label="Verified"
                              size="small"
                              color="success"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<VerifiedIcon />}
                              onClick={() => handleVerifyCertification(cert.agency, cert.certificationNumber, index)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Verify
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => removeCertification(index)}
                            color="error"
                            title="Remove certification"
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Certification Agency"
                    fullWidth
                    value={newCertification.agency}
                    onChange={(e) => setNewCertification({ ...newCertification, agency: e.target.value })}
                  >
                    <MenuItem value="SSI">SSI</MenuItem>
                    <MenuItem value="PADI">PADI</MenuItem>
                    <MenuItem value="CMAS">CMAS</MenuItem>
                    <MenuItem value="VDST">VDST</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Certification Level"
                    fullWidth
                    value={newCertification.level}
                    onChange={(e) => setNewCertification({ ...newCertification, level: e.target.value })}
                    placeholder="e.g., OW, AOW, RESCUE"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    label="Certification Number"
                    fullWidth
                    value={newCertification.certificationNumber}
                    onChange={(e) => setNewCertification({ ...newCertification, certificationNumber: e.target.value })}
                    placeholder="e.g., PADI-OW-123456"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={addCertification}
                    disabled={!newCertification.agency || !newCertification.level || !newCertification.certificationNumber}
                  >
                    Add Certification
                  </Button>
                </Grid>

                <Divider sx={{ my: 2, width: '100%' }} />

                {/* Medical Certificate Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Medical Certificate
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Required for diving activities. Include certificate details and verification status.
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.medicalCertificate.hasCertificate}
                        onChange={(e) => handleChange('medicalCertificate.hasCertificate', e.target.checked)}
                      />
                    }
                    label="Customer has medical certificate"
                  />
                </Grid>

                {formData.medicalCertificate.hasCertificate && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Certificate Number"
                        fullWidth
                        value={formData.medicalCertificate.certificateNumber}
                        onChange={(e) => handleChange('medicalCertificate.certificateNumber', e.target.value)}
                        placeholder="e.g., MED-2024-001"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Issue Date"
                        type="date"
                        fullWidth
                        value={formData.medicalCertificate.issueDate}
                        onChange={(e) => handleChange('medicalCertificate.issueDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Expiry Date"
                        type="date"
                        fullWidth
                        value={formData.medicalCertificate.expiryDate}
                        onChange={(e) => handleChange('medicalCertificate.expiryDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {formData.medicalCertificate.verified ? (
                          <Chip
                            icon={<VerifiedIcon />}
                            label="Verified"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<VerifiedIcon />}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                medicalCertificate: {
                                  ...prev.medicalCertificate,
                                  verified: true,
                                  verifiedDate: new Date().toISOString().split('T')[0]
                                }
                              }));
                            }}
                          >
                            Verify Medical Certificate
                          </Button>
                        )}
                        {formData.medicalCertificate.verified && formData.medicalCertificate.verifiedDate && (
                          <Typography variant="caption" color="text.secondary">
                            Verified on: {formData.medicalCertificate.verifiedDate}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </>
                )}

                <Divider sx={{ my: 2, width: '100%' }} />

                {/* Diving Insurance Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Diving Insurance
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Required for diving activities. Include insurance provider and policy details.
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.divingInsurance.hasInsurance}
                        onChange={(e) => handleChange('divingInsurance.hasInsurance', e.target.checked)}
                      />
                    }
                    label="Customer has diving insurance"
                  />
                </Grid>

                {formData.divingInsurance.hasInsurance && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Insurance Provider"
                        fullWidth
                        value={formData.divingInsurance.insuranceProvider}
                        onChange={(e) => handleChange('divingInsurance.insuranceProvider', e.target.value)}
                        placeholder="e.g., DAN Europe, PADI Insurance"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Policy Number"
                        fullWidth
                        value={formData.divingInsurance.policyNumber}
                        onChange={(e) => handleChange('divingInsurance.policyNumber', e.target.value)}
                        placeholder="e.g., DAN-2024-789"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Issue Date"
                        type="date"
                        fullWidth
                        value={formData.divingInsurance.issueDate}
                        onChange={(e) => handleChange('divingInsurance.issueDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Expiry Date"
                        type="date"
                        fullWidth
                        value={formData.divingInsurance.expiryDate}
                        onChange={(e) => handleChange('divingInsurance.expiryDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {formData.divingInsurance.verified ? (
                          <Chip
                            icon={<VerifiedIcon />}
                            label="Verified"
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<VerifiedIcon />}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                divingInsurance: {
                                  ...prev.divingInsurance,
                                  verified: true,
                                  verifiedDate: new Date().toISOString().split('T')[0]
                                }
                              }));
                            }}
                          >
                            Verify Insurance
                          </Button>
                        )}
                        {formData.divingInsurance.verified && formData.divingInsurance.verifiedDate && (
                          <Typography variant="caption" color="text.secondary">
                            Verified on: {formData.divingInsurance.verifiedDate}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </>
                )}
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/customers')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                >
                  {isReadOnly 
                    ? 'Save Equipment Sizes' 
                    : (customerId ? 'Update Customer' : 'Create Customer')
                  }
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CustomerForm;
