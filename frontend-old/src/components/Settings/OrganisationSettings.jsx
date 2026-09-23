// Organisation tab of Settings - business name/contact details used on
// bills, reports, and the app header. Extracted from the former monolithic
// Settings.jsx (Phase 5.2) - self-contained like Prices.jsx/TenantManagement.jsx,
// loading/saving its own copy of the shared `settings` row.
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import dataService from '../../services/dataService';

const OrganisationSettings = () => {
  const [settings, setSettings] = useState({ organisation: {} });
  const [settingsId, setSettingsId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSettings().catch((err) => console.error('Error loading settings:', err));
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        const loadedSettings = savedSettings[0];
        setSettings((prev) => ({ ...prev, ...loadedSettings }));
        setSettingsId(loadedSettings.id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (settingsId) {
        await dataService.update('settings', settingsId, settings);
      } else {
        const newSettings = await dataService.create('settings', settings);
        setSettingsId(newSettings.id);
      }
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>Organisation</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Business name and contact details used on bills, reports, and the app header.
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Display name"
              value={settings.organisation?.name ?? ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                organisation: { ...(prev.organisation || {}), name: e.target.value }
              }))}
              placeholder="e.g. Deep Blue Diving"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Legal name (optional)"
              value={settings.organisation?.legalName ?? ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                organisation: { ...(prev.organisation || {}), legalName: e.target.value }
              }))}
              placeholder="Legal entity name"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              value={settings.organisation?.address ?? ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                organisation: { ...(prev.organisation || {}), address: e.target.value }
              }))}
              placeholder="Street, postal code, city, country"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Phone"
              value={settings.organisation?.phone ?? ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                organisation: { ...(prev.organisation || {}), phone: e.target.value }
              }))}
              placeholder="+34 928 163 712"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              value={settings.organisation?.email ?? ''}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                organisation: { ...(prev.organisation || {}), email: e.target.value }
              }))}
              placeholder="info@example.com"
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            Save organisation
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default OrganisationSettings;
