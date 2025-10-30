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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import dataService from '../services/dataService';

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

  const handleDiveTierChange = (index, field, value) => {
    const newTiers = [...settings.prices.diveTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        diveTiers: newTiers
      }
    });
  };

  const addDiveTier = () => {
    const newTier = {
      dives: settings.prices.diveTiers.length + 1,
      price: 30.00,
      description: `${settings.prices.diveTiers.length + 1} dives`
    };
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        diveTiers: [...settings.prices.diveTiers, newTier]
      }
    });
  };

  const removeDiveTier = (index) => {
    if (settings.prices.diveTiers.length > 1) {
      const newTiers = settings.prices.diveTiers.filter((_, i) => i !== index);
      setSettings({
        ...settings,
        prices: {
          ...settings.prices,
          diveTiers: newTiers
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Price Management
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage all pricing configurations for dives, equipment, and services.
      </Typography>

      <Grid container spacing={3}>
        {/* Dive Pricing Tiers */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Dive Pricing Tiers"
              subheader="Volume discounts based on total dives in a stay"
              action={
                <Button
                  startIcon={<AddIcon />}
                  onClick={addDiveTier}
                  variant="outlined"
                  size="small"
                >
                  Add Tier
                </Button>
              }
            />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Dives</TableCell>
                      <TableCell>Price per Dive</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settings.prices.diveTiers.map((tier, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            type="number"
                            value={tier.dives}
                            onChange={(e) => handleDiveTierChange(index, 'dives', parseInt(e.target.value) || 0)}
                            size="small"
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={tier.price}
                            onChange={(e) => handleDiveTierChange(index, 'price', parseFloat(e.target.value) || 0)}
                            size="small"
                            sx={{ width: 100 }}
                            InputProps={{
                              startAdornment: '€'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={tier.description}
                            onChange={(e) => handleDiveTierChange(index, 'description', e.target.value)}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            onClick={() => removeDiveTier(index)}
                            disabled={settings.prices.diveTiers.length === 1}
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
