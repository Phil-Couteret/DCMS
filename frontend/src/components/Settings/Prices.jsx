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
  Snackbar
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import dataService from '../../services/dataService';

const Prices = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const settingsData = dataService.getAll('settings')[0];
    setSettings(settingsData);
  };

  const handleSave = () => {
    setLoading(true);
    try {
      dataService.update('settings', settings.id, settings);
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

  const handleCustomerTypePriceChange = (customerType, field, value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        customerTypes: {
          ...settings.prices.customerTypes,
          [customerType]: {
            ...settings.prices.customerTypes[customerType],
            [field]: value
          }
        }
      }
    });
  };

  const handleTouristTierChange = (index, field, value) => {
    const newTiers = [...settings.prices.customerTypes.tourist.diveTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        customerTypes: {
          ...settings.prices.customerTypes,
          tourist: {
            ...settings.prices.customerTypes.tourist,
            diveTiers: newTiers
          }
        }
      }
    });
  };

  const addTouristTier = () => {
    const newTier = {
      dives: settings.prices.customerTypes.tourist.diveTiers.length + 1,
      price: 30.00,
      description: `${settings.prices.customerTypes.tourist.diveTiers.length + 1} dives`
    };
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        customerTypes: {
          ...settings.prices.customerTypes,
          tourist: {
            ...settings.prices.customerTypes.tourist,
            diveTiers: [...settings.prices.customerTypes.tourist.diveTiers, newTier]
          }
        }
      }
    });
  };

  const removeTouristTier = (index) => {
    if (settings.prices.customerTypes.tourist.diveTiers.length > 1) {
      const newTiers = settings.prices.customerTypes.tourist.diveTiers.filter((_, i) => i !== index);
      setSettings({
        ...settings,
        prices: {
          ...settings.prices,
          customerTypes: {
            ...settings.prices.customerTypes,
            tourist: {
              ...settings.prices.customerTypes.tourist,
              diveTiers: newTiers
            }
          }
        }
      });
    }
  };

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
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        addons: {
          ...settings.prices.addons,
          [addon]: parseFloat(value) || 0
        }
      }
    });
  };

  const handleBeveragePriceChange = (beverage, value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        beverages: {
          ...settings.prices.beverages,
          [beverage]: parseFloat(value) || 0
        }
      }
    });
  };

  const handleTaxRateChange = (value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        tax: {
          ...settings.prices.tax,
          iva_rate: parseFloat(value) || 0
        }
      }
    });
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
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Dives</TableCell>
                              <TableCell>Price</TableCell>
                              <TableCell>Description</TableCell>
                              <TableCell align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {settings.prices.customerTypes.tourist.diveTiers.map((tier, index) => (
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
                            value={settings.prices.customerTypes.local.pricePerDive}
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
                            value={settings.prices.customerTypes.recurrent.pricePerDive}
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
                {Object.entries(settings.prices.equipment).map(([equipment, price]) => (
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
                {Object.entries(settings.prices.addons).map(([addon, price]) => (
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
                {Object.entries(settings.prices.beverages).map(([beverage, price]) => (
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

        {/* Tax Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tax Settings" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="IVA Rate"
                    type="number"
                    value={settings.prices.tax.iva_rate}
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
                    value={settings.prices.tax.iva_label}
                    onChange={(e) => setSettings({
                      ...settings,
                      prices: {
                        ...settings.prices,
                        tax: {
                          ...settings.prices.tax,
                          iva_label: e.target.value
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
