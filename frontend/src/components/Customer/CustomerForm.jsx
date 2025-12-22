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
  Tooltip,
  Checkbox,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  FormLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon, CheckCircle as VerifiedIcon, CloudUpload as CloudUploadIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';

const EQUIPMENT_ITEMS = [
  { key: 'mask', label: 'Mask' },
  { key: 'snorkel', label: 'Snorkel' },
  { key: 'fins', label: 'Fins' },
  { key: 'boots', label: 'Boots' },
  { key: 'wetsuit', label: 'Wetsuit' },
  { key: 'hood', label: 'Hood' },
  { key: 'bcd', label: 'BCD' },
  { key: 'regulator', label: 'Regulator' },
  { key: 'computer', label: 'Dive Computer' },
  { key: 'torch', label: 'Torch' },
  { key: 'camera', label: 'Camera' },
  { key: 'weights', label: 'Weights' },
  { key: 'tank', label: 'Tank' }
];
const EQUIPMENT_ITEMS_NO_TANK = EQUIPMENT_ITEMS.filter(item => item.key !== 'tank');

const getDefaultEquipmentOwnership = () =>
  EQUIPMENT_ITEMS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});

const getDefaultSuitPreferences = () => ({
  style: 'full',
  thickness: '5mm',
  hood: false
});

const getDefaultPreferences = () => ({
  bcdSize: 'M',
  finsSize: 'M',
  bootsSize: 'M',
  wetsuitSize: 'M',
  tankSize: '12L',
  ownEquipment: false,
  equipmentOwnership: getDefaultEquipmentOwnership(),
  suitPreferences: getDefaultSuitPreferences()
});

const normalizePreferences = (prefs = {}) => {
  const ownership = {
    ...getDefaultEquipmentOwnership(),
    ...(prefs.equipmentOwnership || {})
  };
  ownership.tank = false;
  const suitPreferences = {
    ...getDefaultSuitPreferences(),
    ...(prefs.suitPreferences || {})
  };
  const ownEquipment = EQUIPMENT_ITEMS_NO_TANK.every(item => ownership[item.key]);
  return {
    ...getDefaultPreferences(),
    ...prefs,
    ownEquipment,
    equipmentOwnership: ownership,
    suitPreferences
  };
};

const getDefaultMedicalCertificate = () => ({
  hasCertificate: false,
  certificateNumber: '',
  issueDate: '',
  expiryDate: '',
  verified: false
});

const getDefaultDivingInsurance = () => ({
  hasInsurance: false,
  insuranceProvider: '',
  policyNumber: '',
  issueDate: '',
  expiryDate: '',
  verified: false
});

