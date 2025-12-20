import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Snackbar,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dataService from '../../services/dataService';

const Prices = () => {
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadSettings();
    loadLocations();
  }, []);

  const loadSettings = () => {
    const settingsData = dataService.getAll('settings')[0];
    setSettings(settingsData);
  };

  const loadLocations = () => {
    const locs = dataService.getAll('locations') || [];
    setLocations(locs);
    const stored = localStorage.getItem('dcms_current_location');
    const initial = stored && locs.find(l => l.id === stored) ? stored : (locs[0]?.id || '');
    setSelectedLocationId(initial);
  };

  const handleSave = () => {
    setLoading(true);
    try {
      // Persist selected location pricing changes
      if (selectedLocationId) {
        const loc = locations.find(l => l.id === selectedLocationId);
        if (loc) {
          dataService.update('locations', loc.id, loc);
        }
      }
      setSnackbar({
        open: true,
        message: 'Prices updated successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error saving prices',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Access selected location pricing safely
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const locPricing = selectedLocation?.pricing || {};

  const updateLocationPricing = (updater) => {
    setLocations(prev => prev.map(l => {
      if (l.id !== selectedLocationId) return l;
      const updatedPricing = updater(l.pricing || {});
      return { ...l, pricing: updatedPricing };
    }));
  };

  const handleCustomerTypePriceChange = (customerType, field, value) => {
    updateLocationPricing((pricing) => ({
      ...pricing,
      customerTypes: {
        ...(pricing.customerTypes || {}),
        [customerType]: {
          ...(pricing.customerTypes?.[customerType] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleTouristTierChange = (index, field, value) => {
    const newTiers = [...(locPricing.customerTypes?.tourist?.diveTiers || [])];
    newTiers[index] = { ...newTiers[index], [field]: value };
    updateLocationPricing((pricing) => ({
      ...pricing,
      customerTypes: {
        ...(pricing.customerTypes || {}),
        tourist: {
          ...(pricing.customerTypes?.tourist || {}),
          diveTiers: newTiers
        }
      }
    }));
  };

  const addTouristTier = () => {
    const current = locPricing.customerTypes?.tourist?.diveTiers || [];
    const newTier = {
      dives: current.length + 1,
      price: 38.00,
      description: `${current.length + 1}+ dives`
    };
    updateLocationPricing((pricing) => ({
      ...pricing,
      customerTypes: {
        ...(pricing.customerTypes || {}),
        tourist: {
          ...(pricing.customerTypes?.tourist || {}),
          diveTiers: [...(pricing.customerTypes?.tourist?.diveTiers || []), newTier]
        }
      }
    }));
  };

  const removeTouristTier = (index) => {
    const current = locPricing.customerTypes?.tourist?.diveTiers || [];
    if (current.length > 1) {
      const newTiers = current.filter((_, i) => i !== index);
      updateLocationPricing((pricing) => ({
        ...pricing,
        customerTypes: {
          ...(pricing.customerTypes || {}),
          tourist: {
            ...(pricing.customerTypes?.tourist || {}),
            diveTiers: newTiers
          }
        }
      }));
    }
  };

  // Equipment prices are global across locations
  const handleEquipmentPriceChange = (equipment, value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        equipment: {
          ...settings.prices.equipment,
          [equipment]: parseFloat(value) || 0
        }
      }
    });
  };

  const handleAddonPriceChange = (addon, value) => {
    updateLocationPricing((pricing) => ({
      ...pricing,
      addons: {
        ...(pricing.addons || {}),
        [addon]: parseFloat(value) || 0
      }
    }));
  };

  const handleBeveragePriceChange = (beverage, value) => {
    updateLocationPricing((pricing) => ({
      ...pricing,
      beverages: {
        ...(pricing.beverages || {}),
        [beverage]: parseFloat(value) || 0
      }
    }));
  };

  const handleDiveInsurancePriceChange = (insuranceType, value) => {
    updateLocationPricing((pricing) => ({
      ...pricing,
      diveInsurance: {
        ...(pricing.diveInsurance || {}),
        [insuranceType]: parseFloat(value) || 0
      }
    }));
  };

  const handleTaxRateChange = (value) => {
    updateLocationPricing((pricing) => ({
      ...pricing,
      tax: {
        ...(pricing.tax || {}),
        igic_rate: (parseFloat(value) || 0) / 100
      }
    }));
  };

  if (!settings) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Price Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage all pricing configurations for dives, equipment, and services.
      </Typography>

      {/* Location selector for pricing scope */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">Pricing Location:</Typography>
        <TextField select size="small" value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
          {locations.map(loc => (
            <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={3}>
        {/* Customer Type Pricing */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Customer Type Pricing"
              subheader="Different pricing models for different customer types"
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Tourist Pricing (Tiered) */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title="Tourist Pricing"
                      subheader="Volume discounts for visiting divers"
                      action={
                        <Button
                          startIcon={<AddIcon />}
                          onClick={addTouristTier}
                          variant="outlined"
                          size="small"
                        >
                          Add Tier
                        </Button>
                      }
                    />
                    <CardContent>
                      {/* Orientation Dive Price */}
                      <Box sx={{ mb: 2 }}>
                        <TextField
                          label="Orientation Dive Price"
                          type="number"
                            value={locPricing.customerTypes?.tourist?.orientationDive || 32.00}
                          onChange={(e) => handleCustomerTypePriceChange('tourist', 'orientationDive', parseFloat(e.target.value) || 0)}
                          fullWidth
                          size="small"
                          InputProps={{
                            startAdornment: '€'
                          }}
                          helperText="Special price for orientation dive"
                        />
                      </Box>
                      {/* Discovery Dive Price */}
                      <Box sx={{ mb: 3 }}>
                        <TextField
                          label="Discovery Dive Price"
                          type="number"
                          value={locPricing.customerTypes?.tourist?.discoverDive || 100.00}
                          onChange={(e) => handleCustomerTypePriceChange('tourist', 'discoverDive', parseFloat(e.target.value) || 0)}
                          fullWidth
                          size="small"
                          InputProps={{
                            startAdornment: '€'
                          }}
                          helperText="Price for discovery dive (try diving)"
                        />
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>From Dives</TableCell>
                              <TableCell>Price per Dive</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(locPricing.customerTypes?.tourist?.diveTiers || []).map((tier, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    value={tier.dives}
                                    onChange={(e) => handleTouristTierChange(index, 'dives', parseInt(e.target.value) || 0)}
                                    size="small"
                                    sx={{ width: 60 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    type="number"
                                    value={tier.price}
                                    onChange={(e) => handleTouristTierChange(index, 'price', parseFloat(e.target.value) || 0)}
                                    size="small"
                                    sx={{ width: 80 }}
                                    InputProps={{
                                      startAdornment: '€'
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <TextField
                                    value={tier.description}
                                    onChange={(e) => handleTouristTierChange(index, 'description', e.target.value)}
                                    size="small"
                                    fullWidth
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    onClick={() => removeTouristTier(index)}
                                    disabled={settings.prices.customerTypes.tourist.diveTiers.length === 1}
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Local & Recurrent Pricing (Fixed) */}
                <Grid item xs={12} md={6}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardHeader title="Local Pricing" subheader="Fixed price for local residents" />
                        <CardContent>
                          <TextField
                            label="Price per Dive"
                            type="number"
                            value={locPricing.customerTypes?.local?.pricePerDive || 0}
                            onChange={(e) => handleCustomerTypePriceChange('local', 'pricePerDive', parseFloat(e.target.value) || 0)}
                            fullWidth
                            size="small"
                            InputProps={{
                              startAdornment: '€'
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardHeader title="Recurrent Pricing" subheader="Fixed price for regular customers" />
                        <CardContent>
                          <TextField
                            label="Price per Dive"
                            type="number"
                            value={locPricing.customerTypes?.recurrent?.pricePerDive || 0}
                            onChange={(e) => handleCustomerTypePriceChange('recurrent', 'pricePerDive', parseFloat(e.target.value) || 0)}
                            fullWidth
                            size="small"
                            InputProps={{
                              startAdornment: '€'
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Equipment Rental Prices */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Equipment Rental Prices" />
            <CardContent>
              <Grid container spacing={2}>
                {Object.entries(settings.prices.equipment || {}).map(([equipment, price]) => (
                  <Grid item xs={12} key={equipment}>
                    <TextField
                      label={equipment.replace(/_/g, ' ').toUpperCase()}
                      type="number"
                      value={price}
                      onChange={(e) => handleEquipmentPriceChange(equipment, e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: '€'
                      }}
                      helperText={
                        price === 0 ? 'Free (included in dive price)' : 
                        equipment === 'complete_equipment' ? 'Full equipment set (first 8 dives only)' : ''
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Addon Services */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Addon Services" />
            <CardContent>
              <Grid container spacing={2}>
                {Object.entries(locPricing.addons || {}).map(([addon, price]) => (
                  <Grid item xs={12} key={addon}>
                    <TextField
                      label={addon.replace(/_/g, ' ').toUpperCase()}
                      type="number"
                      value={price}
                      onChange={(e) => handleAddonPriceChange(addon, e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: '€'
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Beverages */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Beverage Prices" />
            <CardContent>
              <Grid container spacing={2}>
                {Object.entries(locPricing.beverages || {}).map(([beverage, price]) => (
                  <Grid item xs={12} key={beverage}>
                    <TextField
                      label={beverage.replace(/_/g, ' ').toUpperCase()}
                      type="number"
                      value={price}
                      onChange={(e) => handleBeveragePriceChange(beverage, e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: '€'
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Dive Insurance (Mandatory) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Dive Insurance Prices" 
              subheader="Mandatory insurance for all divers"
            />
            <CardContent>
              <Grid container spacing={2}>
                {Object.entries(locPricing.diveInsurance || {}).map(([insuranceType, price]) => (
                  <Grid item xs={12} key={insuranceType}>
                    <TextField
                      label={insuranceType.replace(/_/g, ' ').toUpperCase()}
                      type="number"
                      value={price}
                      onChange={(e) => handleDiveInsurancePriceChange(insuranceType, e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: '€'
                      }}
                      helperText={
                        insuranceType === 'one_day' ? '1 day insurance' :
                        insuranceType === 'one_week' ? '1 week insurance' :
                        insuranceType === 'one_month' ? '1 month insurance' :
                        insuranceType === 'one_year' ? '1 year insurance' : ''
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Tax Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tax Settings" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="IGIC Rate"
                    type="number"
                    value={((locPricing.tax?.igic_rate || 0) * 100).toFixed(1)}
                    onChange={(e) => handleTaxRateChange(e.target.value)}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: '%'
                    }}
                    helperText="Spanish VAT rate (21% = 0.21)"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Tax Label"
                    value={locPricing.tax?.igic_label || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      prices: {
                        ...settings.prices,
                        tax: {
                          ...settings.prices.tax,
                          igic_label: e.target.value
                        }
                      }
                    })}
                    fullWidth
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading}
              size="large"
            >
              {loading ? 'Saving...' : 'Save All Prices'}
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Prices;
