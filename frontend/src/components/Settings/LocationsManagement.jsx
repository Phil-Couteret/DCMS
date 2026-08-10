// Locations tab of Settings - configure business locations (name, activity
// type, address, contact info). Extracted from the former monolithic
// Settings.jsx (Phase 5.2).
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Save as SaveIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';
import { getLocationTypes, getDisplayName, getTypeColor } from '../../utils/locationTypes';

const LocationsManagement = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({});
  const [locations, setLocations] = useState([]);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    type: '',
    address: { street: '', city: '', postalCode: '', country: '' },
    contactInfo: { phone: '', mobile: '', email: '', website: '' },
    isActive: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSettings().catch((err) => console.error('Error loading settings:', err));
    loadLocations().catch((err) => console.error('Error loading locations:', err));
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        const loadedSettings = savedSettings[0];
        const locationTypes = Array.isArray(loadedSettings.locationTypes) ? loadedSettings.locationTypes : [];
        setSettings((prev) => ({ ...prev, ...loadedSettings, locationTypes }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const allLocations = await dataService.getAll('locations') || [];
      const normalizedLocations = Array.isArray(allLocations)
        ? allLocations.map((loc) => ({
            ...loc,
            isActive: loc.isActive !== undefined ? loc.isActive : (loc.is_active !== undefined ? loc.is_active : true),
            contactInfo: loc.contactInfo || loc.contact_info || {},
          }))
        : [];
      setLocations(normalizedLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  const locationTypesList = getLocationTypes(settings);

  const handleSaveLocation = async () => {
    try {
      if (!locationFormData.name.trim()) {
        setSnackbar({ open: true, message: 'Location name is required', severity: 'error' });
        return;
      }

      const locationData = {
        name: locationFormData.name.trim(),
        type: locationFormData.type,
        address: locationFormData.address,
        contactInfo: locationFormData.contactInfo,
        isActive: locationFormData.isActive
      };

      if (editingLocation) {
        await dataService.update('locations', editingLocation.id, locationData);
        setSnackbar({ open: true, message: 'Location updated successfully!', severity: 'success' });
      } else {
        // createdAt is server-managed and isn't declared on CreateLocationDto -
        // sending it makes forbidNonWhitelisted reject the whole request.
        await dataService.create('locations', locationData);
        setSnackbar({ open: true, message: 'Location created successfully!', severity: 'success' });
      }

      setLocationDialogOpen(false);
      setEditingLocation(null);
      setLocationFormData({
        name: '',
        type: locationTypesList[0]?.id || '',
        address: { street: '', city: '', postalCode: '', country: '' },
        contactInfo: { phone: '', mobile: '', email: '', website: '' },
        isActive: true
      });
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      setSnackbar({ open: true, message: 'Error saving location', severity: 'error' });
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      await dataService.remove('locations', locationId);
      setSnackbar({ open: true, message: 'Location deleted successfully!', severity: 'success' });
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      setSnackbar({ open: true, message: 'Error deleting location', severity: 'error' });
    }
  };

  return (
    <Box>
      {isAdmin() && (() => {
        const configIds = new Set(locationTypesList.map((t) => t.id));
        const orphanIds = [...new Set(locations.map((l) => l.type).filter(Boolean))].filter((id) => !configIds.has(id));
        const locationTypeOptions = [
          ...locationTypesList,
          ...orphanIds.map((id) => ({ id, displayName: getDisplayName(settings, id), name: id })),
        ];
        return (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  Locations Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure location names and activity types. This is the initial setup for your business locations.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={locationTypesList.length === 0}
                onClick={() => {
                  setEditingLocation(null);
                  setLocationFormData({
                    name: '',
                    type: locationTypesList[0]?.id || '',
                    address: { street: '', city: '', postalCode: '', country: '' },
                    contactInfo: { phone: '', mobile: '', email: '', website: '' },
                    isActive: true
                  });
                  setLocationDialogOpen(true);
                }}
              >
                Add Location
              </Button>
            </Box>
            {locationTypesList.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Add at least one activity type in the <strong>Location Types</strong> tab before creating locations.
              </Alert>
            )}
            {locations.length === 0 ? (
              <Alert severity="info">
                {locationTypesList.length === 0
                  ? 'Add activity types first, then create your first location.'
                  : 'No locations configured. Click "Add Location" to create your first location.'}
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Location Name</strong></TableCell>
                      <TableCell><strong>Activity Type</strong></TableCell>
                      <TableCell><strong>Address</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell><strong>{location.name}</strong></TableCell>
                        <TableCell>
                          <Chip
                            label={getDisplayName(settings, location.type)}
                            color={getTypeColor(settings, location.type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {location.address?.street || location.address?.city
                            ? `${location.address?.street || ''}, ${location.address?.city || ''}`.trim()
                            : 'Not set'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={(location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)) ? 'Active' : 'Inactive'}
                            color={(location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)) ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingLocation(location);
                              setLocationFormData({
                                name: location.name || '',
                                type: location.type || (locationTypesList[0]?.id || ''),
                                address: location.address || {
                                  street: '',
                                  city: '',
                                  postalCode: '',
                                  country: ''
                                },
                                contactInfo: location.contactInfo || location.contact_info || {
                                  phone: '',
                                  mobile: '',
                                  email: '',
                                  website: ''
                                },
                                isActive: location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)
                              });
                              setLocationDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteLocation(location.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Location Dialog */}
          <Dialog
            open={locationDialogOpen}
            onClose={() => setLocationDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Location Name"
                    value={locationFormData.name}
                    onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                    required
                    helperText="Enter the name of this location (e.g., 'Caleta de Fuste', 'Las Playitas')"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required disabled={locationTypeOptions.length === 0}>
                    <InputLabel>Activity Type</InputLabel>
                    <Select
                      value={locationFormData.type}
                      onChange={(e) => setLocationFormData({ ...locationFormData, type: e.target.value })}
                      label="Activity Type"
                    >
                      {locationTypeOptions.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.displayName || t.name || t.id}</MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {locationTypeOptions.length === 0
                        ? 'Add activity types in the Location Types tab first.'
                        : 'Select the primary activity type for this location'}
                    </Typography>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Address Information
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    value={locationFormData.address.street}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      address: { ...locationFormData.address, street: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={locationFormData.address.city}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      address: { ...locationFormData.address, city: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Postal Code"
                    value={locationFormData.address.postalCode}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      address: { ...locationFormData.address, postalCode: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Country"
                    value={locationFormData.address.country}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      address: { ...locationFormData.address, country: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Contact Information
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={locationFormData.contactInfo.phone}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      contactInfo: { ...locationFormData.contactInfo, phone: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Mobile"
                    value={locationFormData.contactInfo.mobile}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      contactInfo: { ...locationFormData.contactInfo, mobile: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={locationFormData.contactInfo.email}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      contactInfo: { ...locationFormData.contactInfo, email: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Website"
                    value={locationFormData.contactInfo.website}
                    onChange={(e) => setLocationFormData({
                      ...locationFormData,
                      contactInfo: { ...locationFormData.contactInfo, website: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={locationFormData.isActive}
                        onChange={(e) => setLocationFormData({ ...locationFormData, isActive: e.target.checked })}
                      />
                    }
                    label="Active Location"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Inactive locations will be hidden from selection lists
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setLocationDialogOpen(false);
                setEditingLocation(null);
                setLocationFormData({
                  name: '',
                  type: locationTypesList[0]?.id || '',
                  address: { street: '', city: '', postalCode: '', country: '' },
                  contactInfo: { phone: '', mobile: '', email: '', website: '' },
                  isActive: true
                });
              }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveLocation}
              >
                {editingLocation ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      );
      })()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default LocationsManagement;
