// Dive Sites tab of Settings - configure dive sites, difficulty levels, and
// per-location compliance-report toggles. Extracted from the former
// monolithic Settings.jsx (Phase 5.2).
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';
import { hasDivingFeatures } from '../../utils/locationTypes';

const DiveSitesManagement = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState({});
  const [locations, setLocations] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [diveSiteDialogOpen, setDiveSiteDialogOpen] = useState(false);
  const [editingDiveSite, setEditingDiveSite] = useState(null);
  const [diveSiteFormData, setDiveSiteFormData] = useState({
    name: '',
    locationId: '',
    type: 'diving',
    depthRange: { min: 0, max: 0 },
    difficultyLevel: 'beginner',
    current: '',
    waves: '',
    travelTime: '',
    description: '',
    reef: '',
    isActive: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSettings().catch((err) => console.error('Error loading settings:', err));
    loadLocations().catch((err) => console.error('Error loading locations:', err));
    loadDiveSites().catch((err) => console.error('Error loading dive sites:', err));
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        setSettings((prev) => ({ ...prev, ...savedSettings[0] }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
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

  const loadDiveSites = async () => {
    try {
      const allDiveSites = await dataService.getAll('diveSites') || [];
      setDiveSites(Array.isArray(allDiveSites) ? allDiveSites : []);
    } catch (error) {
      console.error('Error loading dive sites:', error);
      setDiveSites([]);
    }
  };

  return (
    <Box>
      {isAdmin() && (
        <>
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
                <LocationIcon color="primary" />
                <Box>
                  <Typography variant="h6">Dive Sites</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure dive sites, difficulty levels, and site information
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Manage all dive sites for each location. Configure difficulty levels, depth ranges, and site descriptions.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingDiveSite(null);
                      setDiveSiteFormData({
                        name: '',
                        locationId: locations.length > 0 ? locations[0].id : '',
                        type: 'diving',
                        depthRange: { min: 0, max: 0 },
                        difficultyLevel: 'beginner',
                        current: '',
                        waves: '',
                        travelTime: '',
                        description: '',
                        reef: '',
                        isActive: true
                      });
                      setDiveSiteDialogOpen(true);
                    }}
                  >
                    Add Dive Site
                  </Button>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Compliance Reports Settings (per Location)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enable compliance reports for diving locations in natural reserves. When enabled, the Compliance Reports tab will appear in Dive Preparation.
                  </Typography>
                  {locations.filter(loc => hasDivingFeatures(loc, settings)).length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Location</strong></TableCell>
                            <TableCell align="right"><strong>Compliance Reports Mandatory</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {locations.filter(loc => hasDivingFeatures(loc, settings)).map((location) => {
                            const locationSettings = location.settings || {};
                            const isEnabled = locationSettings.complianceReportsMandatory || false;
                            return (
                              <TableRow key={location.id}>
                                <TableCell>{location.name}</TableCell>
                                <TableCell align="right">
                                  <Switch
                                    checked={isEnabled}
                                    onChange={async (e) => {
                                      const newValue = e.target.checked;
                                      const updatedSettings = {
                                        ...locationSettings,
                                        complianceReportsMandatory: newValue
                                      };
                                      try {
                                        await dataService.update('locations', location.id, {
                                          settings: updatedSettings
                                        });
                                        setLocations(prev => prev.map(loc =>
                                          loc.id === location.id
                                            ? { ...loc, settings: updatedSettings }
                                            : loc
                                        ));
                                        setSnackbar({
                                          open: true,
                                          message: `Compliance reports setting updated for ${location.name}`,
                                          severity: 'success'
                                        });
                                      } catch (error) {
                                        console.error('Error saving location setting:', error);
                                        setSnackbar({
                                          open: true,
                                          message: 'Error saving setting',
                                          severity: 'error'
                                        });
                                      }
                                    }}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No diving locations found
                    </Typography>
                  )}
                </Box>

                {diveSites.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography color="text.secondary" align="center">
                      No dive sites found. Click "Add Dive Site" to create one.
                    </Typography>
                  </Paper>
                ) : (() => {
                  // Group dive sites by reef
                  const reefOrder = ['Castillo Reef', 'Salinas Reef'];
                  const groupedByReef = diveSites.reduce((acc, site) => {
                    let reef = site.conditions?.reef || 'Other';
                    if (!reefOrder.includes(reef)) {
                      reef = 'Other';
                    }
                    if (!acc[reef]) {
                      acc[reef] = [];
                    }
                    acc[reef].push(site);
                    return acc;
                  }, {});

                  const sortedReefs = Object.entries(groupedByReef).sort(([a], [b]) => {
                    const aIndex = reefOrder.indexOf(a);
                    const bIndex = reefOrder.indexOf(b);
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex;
                    }
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return 0;
                  });

                  return sortedReefs.map(([reef, sites]) => (
                    <Accordion key={reef} defaultExpanded={reefOrder.includes(reef)} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {reef} ({sites.length} {sites.length === 1 ? 'site' : 'sites'})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell>Depth Range</TableCell>
                              <TableCell>Difficulty Level</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {sites.map((site) => {
                              const difficulty = site.difficultyLevel || site.difficulty || 'beginner';
                              const depthRange = site.depthRange || (site.depth ? { min: 0, max: 0 } : { min: 0, max: 0 });
                              const depthDisplay = depthRange.min && depthRange.max
                                ? `${depthRange.min}-${depthRange.max}m`
                                : site.depth || 'N/A';

                              return (
                                <TableRow key={site.id}>
                                  <TableCell><strong>{site.name}</strong></TableCell>
                                  <TableCell>{depthDisplay}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={difficulty}
                                      size="small"
                                      color={
                                        difficulty === 'beginner' ? 'success' :
                                        difficulty === 'intermediate' ? 'info' :
                                        difficulty === 'advanced' ? 'warning' :
                                        'error'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={site.isActive !== false ? 'Active' : 'Inactive'}
                                      size="small"
                                      color={site.isActive !== false ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingDiveSite(site);
                                        setDiveSiteFormData({
                                          name: site.name || '',
                                          locationId: site.locationId || (locations.length > 0 ? locations[0].id : ''),
                                          type: site.type || 'diving',
                                          depthRange: site.depthRange || (site.depth ? { min: 0, max: 0 } : { min: 0, max: 0 }),
                                          difficultyLevel: difficulty,
                                          current: site.conditions?.current || site.current || '',
                                          waves: site.conditions?.waves || site.waves || '',
                                          travelTime: site.conditions?.travelTime || site.travelTime || '',
                                          description: site.conditions?.description || site.description || '',
                                          isActive: site.isActive !== false
                                        });
                                        setDiveSiteDialogOpen(true);
                                      }}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${site.name}"?`)) {
                                          dataService.remove('diveSites', site.id);
                                          loadDiveSites();
                                          setSnackbar({
                                            open: true,
                                            message: 'Dive site deleted successfully!',
                                            severity: 'success'
                                          });
                                        }
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  ))
                })()}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Dive Site Dialog */}
          <Dialog
            open={diveSiteDialogOpen}
            onClose={() => setDiveSiteDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editingDiveSite ? 'Edit Dive Site' : 'Add Dive Site'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dive Site Name"
                    value={diveSiteFormData.name}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={diveSiteFormData.locationId}
                      onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, locationId: e.target.value })}
                      label="Location"
                    >
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={diveSiteFormData.type}
                      onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, type: e.target.value })}
                      label="Type"
                    >
                      <MenuItem value="diving">Diving</MenuItem>
                      <MenuItem value="beach">Beach</MenuItem>
                      <MenuItem value="cave">Cave</MenuItem>
                      <MenuItem value="reef">Reef</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Difficulty Level</InputLabel>
                    <Select
                      value={diveSiteFormData.difficultyLevel}
                      onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, difficultyLevel: e.target.value })}
                      label="Difficulty Level"
                    >
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                      <MenuItem value="expert">Expert</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Min Depth (meters)"
                    type="number"
                    value={diveSiteFormData.depthRange.min}
                    onChange={(e) => setDiveSiteFormData({
                      ...diveSiteFormData,
                      depthRange: { ...diveSiteFormData.depthRange, min: parseInt(e.target.value) || 0 }
                    })}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Depth (meters)"
                    type="number"
                    value={diveSiteFormData.depthRange.max}
                    onChange={(e) => setDiveSiteFormData({
                      ...diveSiteFormData,
                      depthRange: { ...diveSiteFormData.depthRange, max: parseInt(e.target.value) || 0 }
                    })}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Current"
                    value={diveSiteFormData.current}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, current: e.target.value })}
                    placeholder="e.g., little-medium, moderate, strong"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Waves"
                    value={diveSiteFormData.waves}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, waves: e.target.value })}
                    placeholder="e.g., protected, unprotected, low, medium"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Travel Time"
                    value={diveSiteFormData.travelTime}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, travelTime: e.target.value })}
                    placeholder="e.g., 5-10 min, 15-20 min"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={diveSiteFormData.isActive}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, isActive: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Reef / Area"
                    value={diveSiteFormData.reef}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, reef: e.target.value })}
                    placeholder="e.g., Castillo Reef, Salinas Reef"
                    helperText="Group dive sites by reef/area"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={4}
                    value={diveSiteFormData.description}
                    onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, description: e.target.value })}
                    placeholder="Describe the dive site, marine life, points of interest..."
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDiveSiteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => {
                  if (!diveSiteFormData.name || !diveSiteFormData.locationId) {
                    setSnackbar({
                      open: true,
                      message: 'Please fill in all required fields',
                      severity: 'error'
                    });
                    return;
                  }

                  const conditions = {};
                  if (diveSiteFormData.current) conditions.current = diveSiteFormData.current;
                  if (diveSiteFormData.waves) conditions.waves = diveSiteFormData.waves;
                  if (diveSiteFormData.travelTime) conditions.travelTime = diveSiteFormData.travelTime;
                  if (diveSiteFormData.description) conditions.description = diveSiteFormData.description;
                  if (diveSiteFormData.reef) {
                    conditions.reef = diveSiteFormData.reef;
                  }

                  const diveSiteData = {
                    name: diveSiteFormData.name,
                    locationId: diveSiteFormData.locationId,
                    type: diveSiteFormData.type,
                    depthRange: diveSiteFormData.depthRange,
                    difficultyLevel: diveSiteFormData.difficultyLevel,
                    conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
                    isActive: diveSiteFormData.isActive,
                    updatedAt: new Date().toISOString()
                  };

                  if (editingDiveSite) {
                    dataService.update('diveSites', editingDiveSite.id, diveSiteData);
                    setSnackbar({
                      open: true,
                      message: 'Dive site updated successfully!',
                      severity: 'success'
                    });
                  } else {
                    diveSiteData.createdAt = new Date().toISOString();
                    dataService.create('diveSites', diveSiteData);
                    setSnackbar({
                      open: true,
                      message: 'Dive site created successfully!',
                      severity: 'success'
                    });
                  }

                  setDiveSiteDialogOpen(false);
                  loadDiveSites();
                }}
              >
                Save
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      {!isAdmin() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You don't have permission to manage dive sites. Only administrators can access this section.
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

export default DiveSitesManagement;
