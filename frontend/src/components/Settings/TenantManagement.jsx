import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Link as LinkIcon, Storage as StorageIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import dataService from '../../services/dataService';
import { httpClient } from '../../services/api/httpClient';
import { API_CONFIG } from '../../config/apiConfig';

/** Slugify company name for URL */
function slugify(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'tenant';
}

/** Base admin host (e.g. admin.couteret.fr) - derive from current origin */
function getAdminHost() {
  if (typeof window === 'undefined') return 'admin.couteret.fr';
  const host = window.location.hostname;
  // If we're on deepblue.admin.couteret.fr, base is admin.couteret.fr
  const m = host.match(/\.(admin\.couteret\.fr)$/i) || host.match(/^(admin)\./);
  if (m) return host.includes('.') ? host.replace(/^[^.]+\./, 'admin.') : 'admin.couteret.fr';
  return host.includes('localhost') ? 'admin.couteret.fr' : `admin.${host}`;
}

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [platformMetrics, setPlatformMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    numberOfLocations: 1,
    locationType: 'diving',
    domain: '',
    quotas: { locations: 20, dive_sites: 15, boats: 10, users: 20, customers: 500, storage_gb: 5, storage_price_per_gb_per_month: 0 },
  });

  const adminHost = getAdminHost();

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenantsData, metricsData] = await Promise.all([
        dataService.getAll('tenants'),
        httpClient.get('/tenants/platform/metrics').catch(() => null),
      ]);
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
      setPlatformMetrics(metricsData?.data || metricsData || null);
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError(err.message || 'Failed to load tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleNameChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingTenant ? prev.slug : slugify(name),
    }));
  };

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      slug: '',
      numberOfLocations: 1,
      locationType: 'diving',
      domain: '',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    const quotas = tenant.quotas || tenant.settings?.quotas || {};
    setFormData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      numberOfLocations: (tenant.locations && tenant.locations.length) || (tenant._count?.locations) || 1,
      locationType: 'diving',
      domain: tenant.domain || '',
      quotas: {
        locations: quotas.locations ?? 20,
        dive_sites: quotas.dive_sites ?? 15,
        boats: quotas.boats ?? 10,
        users: quotas.users ?? 20,
        customers: quotas.customers ?? 500,
        storage_gb: quotas.storage_gb ?? 5,
        storage_price_per_gb_per_month: quotas.storage_price_per_gb_per_month ?? 0,
      },
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (editingTenant) {
        const existingSettings = (editingTenant.settings && typeof editingTenant.settings === 'object') ? editingTenant.settings : {};
        await dataService.update('tenants', editingTenant.id, {
          name: formData.name,
          slug: formData.slug || slugify(formData.name),
          domain: formData.domain || null,
          settings: { ...existingSettings, quotas: formData.quotas },
        });
      } else {
        await dataService.create('tenants', {
          name: formData.name,
          slug: formData.slug || slugify(formData.name),
          numberOfLocations: Math.max(1, Math.min(20, formData.numberOfLocations || 1)),
          locationType: formData.locationType || 'diving',
          domain: formData.domain || null,
        });
      }
      setDialogOpen(false);
      loadTenants();
    } catch (err) {
      setError(err.message || 'Failed to save tenant');
    }
  };

  const handleDelete = async (tenant) => {
    if (!window.confirm(`Deactivate tenant "${tenant.name}"? Their data will be preserved but they won't appear in the list.`)) return;
    try {
      setError(null);
      await dataService.remove('tenants', tenant.id);
      loadTenants();
    } catch (err) {
      setError(err.message || 'Failed to delete tenant');
    }
  };

  const getTenantUrl = (slug) => {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    return `${protocol}//${slug}.${adminHost}`;
  };

  const UsageBar = ({ used, authorized }) => {
    const pct = authorized > 0 ? Math.min(100, (used / authorized) * 100) : 0;
    const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'primary';
    return (
      <Tooltip title={`${used} / ${authorized}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 80 }}>
          <LinearProgress variant="determinate" value={pct} color={color} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
          <Typography variant="caption">{used}/{authorized}</Typography>
        </Box>
      </Tooltip>
    );
  };

  const StorageBar = ({ storage }) => {
    if (!storage) return <Typography variant="caption">-</Typography>;
    const usedBytes = storage.usedBytes ?? 0;
    const authBytes = storage.authorizedBytes ?? 1;
    const pct = authBytes > 0 ? Math.min(100, (usedBytes / authBytes) * 100) : 0;
    const color = pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'primary';
    const usedStr = storage.usedGB >= 0.001 ? `${storage.usedGB.toFixed(2)} GB` : `${storage.usedMB.toFixed(0)} MB`;
    const authStr = `${storage.authorizedGB} GB`;
    return (
      <Tooltip title={`${usedStr} / ${authStr}${storage.pricePerGbPerMonth ? ` · €${storage.pricePerGbPerMonth}/GB/mo` : ''}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
          <LinearProgress variant="determinate" value={pct} color={color} sx={{ flex: 1, height: 6, borderRadius: 1 }} />
          <Typography variant="caption">{usedStr}/{authStr}</Typography>
        </Box>
      </Tooltip>
    );
  };

  if (loading) return <Typography>Loading tenants...</Typography>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Tenant Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
          Add Tenant
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Platform metrics */}
      {platformMetrics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Platform overview
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StorageIcon color="action" />
                <Typography variant="body2">Storage: <strong>{platformMetrics.storage?.usedMB ?? 0} MB</strong></Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="action" />
                <Typography variant="body2">Tenants: <strong>{platformMetrics.tenants ?? 0}</strong></Typography>
              </Box>
              <Typography variant="body2">Customers: <strong>{platformMetrics.totalCustomers ?? 0}</strong></Typography>
              <Typography variant="body2">Bookings: <strong>{platformMetrics.totalBookings ?? 0}</strong></Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each tenant is a dive center or bike rental company. Access URL: <strong>{`{slug}.${adminHost}`}</strong>
      </Typography>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Locations</TableCell>
              <TableCell>Dive Sites</TableCell>
              <TableCell>Boats</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Customers</TableCell>
              <TableCell>Storage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  No tenants yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => {
                const u = t.usage || {};
                return (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>
                    <Chip label={t.slug} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <a href={getTenantUrl(t.slug)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <LinkIcon fontSize="small" />
                      {t.slug}.{adminHost}
                    </a>
                  </TableCell>
                  <TableCell><UsageBar used={u.locations?.used ?? 0} authorized={u.locations?.authorized ?? 0} /></TableCell>
                  <TableCell><UsageBar used={u.dive_sites?.used ?? 0} authorized={u.dive_sites?.authorized ?? 0} /></TableCell>
                  <TableCell><UsageBar used={u.boats?.used ?? 0} authorized={u.boats?.authorized ?? 0} /></TableCell>
                  <TableCell><UsageBar used={u.users?.used ?? 0} authorized={u.users?.authorized ?? 0} /></TableCell>
                  <TableCell><UsageBar used={u.customers?.used ?? 0} authorized={u.customers?.authorized ?? 0} /></TableCell>
                  <TableCell><StorageBar storage={u.storage} /></TableCell>
                  <TableCell>
                    <Chip label={t.is_active !== false ? 'Active' : 'Inactive'} size="small" color={t.is_active !== false ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenEdit(t)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {t.is_active !== false ? (
                      <IconButton size="small" color="error" onClick={() => handleDelete(t)} title="Deactivate">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ); })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Company name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Deep Blue Diving"
              fullWidth
              required
            />
            <TextField
              label="URL slug"
              value={formData.slug}
              onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
              placeholder="e.g. deep-blue-diving"
              helperText={`URL: ${formData.slug || slugify(formData.name) || 'slug'}.${adminHost}`}
              fullWidth
              disabled={!!editingTenant}
            />
            {!editingTenant && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Number of locations</InputLabel>
                  <Select
                    value={formData.numberOfLocations}
                    label="Number of locations"
                    onChange={(e) => setFormData((p) => ({ ...p, numberOfLocations: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Location type</InputLabel>
                  <Select
                    value={formData.locationType}
                    label="Location type"
                    onChange={(e) => setFormData((p) => ({ ...p, locationType: e.target.value }))}
                  >
                    <MenuItem value="diving">Diving center</MenuItem>
                    <MenuItem value="bike_rental">Bike rental</MenuItem>
                    <MenuItem value="surf">Surf</MenuItem>
                    <MenuItem value="kite_surf">Kite Surf</MenuItem>
                    <MenuItem value="wing_foil">Wing Foil</MenuItem>
                    <MenuItem value="windsurf">Windsurf</MenuItem>
                    <MenuItem value="stand_up_paddle">Stand Up Paddle</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            <TextField
              label="Custom domain (optional)"
              value={formData.domain}
              onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
              placeholder="e.g. deepbluediving.com"
              fullWidth
            />
            {editingTenant && (
              <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" gutterBottom>Authorized limits (quotas)</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {[
                    { key: 'locations', label: 'Locations' },
                    { key: 'dive_sites', label: 'Dive Sites' },
                    { key: 'boats', label: 'Boats' },
                    { key: 'users', label: 'Users' },
                    { key: 'customers', label: 'Customers' },
                    { key: 'storage_gb', label: 'Storage (GB)' },
                    { key: 'storage_price_per_gb_per_month', label: '€/GB/month' },
                  ].map(({ key, label }) => (
                    <TextField
                      key={key}
                      label={label}
                      type="number"
                      size="small"
                      value={formData.quotas?.[key] ?? ''}
                      onChange={(e) => {
                        const v = key.includes('price') ? parseFloat(e.target.value) || 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                        setFormData((p) => ({
                          ...p,
                          quotas: { ...(p.quotas || {}), [key]: v },
                        }));
                      }}
                      inputProps={{ min: 0, step: key.includes('price') ? 0.01 : 1 }}
                      helperText={key === 'storage_price_per_gb_per_month' ? 'Off-season billing per GB/month' : undefined}
                      sx={{ width: key.includes('price') ? 130 : 100 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formData.name.trim()}>
            {editingTenant ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantManagement;
