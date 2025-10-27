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
  Alert
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dataService from '../../services/dataService';

const CustomerForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
    customerType: 'tourist',
    preferences: {
      equipmentSize: 'M',
      wetsuitSize: 'M'
    },
    medicalConditions: [],
    certifications: []
  });
  const [saved, setSaved] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (customerId) {
      dataService.update('customers', customerId, formData);
    } else {
      dataService.create('customers', formData);
    }
    
    setSaved(true);
    setTimeout(() => {
      navigate('/customers');
    }, 1500);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {customerId ? 'Edit Customer' : 'New Customer'}
      </Typography>

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
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Last Name"
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Phone"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
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
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Nationality"
                fullWidth
                value={formData.nationality}
                onChange={(e) => handleChange('nationality', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Customer Type"
                fullWidth
                value={formData.customerType}
                onChange={(e) => handleChange('customerType', e.target.value)}
              >
                <MenuItem value="tourist">Tourist</MenuItem>
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="recurrent">Recurrent</MenuItem>
              </TextField>
            </Grid>

            <Divider sx={{ my: 2, width: '100%' }} />

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Equipment Size"
                fullWidth
                value={formData.preferences.equipmentSize}
                onChange={(e) => handleChange('preferences.equipmentSize', e.target.value)}
              >
                <MenuItem value="XS">XS</MenuItem>
                <MenuItem value="S">S</MenuItem>
                <MenuItem value="M">M</MenuItem>
                <MenuItem value="L">L</MenuItem>
                <MenuItem value="XL">XL</MenuItem>
                <MenuItem value="XXL">XXL</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Wetsuit Size"
                fullWidth
                value={formData.preferences.wetsuitSize}
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
                  {customerId ? 'Update' : 'Create'} Customer
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

