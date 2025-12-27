import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControlLabel,
  Checkbox,
  Switch,
  Card,
  CardContent,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import { httpClient } from '../services/api/httpClient';
import dataService from '../services/dataService';
import { useAuth } from '../utils/authContext';

const Partners = () => {
  const { isAdmin } = useAuth();
  const [partners, setPartners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [newPartnerCredentials, setNewPartnerCredentials] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
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

  useEffect(() => {
    loadPartners();
    loadLocations();
  }, []);

  const loadPartners = async () => {
    try {
      const allPartners = await dataService.getAll('partners') || [];
      setPartners(Array.isArray(allPartners) ? allPartners : []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };

  const loadLocations = async () => {
    try {
      const allLocations = await dataService.getAll('locations') || [];
      setLocations(Array.isArray(allLocations) ? allLocations : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
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
        setSnackbar({
          open: true,
          message: 'Partner updated successfully!',
          severity: 'success'
        });
      } else {
        const created = await dataService.create('partners', partnerData);
        if (created.apiSecret) {
          setNewPartnerCredentials({
            apiKey: created.apiKey || created.api_key,
            apiSecret: created.apiSecret
          });
        }
        setSnackbar({
          open: true,
          message: 'Partner created successfully! Save the API credentials shown below.',
          severity: 'success'
        });
      }
      await loadPartners();
      if (!newPartnerCredentials) {
        setPartnerDialogOpen(false);
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error saving partner',
        severity: 'error'
      });
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      try {
        await dataService.remove('partners', partnerId);
        setSnackbar({
          open: true,
          message: 'Partner deleted successfully!',
          severity: 'success'
        });
        await loadPartners();
      } catch (error) {
        console.error('Error deleting partner:', error);
        setSnackbar({
          open: true,
          message: error.message || 'Error deleting partner',
          severity: 'error'
        });
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard!',
      severity: 'success'
    });
  };

  // Calculate statistics
  const totalPartners = partners.length;
  const activePartners = partners.filter(p => p.isActive !== false).length;
  const totalCommission = partners.reduce((sum, p) => {
    const rate = p.commissionRate || p.commission_rate || 0;
    return sum + (typeof rate === 'number' ? rate : parseFloat(rate || 0));
  }, 0);
  const avgCommissionRate = totalPartners > 0 ? (totalCommission / totalPartners * 100).toFixed(1) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Partners
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage partner accounts and API access
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPartners}
          >
            Refresh
          </Button>
          {isAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddPartner}
            >
              Add Partner
            </Button>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Partners
              </Typography>
              <Typography variant="h4">{totalPartners}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Active Partners
              </Typography>
              <Typography variant="h4">{activePartners}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Avg Commission Rate
              </Typography>
              <Typography variant="h4">{avgCommissionRate}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Partners Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>API Key</TableCell>
              <TableCell>Commission</TableCell>
              <TableCell>Locations</TableCell>
              <TableCell>Status</TableCell>
              {isAdmin() && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin() ? 8 : 7} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No partners found. Click "Add Partner" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              partners.map((partner) => {
                const allowedLocations = partner.allowedLocations || partner.allowed_locations || [];
                const apiKey = partner.apiKey || partner.api_key;
                return (
                  <TableRow key={partner.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {partner.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{partner.companyName || partner.company_name}</TableCell>
                    <TableCell>{partner.contactEmail || partner.contact_email}</TableCell>
                    <TableCell>
                      {apiKey ? (
                        <Tooltip title="Click to copy">
                          <Chip
                            label={apiKey.substring(0, 20) + '...'}
                            size="small"
                            onClick={() => copyToClipboard(apiKey)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">N/A</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {partner.commissionRate !== undefined && partner.commissionRate !== null
                        ? `${(parseFloat(partner.commissionRate || partner.commission_rate) * 100).toFixed(1)}%`
                        : 'Not set'}
                    </TableCell>
                    <TableCell>
                      {allowedLocations.length === 0 ? (
                        <Chip label="All Locations" size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {allowedLocations.length} location{allowedLocations.length !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={partner.isActive !== false ? 'Active' : 'Inactive'}
                        size="small"
                        color={partner.isActive !== false ? 'success' : 'default'}
                      />
                    </TableCell>
                    {isAdmin() && (
                      <TableCell align="right">
                        <Tooltip title="Show API Key">
                          <IconButton
                            size="small"
                            onClick={() => {
                              const apiKey = partner.apiKey || partner.api_key;
                              if (apiKey) {
                                copyToClipboard(apiKey);
                                setSnackbar({
                                  open: true,
                                  message: 'API Key copied to clipboard!',
                                  severity: 'success'
                                });
                              }
                            }}
                          >
                            <KeyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Regenerate API Key">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={async () => {
                              if (window.confirm(`Regenerate API key for ${partner.name}? The old key will be invalid. The new secret will only be shown once.`)) {
                                try {
                                  // Call regenerate endpoint directly
                                  const regenerated = await httpClient.post(`/partners/${partner.id}/regenerate-api-key`, {});
                                  if (regenerated.apiSecret) {
                                    setNewPartnerCredentials({
                                      apiKey: regenerated.apiKey || regenerated.api_key,
                                      apiSecret: regenerated.apiSecret
                                    });
                                    setEditingPartner(partner);
                                    setPartnerDialogOpen(true);
                                  }
                                  setSnackbar({
                                    open: true,
                                    message: 'API key regenerated! Save the new credentials.',
                                    severity: 'success'
                                  });
                                  await loadPartners();
                                } catch (error) {
                                  console.error('Error regenerating API key:', error);
                                  setSnackbar({
                                    open: true,
                                    message: error.message || 'Error regenerating API key',
                                    severity: 'error'
                                  });
                                }
                              }
                            }}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Partner">
                          <IconButton
                            size="small"
                            onClick={() => handleEditPartner(partner)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Partner">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePartner(partner.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Partner Dialog */}
      <Dialog
        open={partnerDialogOpen}
        onClose={() => {
          setPartnerDialogOpen(false);
          setNewPartnerCredentials(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPartner ? 'Edit Partner' : 'Add New Partner'}
        </DialogTitle>
        <DialogContent>
          {newPartnerCredentials ? (
            <Box sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Save these credentials now! The API secret will not be shown again.
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
                  label="Partner Name"
                  value={partnerFormData.name}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={partnerFormData.companyName}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, companyName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={partnerFormData.contactEmail}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactEmail: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={partnerFormData.contactPhone}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactPhone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook URL (optional)"
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default Partners;

