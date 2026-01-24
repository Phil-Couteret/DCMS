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
import { hasDivingFeatures } from '../../utils/locationTypes';

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
    loadSettings().catch(err => console.error('Error loading settings:', err));
    loadLocations().catch(err => console.error('Error loading locations:', err));
  }, []);

  // Initialize default settings based on Deep Blue Diving 2025 pricelist
  const getDefaultSettings = () => ({
    prices: {
      equipment: {
        complete_equipment: 13, // First 8 dives only
        Suit: 5,
        BCD: 5,
        Regulator: 5,
        Torch: 5,
        Computer: 3,
        UWCamera: 20
      },
      addons: {
        night_dive: 20,
        personal_instructor: 100
      },
      diveInsurance: {
        one_day: 7,
        one_week: 18,
        one_month: 25,
        one_year: 45
      },
      beverages: {
        price: 0 // Single price for all beverages
      },
      tax: {
        tax_name: 'IGIC',
        igic_rate: 0.07
      }
    }
  });

  const loadSettings = async () => {
    try {
      const settingsData = await dataService.getAll('settings') || [];
      if (settingsData && settingsData.length > 0) {
        const existingSettings = settingsData[0];
        // Merge with defaults to ensure all fields exist
        const defaultSettings = getDefaultSettings();
        const mergedSettings = {
          ...existingSettings,
          prices: {
            ...defaultSettings.prices,
            ...existingSettings.prices,
            equipment: {
              ...defaultSettings.prices.equipment,
              ...(existingSettings.prices?.equipment || {})
            },
            addons: {
              ...defaultSettings.prices.addons,
              ...(existingSettings.prices?.addons || {})
            },
            diveInsurance: {
              ...defaultSettings.prices.diveInsurance,
              ...(existingSettings.prices?.diveInsurance || {})
            },
            tax: {
              ...defaultSettings.prices.tax,
              ...(existingSettings.prices?.tax || {})
            }
          }
        };
        setSettings(mergedSettings);
      } else {
        // No settings exist, create default
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Initialize default pricing tiers based on Deep Blue Diving 2025 pricelist
  // For Caleta de Fuste: 46, 44, 42, 40, 38
  // For Las Playitas Caleta dives: 45, 43, 41, 39, 37
  const getDefaultDiveTiers = (isPlayitas = false) => {
    if (isPlayitas) {
      // Las Playitas Caleta dive pricing (from Playitas to Caleta)
      return [
        { dives: 1, price: 45, description: '1-2 dives' },
        { dives: 3, price: 43, description: '3-5 dives' },
        { dives: 6, price: 41, description: '6-8 dives' },
        { dives: 9, price: 39, description: '9-12 dives' },
        { dives: 13, price: 37, description: '13+ dives' }
      ];
    } else {
      // Caleta de Fuste pricing
      return [
        { dives: 1, price: 46, description: '1-2 dives' },
        { dives: 3, price: 44, description: '3-5 dives' },
        { dives: 6, price: 42, description: '6-8 dives' },
        { dives: 9, price: 40, description: '9-12 dives' },
        { dives: 13, price: 38, description: '13+ dives' }
      ];
    }
  };

  // Initialize default pricing if missing
  const initializeLocationPricing = (loc) => {
    const isPlayitas = loc.name === 'Las Playitas' || loc.id === 'playitas' || loc.id === '550e8400-e29b-41d4-a716-446655440002';
    
    if (!loc.pricing) {
      loc.pricing = {};
    }
    if (!loc.pricing.customerTypes) {
      loc.pricing.customerTypes = {};
    }
    if (!loc.pricing.customerTypes.tourist) {
      loc.pricing.customerTypes.tourist = {
        orientationDive: 32,
        discoverDive: 100,
        diveTiers: getDefaultDiveTiers(isPlayitas)
      };
      // Las Playitas specific: local dive price
      if (isPlayitas) {
        loc.pricing.customerTypes.tourist.pricePerDive = 35; // Playitas local dive price
      }
    } else {
      // Ensure dive tiers exist
      if (!loc.pricing.customerTypes.tourist.diveTiers || loc.pricing.customerTypes.tourist.diveTiers.length === 0) {
        loc.pricing.customerTypes.tourist.diveTiers = getDefaultDiveTiers(isPlayitas);
      }
      // Ensure orientation and discover prices exist
      if (!loc.pricing.customerTypes.tourist.orientationDive) {
        loc.pricing.customerTypes.tourist.orientationDive = 32;
      }
      if (!loc.pricing.customerTypes.tourist.discoverDive) {
        loc.pricing.customerTypes.tourist.discoverDive = 100;
      }
      // Las Playitas specific: ensure local dive price exists
      if (isPlayitas && !loc.pricing.customerTypes.tourist.pricePerDive) {
        loc.pricing.customerTypes.tourist.pricePerDive = 35;
      }
    }
    
    // Initialize addons for Las Playitas
    if (isPlayitas) {
      if (!loc.pricing.addons) {
        loc.pricing.addons = {};
      }
      // Transfer to Caleta: 15€ (from Las Playitas pricelist)
      if (loc.pricing.addons.transfer_to_caleta === undefined) {
        loc.pricing.addons.transfer_to_caleta = 15;
      }
      // Dive trip (Gran Tarajal, La Lajita): 45€ (from Las Playitas pricelist)
      if (loc.pricing.addons.dive_trip_gran_tarajal_lajita === undefined) {
        loc.pricing.addons.dive_trip_gran_tarajal_lajita = 45;
      }
    }
    
    // Initialize tax settings if missing
    if (!loc.pricing.tax) {
      loc.pricing.tax = {
        tax_name: 'IGIC',
        igic_rate: 0.07
      };
    }
    
    return loc;
  };

  const loadLocations = async () => {
    try {
      const locs = await dataService.getAll('locations') || [];
      if (!Array.isArray(locs)) return;
      
      // Handle pricing that might be in settings.pricing or directly in pricing
      // And initialize default pricing if missing
      const processedLocs = locs.map(loc => {
        if (loc.settings?.pricing && !loc.pricing) {
          return { ...loc, pricing: loc.settings.pricing };
        }
        return initializeLocationPricing(loc);
      });
      
      setLocations(processedLocs);
      const stored = localStorage.getItem('dcms_current_location');
      const initial = stored && processedLocs.find(l => l.id === stored) ? stored : (processedLocs[0]?.id || '');
      setSelectedLocationId(initial);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Persist selected location pricing changes
      if (selectedLocationId) {
        const loc = locations.find(l => l.id === selectedLocationId);
        if (loc && loc.pricing) {
          // Save pricing to location.settings.pricing (database format)
          const locationToSave = {
            ...loc,
            settings: {
              ...(loc.settings || {}),
              pricing: loc.pricing
            }
          };
          await dataService.update('locations', loc.id, locationToSave);
        }
      }
      
      // Persist settings changes (equipment prices, etc.)
      if (settings) {
        const existingSettings = await dataService.getAll('settings') || [];
        if (existingSettings && existingSettings.length > 0) {
          await dataService.update('settings', settings.id, settings);
        } else {
          await dataService.create('settings', settings);
        }
      }
      
      setSnackbar({
        open: true,
        message: 'Prices updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving prices:', error);
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
  
  // Check if selected location is Las Playitas
  const isPlayitas = selectedLocation && (selectedLocation.name === 'Las Playitas' || selectedLocation.id === 'playitas' || selectedLocation.id === '550e8400-e29b-41d4-a716-446655440002');
  
  // Check if selected location is bike rental
  const isBikeRental = selectedLocation ? !hasDivingFeatures(selectedLocation, settings) : false;

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
    // Default to highest tier + 1
    const maxDives = current.length > 0 ? Math.max(...current.map(t => t.dives)) : 0;
    const newTier = {
      dives: maxDives + 1,
      price: 38,
      description: `${maxDives + 1}+ dives`
    };
    const newTiers = [...current, newTier].sort((a, b) => a.dives - b.dives);
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

  // Addon prices are global across locations
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

  // Beverage price is global across locations (all beverages same price)
  const handleBeveragePriceChange = (value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        beverages: {
          price: parseFloat(value) || 0
        }
      }
    });
  };

  // Dive insurance prices are global across locations
  const handleDiveInsurancePriceChange = (insuranceType, value) => {
    setSettings({
      ...settings,
      prices: {
        ...settings.prices,
        diveInsurance: {
          ...settings.prices.diveInsurance,
          [insuranceType]: parseFloat(value) || 0
        }
      }
    });
  };

  // Tax settings are location-specific
  const handleTaxRateChange = (value) => {
    if (!selectedLocationId) return;
    updateLocationPricing((pricing) => ({
      ...pricing,
      tax: {
        ...(pricing.tax || { tax_name: 'IGIC', igic_rate: 0.07 }),
        igic_rate: (parseFloat(value) || 0) / 100
      }
    }));
  };

  const handleTaxNameChange = (value) => {
    if (!selectedLocationId) return;
    updateLocationPricing((pricing) => ({
      ...pricing,
      tax: {
        ...(pricing.tax || { tax_name: 'IGIC', igic_rate: 0.07 }),
        tax_name: value
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
        {/* Bike Rental Pricing */}
        {isBikeRental && (
          <>
            {/* Bike Rental Pricing - Street Bike & Gravel Bike */}
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Bike Rental Pricing"
                  subheader="Tiered pricing for bike rentals"
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {/* Street Bike */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="Street Bike" />
                        <CardContent>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Days</TableCell>
                                  <TableCell>Price</TableCell>
                                  <TableCell>Description</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(locPricing.bikeTypes?.street_bike?.rentalTiers || []).map((tier, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        value={tier.days}
                                        onChange={(e) => handleBikeTierChange('street_bike', index, 'days', parseInt(e.target.value) || 0)}
                                        size="small"
                                        sx={{ width: 80 }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        value={tier.price}
                                        onChange={(e) => handleBikeTierChange('street_bike', index, 'price', parseFloat(e.target.value) || 0)}
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
                                        onChange={(e) => handleBikeTierChange('street_bike', index, 'description', e.target.value)}
                                        size="small"
                                        fullWidth
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                    {/* Gravel Bike */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader title="Gravel Bike" />
                        <CardContent>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Days</TableCell>
                                  <TableCell>Price</TableCell>
                                  <TableCell>Description</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {(locPricing.bikeTypes?.gravel_bike?.rentalTiers || []).map((tier, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        value={tier.days}
                                        onChange={(e) => handleBikeTierChange('gravel_bike', index, 'days', parseInt(e.target.value) || 0)}
                                        size="small"
                                        sx={{ width: 80 }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <TextField
                                        type="number"
                                        value={tier.price}
                                        onChange={(e) => handleBikeTierChange('gravel_bike', index, 'price', parseFloat(e.target.value) || 0)}
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
                                        onChange={(e) => handleBikeTierChange('gravel_bike', index, 'description', e.target.value)}
                                        size="small"
                                        fullWidth
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Bike Rental Equipment Prices */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Bike Rental Equipment Prices" subheader="Charged once per rental" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Click Pedals"
                        type="number"
                        value={locPricing.equipment?.click_pedals || 0}
                        onChange={(e) => handleBikeEquipmentPriceChange('click_pedals', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Helmet"
                        type="number"
                        value={locPricing.equipment?.helmet || 0}
                        onChange={(e) => handleBikeEquipmentPriceChange('helmet', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="GPS Computer"
                        type="number"
                        value={locPricing.equipment?.gps_computer || 0}
                        onChange={(e) => handleBikeEquipmentPriceChange('gps_computer', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Bike Rental Insurance Prices */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Bike Rental Insurance Prices" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="1 Day"
                        type="number"
                        value={locPricing.insurance?.one_day || 0}
                        onChange={(e) => handleBikeInsurancePriceChange('one_day', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="1 Week"
                        type="number"
                        value={locPricing.insurance?.one_week || 0}
                        onChange={(e) => handleBikeInsurancePriceChange('one_week', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="1 Month"
                        type="number"
                        value={locPricing.insurance?.one_month || 0}
                        onChange={(e) => handleBikeInsurancePriceChange('one_month', e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                          startAdornment: '€'
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Diving-related pricing - Only show for diving locations */}
        {!isBikeRental && (
        <>
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
                      {/* Playitas Dive Price (fixed) - Only for Las Playitas */}
                      {isPlayitas && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                          <TextField
                            label="Playitas Dive Price (Fixed)"
                            type="number"
                            value={locPricing.customerTypes?.tourist?.pricePerDive || 35.00}
                            onChange={(e) => handleCustomerTypePriceChange('tourist', 'pricePerDive', parseFloat(e.target.value) || 0)}
                            fullWidth
                            size="small"
                            InputProps={{
                              startAdornment: '€'
                            }}
                            helperText="Fixed price for local Playitas dives (route: playitas_local)"
                          />
                        </Box>
                      )}
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
                      {/* Caleta Dive Pricing (Tiered) - Only show label for Las Playitas */}
                      {isPlayitas && (
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                          Caleta Dive Pricing (Tiered) - for dives from Playitas to Caleta:
                        </Typography>
                      )}
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
                                    disabled={(locPricing.customerTypes?.tourist?.diveTiers || []).length === 1}
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
                {Object.entries(settings.prices.addons || {}).map(([addon, price]) => (
                  <Grid item xs={12} key={addon}>
                    <TextField
                      label={addon.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())}
                      type="number"
                      value={price}
                      onChange={(e) => handleAddonPriceChange(addon, e.target.value)}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: '€'
                      }}
                      helperText={
                        addon === 'transfer_to_caleta' ? 'Transfer fee when booking Caleta dive from Playitas' :
                        addon === 'dive_trip_gran_tarajal_lajita' ? 'Dive trip to Gran Tarajal/La Lajita' :
                        addon === 'night_dive' ? 'Surcharge for night dive' : ''
                      }
                    />
                  </Grid>
                ))}
                {/* Add buttons to add missing addons for Las Playitas */}
                {isPlayitas && (
                  <>
                    {!settings.prices.addons?.transfer_to_caleta && (
                      <Grid item xs={12}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            handleAddonPriceChange('transfer_to_caleta', 15.00);
                          }}
                        >
                          Add Transfer to Caleta (15€)
                        </Button>
                      </Grid>
                    )}
                    {!settings.prices.addons?.dive_trip_gran_tarajal_lajita && (
                      <Grid item xs={12}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            handleAddonPriceChange('dive_trip_gran_tarajal_lajita', 45.00);
                          }}
                        >
                          Add Dive Trip Gran Tarajal/La Lajita (45€)
                        </Button>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Beverages */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Beverage Price" 
              subheader="Single price for all beverages"
            />
            <CardContent>
              <TextField
                label="Price per Beverage"
                type="number"
                value={settings.prices.beverages?.price || 0}
                onChange={(e) => handleBeveragePriceChange(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: '€'
                }}
                helperText="This price applies to all beverages (water, soda, beer, wine, coffee, etc.)"
              />
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
                {Object.entries(settings.prices.diveInsurance || {}).map(([insuranceType, price]) => (
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
                    label="Tax Name"
                    value={locPricing.tax?.tax_name || 'IGIC'}
                    onChange={(e) => handleTaxNameChange(e.target.value)}
                    fullWidth
                    size="small"
                    helperText="Tax name (e.g., IGIC, IVA, TVA, VAT)"
                    disabled={!selectedLocationId}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label={`${locPricing.tax?.tax_name || 'Tax'} Rate`}
                    type="number"
                    value={((locPricing.tax?.igic_rate || 0.07) * 100).toFixed(1)}
                    onChange={(e) => handleTaxRateChange(e.target.value)}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: '%'
                    }}
                    helperText={`${locPricing.tax?.tax_name || 'Tax'} rate (e.g., 7% = 0.07 for IGIC, 21% = 0.21 for IVA)`}
                    disabled={!selectedLocationId}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        </>
        )}

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
