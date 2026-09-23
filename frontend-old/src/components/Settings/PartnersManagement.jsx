// Partners tab of Settings - manage 3rd party partner accounts and API
// access. Extracted from the former monolithic Settings.jsx (Phase 5.2).
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  VpnKey as ApiKeyIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';
import { useTranslation } from '../../utils/languageContext';

const PartnersManagement = () => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    webhookUrl: '',
    commissionRate: null,
    allowedLocations: [],
    isActive: true
  });
  const [newPartnerCredentials, setNewPartnerCredentials] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadLocations().catch((err) => console.error('Error loading locations:', err));
    loadPartners().catch((err) => console.error('Error loading partners:', err));
  }, []);

  const loadLocations = async () => {
    try {
      const allLocations = await dataService.getAll('locations') || [];
      setLocations(Array.isArray(allLocations) ? allLocations : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  const loadPartners = async () => {
    try {
      const allPartners = await dataService.getAll('partners') || [];
      setPartners(Array.isArray(allPartners) ? allPartners : []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };

  const handleAddPartner = () => {
    setEditingPartner(null);
    setNewPartnerCredentials(null);
    setPartnerFormData({
      name: '',
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      webhookUrl: '',
      commissionRate: null,
      allowedLocations: [],
      isActive: true
    });
    setPartnerDialogOpen(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setNewPartnerCredentials(null);
    setPartnerFormData({
      name: partner.name || '',
      companyName: partner.companyName || partner.company_name || '',
      contactEmail: partner.contactEmail || partner.contact_email || '',
      contactPhone: partner.contactPhone || partner.contact_phone || '',
      webhookUrl: partner.webhookUrl || partner.webhook_url || '',
      commissionRate: partner.commissionRate !== undefined ? partner.commissionRate : (partner.commission_rate !== undefined ? parseFloat(partner.commission_rate) : null),
      allowedLocations: partner.allowedLocations || partner.allowed_locations || [],
      isActive: partner.isActive !== undefined ? partner.isActive : (partner.is_active !== undefined ? partner.is_active : true)
    });
    setPartnerDialogOpen(true);
  };

  const handleSavePartner = async () => {
    try {
      const partnerData = {
        ...partnerFormData,
        commissionRate: partnerFormData.commissionRate ? parseFloat(partnerFormData.commissionRate) : null
      };

      if (editingPartner) {
        await dataService.update('partners', editingPartner.id, partnerData);
        setSnackbar({ open: true, message: 'Partner updated successfully!', severity: 'success' });
      } else {
        const created = await dataService.create('partners', partnerData);
        if (created.apiSecret) {
          setNewPartnerCredentials({
            apiKey: created.apiKey || created.api_key,
            apiSecret: created.apiSecret
          });
        }
        setSnackbar({ open: true, message: 'Partner created successfully! Save the API credentials shown below.', severity: 'success' });
      }
      await loadPartners();
      if (!newPartnerCredentials) {
        setPartnerDialogOpen(false);
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      setSnackbar({ open: true, message: error.message || 'Error saving partner', severity: 'error' });
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      try {
        await dataService.remove('partners', partnerId);
        setSnackbar({ open: true, message: 'Partner deleted successfully!', severity: 'success' });
        await loadPartners();
      } catch (error) {
        console.error('Error deleting partner:', error);
        setSnackbar({ open: true, message: 'Error deleting partner', severity: 'error' });
      }
    }
  };

  const handleRegenerateApiKey = async (partnerId) => {
    if (window.confirm('Are you sure you want to regenerate the API key? The old key will no longer work.')) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3003/api'}/partners/${partnerId}/regenerate-api-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.apiSecret) {
          setNewPartnerCredentials({
            apiKey: data.apiKey || data.api_key,
            apiSecret: data.apiSecret
          });
          setSnackbar({ open: true, message: 'API key regenerated! Save the new credentials shown below.', severity: 'success' });
          await loadPartners();
        }
      } catch (error) {
        console.error('Error regenerating API key:', error);
        setSnackbar({ open: true, message: 'Error regenerating API key', severity: 'error' });
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'success' });
  };

  return (
    <Box>
      {/* Partner Dialog */}
      <Dialog
        open={partnerDialogOpen}
        onClose={() => {
          setPartnerDialogOpen(false);
          setNewPartnerCredentials(null);
        }}
        maxWidth="md"
        fullWidth
        keepMounted
        sx={{ zIndex: 1300 }}
        PaperProps={{ sx: { zIndex: 1300 } }}
      >
        <DialogTitle>
          {editingPartner ? t('partners.editPartner') : t('partners.addPartner')}
        </DialogTitle>
        <DialogContent>
          {newPartnerCredentials ? (
            <Box sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ {t('partners.saveCredentials')}
                </Typography>
                <Typography variant="body2">
                  Copy both the API Key and API Secret. The secret is only displayed once.
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={newPartnerCredentials.apiKey}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => copyToClipboard(newPartnerCredentials.apiKey)}>
                            <CopyIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Secret"
                    type="password"
                    value={newPartnerCredentials.apiSecret}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => copyToClipboard(newPartnerCredentials.apiSecret)}>
                            <CopyIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    helperText="This secret will only be shown once. Make sure to save it securely."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      setPartnerDialogOpen(false);
                      setNewPartnerCredentials(null);
                    }}
                  >
                    I've Saved the Credentials
                  </Button>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('partners.partnerName')}
                  value={partnerFormData.name}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('partners.companyName')}
                  value={partnerFormData.companyName}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, companyName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('partners.contactEmail')}
                  type="email"
                  value={partnerFormData.contactEmail}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactEmail: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('partners.contactPhone')}
                  value={partnerFormData.contactPhone}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactPhone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('partners.webhookUrl')}
                  value={partnerFormData.webhookUrl}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, webhookUrl: e.target.value })}
                  helperText="URL for receiving booking notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Commission Rate (%)"
                  type="number"
                  value={partnerFormData.commissionRate !== null && partnerFormData.commissionRate !== undefined
                    ? (parseFloat(partnerFormData.commissionRate) * 100)
                    : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPartnerFormData({
                      ...partnerFormData,
                      commissionRate: value && value !== '' ? parseFloat(value) / 100 : null
                    });
                  }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                  helperText="Enter as percentage (e.g., 10 for 10%)"
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Allowed Locations</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Select locations this partner can access. Leave empty to allow all locations.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={partnerFormData.allowedLocations.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPartnerFormData({ ...partnerFormData, allowedLocations: [] });
                        }
                      }}
                    />
                  }
                  label="All Locations"
                />
                {!partnerFormData.allowedLocations.length && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Partner will have access to all locations
                  </Alert>
                )}
                {locations.map((location) => (
                  <FormControlLabel
                    key={location.id}
                    control={
                      <Checkbox
                        checked={partnerFormData.allowedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPartnerFormData({
                              ...partnerFormData,
                              allowedLocations: [...partnerFormData.allowedLocations, location.id]
                            });
                          } else {
                            setPartnerFormData({
                              ...partnerFormData,
                              allowedLocations: partnerFormData.allowedLocations.filter(id => id !== location.id)
                            });
                          }
                        }}
                      />
                    }
                    label={location.name}
                  />
                ))}
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={partnerFormData.isActive}
                      onChange={(e) => setPartnerFormData({ ...partnerFormData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {!newPartnerCredentials && (
            <>
              <Button onClick={() => {
                setPartnerDialogOpen(false);
                setNewPartnerCredentials(null);
              }}>Cancel</Button>
              <Button
                onClick={handleSavePartner}
                variant="contained"
                disabled={!partnerFormData.name || !partnerFormData.companyName || !partnerFormData.contactEmail}
              >
                {editingPartner ? 'Update' : 'Create'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {isAdmin() && (
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              '&:before': { display: 'none' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <BusinessIcon color="primary" />
              <Box>
                <Typography variant="h6">Partner Accounts</Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage 3rd party partner accounts and API access
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Create and manage partner accounts for 3rd party integrations. Partners can create bookings and manage customers via the API.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddPartner}
                >
                  Add Partner
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Commission</TableCell>
                      <TableCell>Locations</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partners.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 2 }}>
                            No partners found. Click "Add Partner" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      partners.map((partner) => {
                        const allowedLocations = partner.allowedLocations || partner.allowed_locations || [];
                        return (
                          <TableRow key={partner.id}>
                            <TableCell>{partner.name}</TableCell>
                            <TableCell>{partner.companyName || partner.company_name}</TableCell>
                            <TableCell>{partner.contactEmail || partner.contact_email}</TableCell>
                            <TableCell>
                              {partner.commissionRate !== undefined && partner.commissionRate !== null
                                ? `${(parseFloat(partner.commissionRate) * 100).toFixed(1)}%`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {allowedLocations.length === 0 ? (
                                <Chip label="All" size="small" variant="outlined" />
                              ) : (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {allowedLocations.slice(0, 2).map((locId) => {
                                    const location = locations.find(l => l.id === locId);
                                    return (
                                      <Chip
                                        key={locId}
                                        label={location?.name || locId.substring(0, 8)}
                                        size="small"
                                        variant="outlined"
                                      />
                                    );
                                  })}
                                  {allowedLocations.length > 2 && (
                                    <Chip
                                      label={`+${allowedLocations.length - 2}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={partner.isActive !== false ? 'Active' : 'Inactive'}
                                color={partner.isActive !== false ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditPartner(partner)}
                                color="primary"
                                title="Edit"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleRegenerateApiKey(partner.id)}
                                color="secondary"
                                title="Regenerate API Key"
                              >
                                <ApiKeyIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeletePartner(partner.id)}
                                color="error"
                                title="Delete"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {!isAdmin() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You don't have permission to manage partners. Only administrators can access this section.
          </Typography>
        </Alert>
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

export default PartnersManagement;
