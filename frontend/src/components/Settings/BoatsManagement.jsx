// Boats tab of Settings - configure boats, capacity, and onboard equipment.
// Extracted from the former monolithic Settings.jsx (Phase 5.2).
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormLabel,
  FormGroup,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DirectionsBoat as BoatIcon,
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth } from '../../utils/authContext';

const EQUIPMENT_OPTIONS = [
  'oxygen',
  'first_aid',
  'radio',
  'mobile_phone',
  'gps',
  'life_jackets',
  'flares',
  'dive_ladder',
  'anchor',
  'compass'
];

const BoatsManagement = () => {
  const { isAdmin } = useAuth();
  const [locations, setLocations] = useState([]);
  const [boats, setBoats] = useState([]);
  const [boatDialogOpen, setBoatDialogOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState(null);
  const [boatFormData, setBoatFormData] = useState({
    name: '',
    locationId: '',
    capacity: 10,
    equipmentOnboard: [],
    isActive: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadLocations().catch((err) => console.error('Error loading locations:', err));
    loadBoats().catch((err) => console.error('Error loading boats:', err));
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

  const loadBoats = async () => {
    try {
      const allBoats = await dataService.getAll('boats') || [];
      setBoats(Array.isArray(allBoats) ? allBoats : []);
    } catch (error) {
      console.error('Error loading boats:', error);
      setBoats([]);
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
                <BoatIcon color="primary" />
                <Box>
                  <Typography variant="h6">Boats</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure boats, capacity, and onboard equipment
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Manage all boats for each location. Configure capacity and onboard equipment.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingBoat(null);
                      setBoatFormData({
                        name: '',
                        locationId: locations.length > 0 ? locations[0].id : '',
                        capacity: 10,
                        equipmentOnboard: [],
                        isActive: true
                      });
                      setBoatDialogOpen(true);
                    }}
                  >
                    Add Boat
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Capacity</TableCell>
                        <TableCell>Equipment</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {boats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary" sx={{ py: 2 }}>
                              No boats found. Click "Add Boat" to create one.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        boats.map((boat) => {
                          const location = locations.find(l => l.id === boat.locationId);

                          return (
                            <TableRow key={boat.id}>
                              <TableCell>{boat.name}</TableCell>
                              <TableCell>{location?.name || 'Unknown'}</TableCell>
                              <TableCell>{boat.capacity || 0}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {(boat.equipmentOnboard || []).slice(0, 3).map((equipment) => (
                                    <Chip key={equipment} label={equipment.replace(/_/g, ' ')} size="small" variant="outlined" />
                                  ))}
                                  {(boat.equipmentOnboard || []).length > 3 && (
                                    <Chip label={`+${(boat.equipmentOnboard || []).length - 3} more`} size="small" variant="outlined" color="primary" />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={boat.isActive !== false ? 'Active' : 'Inactive'}
                                  size="small"
                                  color={boat.isActive !== false ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setEditingBoat(boat);
                                    setBoatFormData({
                                      name: boat.name || '',
                                      locationId: boat.locationId || (locations.length > 0 ? locations[0].id : ''),
                                      capacity: boat.capacity || 10,
                                      equipmentOnboard: boat.equipmentOnboard || [],
                                      isActive: boat.isActive !== false
                                    });
                                    setBoatDialogOpen(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete "${boat.name}"?`)) {
                                      dataService.remove('boats', boat.id);
                                      loadBoats();
                                      setSnackbar({
                                        open: true,
                                        message: 'Boat deleted successfully!',
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
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Boat Dialog */}
          <Dialog
            open={boatDialogOpen}
            onClose={() => setBoatDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {editingBoat ? 'Edit Boat' : 'Add Boat'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Boat Name"
                    value={boatFormData.name}
                    onChange={(e) => setBoatFormData({ ...boatFormData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={boatFormData.locationId}
                      onChange={(e) => setBoatFormData({ ...boatFormData, locationId: e.target.value })}
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
                  <TextField
                    fullWidth
                    label="Capacity"
                    type="number"
                    value={boatFormData.capacity}
                    onChange={(e) => setBoatFormData({ ...boatFormData, capacity: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={boatFormData.isActive}
                        onChange={(e) => setBoatFormData({ ...boatFormData, isActive: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormLabel component="legend">Onboard Equipment</FormLabel>
                  <FormGroup>
                    <Grid container spacing={1}>
                      {EQUIPMENT_OPTIONS.map((equipment) => (
                        <Grid item xs={12} sm={6} md={4} key={equipment}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={boatFormData.equipmentOnboard.includes(equipment)}
                                onChange={(e) => {
                                  const newEquipment = e.target.checked
                                    ? [...boatFormData.equipmentOnboard, equipment]
                                    : boatFormData.equipmentOnboard.filter(eq => eq !== equipment);
                                  setBoatFormData({ ...boatFormData, equipmentOnboard: newEquipment });
                                }}
                              />
                            }
                            label={equipment.replace(/_/g, ' ')}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </FormGroup>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setBoatDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={() => {
                  if (!boatFormData.name || !boatFormData.locationId) {
                    setSnackbar({
                      open: true,
                      message: 'Please fill in all required fields',
                      severity: 'error'
                    });
                    return;
                  }

                  const boatData = {
                    ...boatFormData,
                    updatedAt: new Date().toISOString()
                  };

                  if (editingBoat) {
                    dataService.update('boats', editingBoat.id, boatData);
                    setSnackbar({
                      open: true,
                      message: 'Boat updated successfully!',
                      severity: 'success'
                    });
                  } else {
                    boatData.createdAt = new Date().toISOString();
                    dataService.create('boats', boatData);
                    setSnackbar({
                      open: true,
                      message: 'Boat created successfully!',
                      severity: 'success'
                    });
                  }

                  setBoatDialogOpen(false);
                  loadBoats();
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
            You don't have permission to manage boats. Only administrators can access this section.
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

export default BoatsManagement;