const normalizeCustomerData = (customer) => ({
  ...customer,
  preferences: normalizePreferences(customer.preferences || {}),
  // Preserve certifications - don't overwrite with empty array if customer has certifications
  certifications: customer.certifications || [],
  medicalCertificate: {
    ...getDefaultMedicalCertificate(),
    ...(customer.medicalCertificate || {})
  },
  divingInsurance: {
    ...getDefaultDivingInsurance(),
    ...(customer.divingInsurance || {})
  },
  // Preserve uploadedDocuments
  uploadedDocuments: customer.uploadedDocuments || [],
  // Preserve medicalConditions
  medicalConditions: customer.medicalConditions || [],
  // Preserve isApproved, default to false if not set
  isApproved: customer.isApproved !== undefined ? customer.isApproved : false
});

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
    gender: '',
    customerType: 'tourist',
    centerSkillLevel: 'beginner',
    isApproved: false, // Customer approval status - required before booking
    preferences: getDefaultPreferences(),
    medicalConditions: [],
    certifications: [],
    medicalCertificate: getDefaultMedicalCertificate(),
    divingInsurance: getDefaultDivingInsurance()
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
  const equipmentOwnership = formData.preferences?.equipmentOwnership || getDefaultEquipmentOwnership();
  const suitPreferences = formData.preferences?.suitPreferences || getDefaultSuitPreferences();
  const uploadedDocuments = formData.uploadedDocuments || [];

  // File upload handler
  const handleFileUpload = async (event, documentType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      const documentData = {
        id: Date.now().toString(),
        type: documentType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileData: base64String,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'admin'
      };

      const updatedDocuments = [...uploadedDocuments, documentData];
      setFormData(prev => ({
        ...prev,
        uploadedDocuments: updatedDocuments
      }));
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Download file
  const handleFileDownload = (document) => {
    const byteCharacters = atob(document.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: document.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete file
  const handleFileDelete = (documentId) => {
    const updatedDocuments = uploadedDocuments.filter(doc => doc.id !== documentId);
    setFormData(prev => ({
      ...prev,
      uploadedDocuments: updatedDocuments
    }));
  };

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomer = () => {
    const customer = dataService.getById('customers', customerId);
    if (customer) {
      const normalized = normalizeCustomerData(customer);
      setFormData({
        ...normalized,
        uploadedDocuments: customer.uploadedDocuments || []
      });
    }
  };

  const handleChange = (field, value) => {
    if (!field.includes('.')) {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      return;
    }

    const path = field.split('.');
    setFormData(prev => {
      const updated = { ...prev };
      let cursor = updated;
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        const currentValue = cursor[key];
        cursor[key] = Array.isArray(currentValue)
          ? [...currentValue]
          : { ...(currentValue || {}) };
        cursor = cursor[key];
      }
      cursor[path[path.length - 1]] = value;
      return updated;
    });
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

  const handleEquipmentOwnershipChange = (itemKey, checked) => {
    if (itemKey === 'tank') {
      return;
    }
    setFormData(prev => {
      const normalizedPrefs = normalizePreferences(prev.preferences || {});
      const ownership = {
        ...normalizedPrefs.equipmentOwnership,
        [itemKey]: checked
      };
      ownership.tank = false;
      const ownEquipment = EQUIPMENT_ITEMS_NO_TANK.every(item => ownership[item.key]);
      return {
        ...prev,
        preferences: {
          ...normalizedPrefs,
          equipmentOwnership: ownership,
          ownEquipment
        }
      };
    });
  };

  const handleOwnEquipmentToggle = (checked) => {
    setFormData(prev => {
      const normalizedPrefs = normalizePreferences(prev.preferences || {});
      const ownership = { ...normalizedPrefs.equipmentOwnership };
      EQUIPMENT_ITEMS.forEach(item => {
        ownership[item.key] = item.key === 'tank' ? false : checked;
      });
      return {
        ...prev,
        preferences: {
          ...normalizedPrefs,
          ownEquipment: checked,
          equipmentOwnership: ownership
        }
      };
    });
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
          // Preserve all existing fields, only update what's allowed
          dataService.update('customers', customerId, {
            ...customer, // Preserve all existing fields
            preferences: formData.preferences,
            // Allow guides/staff to update centerSkillLevel even in read-only mode
            centerSkillLevel: formData.centerSkillLevel,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } else {
      // Full edit mode for admins
      if (customerId) {
        // Get existing customer to preserve all fields
        const existingCustomer = dataService.getById('customers', customerId);
        if (existingCustomer) {
          // Merge formData with existing customer to preserve all fields
          // This ensures fields like medicalCertificate, divingInsurance, isApproved, etc. are preserved
          const updatedCustomer = {
            ...existingCustomer, // Preserve all existing fields first
            ...formData, // Then apply form data (this will update changed fields)
            id: existingCustomer.id, // Ensure ID is preserved
            createdAt: existingCustomer.createdAt, // Preserve creation date
            updatedAt: new Date().toISOString() // Update timestamp
          };
          dataService.update('customers', customerId, updatedCustomer);
        } else {
          // Customer not found, create new
          dataService.create('customers', {
            ...formData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        // Creating new customer
        dataService.create('customers', {
          ...formData,
          isApproved: formData.isApproved || false, // Ensure isApproved is set
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
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
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Select
                  label="Gender"
                  value={formData.gender || ''}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={isReadOnly}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
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

            {isAdmin() && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isApproved || false}
                      onChange={(e) => handleChange('isApproved', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">
                        Customer Approved for Booking
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Approved customers can book dives in the customer portal. Unapproved customers must wait for assessment.
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            )}

            <Divider sx={{ my: 2, width: '100%' }} />

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Equipment & Suit Preferences
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.preferences.ownEquipment}
                    onChange={(e) => handleOwnEquipmentToggle(e.target.checked)}
                    disabled={isReadOnly}
                  />
                }
                label="Customer brings complete equipment setup"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Gear customer brings</Typography>
              <FormGroup>
                <Grid container spacing={1}>
                  {EQUIPMENT_ITEMS.map(item => (
                    <Grid item xs={12} sm={6} md={4} key={item.key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={equipmentOwnership[item.key] || false}
                            onChange={(e) =>
                              handleEquipmentOwnershipChange(item.key, e.target.checked)
                            }
                            disabled={isReadOnly || item.key === 'tank'}
                          />
                        }
                        label={
                          item.key === 'tank'
                            ? `${item.label} (provided by center)`
                            : item.label
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isReadOnly}>
                <InputLabel id="tank-size-label">Tank Size</InputLabel>
                <Select
                  labelId="tank-size-label"
                  value={formData.preferences.tankSize || '12L'}
                  label="Tank Size"
                  onChange={(e) => handleChange('preferences.tankSize', e.target.value)}
                >
                  <MenuItem value="10L">10 L</MenuItem>
                  <MenuItem value="12L">12 L</MenuItem>
                  <MenuItem value="15L">15 L</MenuItem>
                  <MenuItem value="Nitrox 12L">Nitrox 12 L</MenuItem>
                  <MenuItem value="Nitrox 15L">Nitrox 15 L</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {!equipmentOwnership.bcd && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="BCD Size"
                  value={formData.preferences.bcdSize || 'M'}
                  onChange={(e) => handleChange('preferences.bcdSize', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </TextField>
              </Grid>
            )}

            {!equipmentOwnership.wetsuit && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Wetsuit Size"
                  value={formData.preferences.wetsuitSize || 'M'}
                  onChange={(e) => handleChange('preferences.wetsuitSize', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </TextField>
              </Grid>
            )}

            {!equipmentOwnership.fins && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Fins Size"
                  value={formData.preferences.finsSize || 'M'}
                  onChange={(e) => handleChange('preferences.finsSize', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </TextField>
              </Grid>
            )}

            {!equipmentOwnership.boots && (
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Boots Size"
                  value={formData.preferences.bootsSize || 'M'}
                  onChange={(e) => handleChange('preferences.bootsSize', e.target.value)}
                  fullWidth
                  disabled={isReadOnly}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </TextField>
              </Grid>
            )}

            {!equipmentOwnership.wetsuit ? (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Suit Preferences
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset" fullWidth disabled={isReadOnly}>
                    <FormLabel component="legend">Preferred Suit Style</FormLabel>
                    <RadioGroup
                      row
                      value={suitPreferences.style}
                      onChange={(e) =>
                        handleChange('preferences.suitPreferences.style', e.target.value)
                      }
                    >
                      <FormControlLabel value="full" control={<Radio />} label="Full" />
                      <FormControlLabel value="shorty" control={<Radio />} label="Shorty" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={isReadOnly}>
                    <InputLabel id="suit-thickness-label">Thickness</InputLabel>
                    <Select
                      labelId="suit-thickness-label"
                      value={suitPreferences.thickness}
                      label="Thickness"
                      onChange={(e) =>
                        handleChange('preferences.suitPreferences.thickness', e.target.value)
                      }
                    >
                      <MenuItem value="3mm">3 mm</MenuItem>
                      <MenuItem value="5mm">5 mm</MenuItem>
                      <MenuItem value="7mm">7 mm</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={suitPreferences.hood}
                        onChange={(e) =>
                          handleChange('preferences.suitPreferences.hood', e.target.checked)
                        }
                        disabled={isReadOnly}
                      />
                    }
                    label="Include hood"
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="success">
                  Customer brings their own suit, so suit preferences are hidden.
                </Alert>
              </Grid>
            )}

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
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2 }}>
                        <input
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          style={{ display: 'none' }}
                          id="upload-medical-certificate-admin"
                          type="file"
                          onChange={(e) => handleFileUpload(e, 'medical_certificate')}
                          disabled={isReadOnly}
                        />
                        <label htmlFor="upload-medical-certificate-admin">
                          <Button
                            component="span"
                            variant="outlined"
                            size="small"
                            startIcon={<CloudUploadIcon />}
                            disabled={isReadOnly}
                            sx={{ mr: 1 }}
                          >
                            Upload Document
                          </Button>
                        </label>
                        {uploadedDocuments.filter(doc => doc.type === 'medical_certificate').map(doc => (
                          <Chip
                            key={doc.id}
                            label={doc.fileName}
                            onDelete={isReadOnly ? undefined : () => handleFileDelete(doc.id)}
                            onClick={() => handleFileDownload(doc)}
                            icon={<FileDownloadIcon />}
                            sx={{ mr: 1, mb: 1 }}
                            clickable
                          />
                        ))}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mt: 2 }}>
                        <input
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          style={{ display: 'none' }}
                          id="upload-diving-insurance-admin"
                          type="file"
                          onChange={(e) => handleFileUpload(e, 'diving_insurance')}
                          disabled={isReadOnly}
                        />
                        <label htmlFor="upload-diving-insurance-admin">
                          <Button
                            component="span"
                            variant="outlined"
                            size="small"
                            startIcon={<CloudUploadIcon />}
                            disabled={isReadOnly}
                            sx={{ mr: 1 }}
                          >
                            Upload Document
                          </Button>
                        </label>
                        {uploadedDocuments.filter(doc => doc.type === 'diving_insurance').map(doc => (
                          <Chip
                            key={doc.id}
                            label={doc.fileName}
                            onDelete={isReadOnly ? undefined : () => handleFileDelete(doc.id)}
                            onClick={() => handleFileDownload(doc)}
                            icon={<FileDownloadIcon />}
                            sx={{ mr: 1, mb: 1 }}
                            clickable
                          />
                        ))}
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
