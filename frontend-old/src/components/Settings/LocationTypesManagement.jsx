// Location Types tab of Settings - define configurable activity types (e.g.
// Diving, Bike Rental) used when creating locations. Extracted from the
// former monolithic Settings.jsx (Phase 5.2).
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
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
  Checkbox,
  FormGroup,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';
import { getLocationTypes, isValidTypeId, FEATURE_KEYS, DEFAULT_FEATURES } from '../../utils/locationTypes';

const LocationTypesManagement = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({});
  const [settingsId, setSettingsId] = useState(null);
  const [locationTypeDialogOpen, setLocationTypeDialogOpen] = useState(false);
  const [editingLocationType, setEditingLocationType] = useState(null);
  const [locationTypeFormData, setLocationTypeFormData] = useState({
    id: '',
    name: '',
    displayName: '',
    icon: 'scuba_diving',
    color: 'primary',
    order: 0,
    isActive: true,
    features: {
      requiresBoats: false,
      requiresDiveSites: false,
      requiresCertifications: false,
      requiresMedicalClearance: false,
    },
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSettings().catch((err) => console.error('Error loading settings:', err));
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        const loadedSettings = savedSettings[0];
        const locationTypes = Array.isArray(loadedSettings.locationTypes) ? loadedSettings.locationTypes : [];
        setSettings((prev) => ({ ...prev, ...loadedSettings, locationTypes }));
        setSettingsId(loadedSettings.id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const locationTypesList = getLocationTypes(settings);

  const handleSaveLocationType = async () => {
    try {
      const displayName = (locationTypeFormData.displayName || locationTypeFormData.name || '').trim();
      if (!displayName) {
        setSnackbar({ open: true, message: 'Display name is required', severity: 'error' });
        return;
      }
      const rawId = (locationTypeFormData.id || '').trim().toLowerCase();
      if (!isValidTypeId(rawId)) {
        setSnackbar({
          open: true,
          message: 'Type ID must be a slug: lowercase, letters/numbers/underscores (e.g. snorkeling, kayak_rental)',
          severity: 'error',
        });
        return;
      }
      const typeId = rawId;
      const existingIds = locationTypesList.map((t) => t.id);
      if (!editingLocationType && existingIds.includes(typeId)) {
        setSnackbar({ open: true, message: `Type "${typeId}" already exists`, severity: 'error' });
        return;
      }

      const next = {
        ...locationTypeFormData,
        id: typeId,
        displayName: displayName || locationTypeFormData.name,
        name: displayName || locationTypeFormData.name,
      };

      let updated;
      if (editingLocationType) {
        updated = locationTypesList.map((t) =>
          t.id === editingLocationType.id ? { ...t, ...next, id: t.id } : t
        );
      } else {
        updated = [...locationTypesList, { ...next, order: locationTypesList.length }];
      }

      const nextSettings = { ...settings, locationTypes: updated };
      setSettings(nextSettings);
      if (settingsId) {
        await dataService.update('settings', settingsId, nextSettings);
      } else {
        const created = await dataService.create('settings', nextSettings);
        setSettingsId(created.id);
      }
      setSnackbar({
        open: true,
        message: editingLocationType ? 'Location type updated.' : 'Location type added.',
        severity: 'success',
      });
      setLocationTypeDialogOpen(false);
      setEditingLocationType(null);
      setLocationTypeFormData({
        id: '',
        name: '',
        displayName: '',
        icon: 'scuba_diving',
        color: 'primary',
        order: 0,
        isActive: true,
        features: { requiresBoats: false, requiresDiveSites: false, requiresCertifications: false, requiresMedicalClearance: false },
      });
    } catch (e) {
      console.error('Error saving location type:', e);
      setSnackbar({ open: true, message: 'Error saving location type', severity: 'error' });
    }
  };

  const handleDeleteLocationType = async (typeId) => {
    if (!window.confirm('Remove this location type? Locations using it will keep the type id but lose custom display/features until you re-add it.')) return;
    const updated = locationTypesList.filter((t) => t.id !== typeId);
    const nextSettings = { ...settings, locationTypes: updated };
    setSettings(nextSettings);
    setLocationTypeDialogOpen(false);
    setEditingLocationType(null);
    if (!settingsId) {
      setSnackbar({ open: true, message: 'Location type removed (save settings to persist).', severity: 'info' });
      return;
    }
    try {
      await dataService.update('settings', settingsId, nextSettings);
      setSnackbar({ open: true, message: 'Location type removed.', severity: 'success' });
    } catch (err) {
      console.error('Error removing location type:', err);
      setSnackbar({ open: true, message: 'Error removing location type', severity: 'error' });
    }
  };

  return (
    <Box>
      {isAdmin() && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  Location Types
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Define activity types (e.g. Diving, Bike Rental). Used when creating locations. Start from scratch—add types as needed.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingLocationType(null);
                  setLocationTypeFormData({
                    id: '',
                    name: '',
                    displayName: '',
                    icon: 'scuba_diving',
                    color: 'primary',
                    order: locationTypesList.length,
                    isActive: true,
                    features: { requiresBoats: false, requiresDiveSites: false, requiresCertifications: false, requiresMedicalClearance: false },
                  });
                  setLocationTypeDialogOpen(true);
                }}
              >
                Add type
              </Button>
            </Box>
            {locationTypesList.length === 0 ? (
              <Alert severity="info">
                No location types configured. Add types (e.g. Diving, Bike Rental) to use when creating locations.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>ID</strong></TableCell>
                      <TableCell><strong>Display name</strong></TableCell>
                      <TableCell><strong>Features</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell align="right"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {locationTypesList.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell><code>{t.id}</code></TableCell>
                        <TableCell>{t.displayName || t.name || t.id}</TableCell>
                        <TableCell>
                          {FEATURE_KEYS.filter((k) => t.features?.[k]).map((k) => (
                            <Chip key={k} label={k.replace(/^requires/, '')} size="small" sx={{ mr: 0.5, mb: 0.5 }} variant="outlined" />
                          ))}
                          {(!t.features || FEATURE_KEYS.every((k) => !t.features?.[k])) && (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.isActive !== false ? 'Active' : 'Inactive'}
                            size="small"
                            color={t.isActive !== false ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingLocationType(t);
                              setLocationTypeFormData({
                                id: t.id,
                                name: t.name || '',
                                displayName: t.displayName || t.name || '',
                                icon: t.icon || 'scuba_diving',
                                color: t.color || 'primary',
                                order: t.order ?? 0,
                                isActive: t.isActive !== false,
                                features: { ...(DEFAULT_FEATURES[t.id] || {}), ...(t.features || {}) },
                              });
                              setLocationTypeDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteLocationType(t.id)}>
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
          <Dialog open={locationTypeDialogOpen} onClose={() => { setLocationTypeDialogOpen(false); setEditingLocationType(null); }} maxWidth="sm" fullWidth>
            <DialogTitle>{editingLocationType ? 'Edit location type' : 'Add location type'}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Type ID"
                    value={locationTypeFormData.id}
                    onChange={(e) => setLocationTypeFormData({
                      ...locationTypeFormData,
                      id: e.target.value.trim().toLowerCase(),
                    })}
                    placeholder="e.g. diving, bike_rental, surf, kite_surf, wing_foil"
                    disabled={!!editingLocationType}
                    helperText={editingLocationType ? 'Cannot change after create' : 'Slug: lowercase, letters, numbers, underscores'}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Display name"
                    value={locationTypeFormData.displayName}
                    onChange={(e) => setLocationTypeFormData({ ...locationTypeFormData, displayName: e.target.value, name: e.target.value })}
                    placeholder="e.g. Diving, Bike Rental"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Color</InputLabel>
                    <Select
                      value={locationTypeFormData.color}
                      onChange={(e) => setLocationTypeFormData({ ...locationTypeFormData, color: e.target.value })}
                      label="Color"
                    >
                      <MenuItem value="primary">Primary</MenuItem>
                      <MenuItem value="secondary">Secondary</MenuItem>
                      <MenuItem value="default">Default</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Order"
                    value={locationTypeFormData.order}
                    onChange={(e) => setLocationTypeFormData({ ...locationTypeFormData, order: parseInt(e.target.value, 10) || 0 })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={locationTypeFormData.isActive}
                        onChange={(e) => setLocationTypeFormData({ ...locationTypeFormData, isActive: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Features</Typography>
                  <FormGroup row>
                    {FEATURE_KEYS.map((k) => (
                      <FormControlLabel
                        key={k}
                        control={
                          <Checkbox
                            checked={!!locationTypeFormData.features?.[k]}
                            onChange={(e) => setLocationTypeFormData({
                              ...locationTypeFormData,
                              features: { ...locationTypeFormData.features, [k]: e.target.checked },
                            })}
                          />
                        }
                        label={k.replace(/^requires/, '').replace(/([A-Z])/g, ' $1').trim()}
                      />
                    ))}
                  </FormGroup>
                  <Typography variant="caption" color="text.secondary">
                    e.g. Requires dive sites → diving-only UI (schedule, boat-prep, stays)
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setLocationTypeDialogOpen(false); setEditingLocationType(null); }}>Cancel</Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveLocationType}>
                {editingLocationType ? 'Update' : 'Add'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default LocationTypesManagement;
