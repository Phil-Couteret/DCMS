import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ScubaDiving as DivingEquipmentIcon,
  DirectionsBike as BikeEquipmentIcon,
  Search as SearchIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../utils/languageContext';
import { useAuth, USER_ROLES } from '../utils/authContext';
import dataService from '../services/dataService';
import { format, parseISO, isBefore, addMonths } from 'date-fns';

const Equipment = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const currentLocationId = localStorage.getItem('dcms_current_location');
  
  // Determine if user is Global admin (no locationAccess or empty array)
  const isGlobalAdmin = !currentUser?.locationAccess || (Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length === 0);
  
  // Determine if user can manage equipment (create/edit/delete)
  // Owners (BOAT_PILOT, TRAINER) and Global Admins can manage equipment
  // Guides and Interns can only view and toggle availability
  const canManageEquipment = isGlobalAdmin || 
    currentUser?.role === USER_ROLES.BOAT_PILOT || 
    currentUser?.role === USER_ROLES.TRAINER;
  
  const [equipment, setEquipment] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: '',
    size: '',
    serialNumber: '',
    condition: 'excellent',
    locationId: isGlobalAdmin ? '' : currentLocationId,
    isAvailable: true,
    notes: '',
    brand: '',
    model: '',
    thickness: '',
    style: '',
    hood: '',
    purchaseDate: '',
    warranty: '',
    lastRevisionDate: '',
    nextRevisionDate: '',
    firstStageBrand: '',
    firstStageModel: '',
    secondStageBrand: '',
    secondStageModel: '',
    octopusBrand: '',
    octopusModel: ''
  });

  useEffect(() => {
    loadEquipment();
    loadLocations();
    loadCurrentLocation();
  }, [currentLocationId, isGlobalAdmin]);

  const loadCurrentLocation = async () => {
    try {
      if (currentLocationId) {
        const allLocations = await dataService.getAll('locations') || [];
        const loc = allLocations.find(l => l.id === currentLocationId);
        setCurrentLocation(loc);
      }
    } catch (error) {
      console.error('Error loading current location:', error);
    }
  };

  const loadEquipment = async () => {
    try {
      const allEquipment = await dataService.getAll('equipment') || [];
      // For site managers, only show equipment for their location
      const filteredEquipment = isGlobalAdmin 
        ? allEquipment 
        : allEquipment.filter(eq => (eq.locationId || eq.location_id) === currentLocationId);
      setEquipment(Array.isArray(filteredEquipment) ? filteredEquipment : []);
    } catch (error) {
      console.error('Error loading equipment:', error);
      setEquipment([]);
    }
  };

  const loadLocations = async () => {
    try {
      if (isGlobalAdmin) {
        const allLocations = await dataService.getAll('locations') || [];
        setLocations(Array.isArray(allLocations) ? allLocations : []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  // Check if current location is bike rental
  const isBikeRental = currentLocation?.type === 'bike_rental';
  
  // Get bike rental equipment from location pricing
  const getBikeRentalEquipment = () => {
    if (!isBikeRental || !currentLocation) return [];
    
    const pricing = currentLocation.pricing || currentLocation.settings?.pricing || {};
    const bikeTypes = pricing.bikeTypes || {};
    const rentalEquipment = pricing.equipment || {};
    
    const items = [];
    
    // Add bike types
    Object.entries(bikeTypes).forEach(([key, bikeType]) => {
      items.push({
        id: `bike-type-${key}`,
        name: bikeType.name || key,
        category: 'bike_type',
        type: 'bike_type',
        description: bikeType.description || '',
        locationId: currentLocationId,
        isAvailable: true,
        isBikeType: true,
        bikeTypeKey: key
      });
    });
    
    // Add rental equipment
    Object.entries(rentalEquipment).forEach(([key, price]) => {
      const equipmentNames = {
        click_pedals: 'Click Pedals',
        helmet: 'Helmet',
        gps_computer: 'GPS Computer'
      };
      items.push({
        id: `rental-equipment-${key}`,
        name: equipmentNames[key] || key,
        category: 'rental_equipment',
        type: 'rental_equipment',
        description: `Rental equipment - Charged once per rental`,
        price: price,
        locationId: currentLocationId,
        isAvailable: true,
        isRentalEquipment: true,
        equipmentKey: key
      });
    });
    
    return items;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleAddEquipment = () => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to add equipment', severity: 'error' });
      return;
    }
    setFormData({
      name: '',
      category: isBikeRental ? 'bike_equipment' : 'diving',
      type: isBikeRental ? 'bike_accessory' : '',
      size: '',
      serialNumber: '',
      condition: 'excellent',
      locationId: isGlobalAdmin ? '' : currentLocationId,
      isAvailable: true,
      notes: '',
      brand: '',
      model: '',
      thickness: '',
      style: '',
      hood: '',
      purchaseDate: '',
      warranty: '',
      lastRevisionDate: '',
      nextRevisionDate: '',
      firstStageBrand: '',
      firstStageModel: '',
      secondStageBrand: '',
      secondStageModel: '',
      octopusBrand: '',
      octopusModel: ''
    });
    setEditingEquipment(null);
    setAddDialogOpen(true);
  };

  const handleEditEquipment = (item) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to edit equipment', severity: 'error' });
      return;
    }
    setFormData(item);
    setEditingEquipment(item);
    setAddDialogOpen(true);
  };

  const handleToggleAvailability = async (item) => {
    const updated = { ...item, isAvailable: !item.isAvailable };
    await dataService.update('equipment', item.id, updated);
    setSnackbar({ 
      open: true, 
      message: `Equipment marked as ${!item.isAvailable ? 'available' : 'unavailable'}`, 
      severity: 'success' 
    });
    loadEquipment();
  };

  const handleSaveEquipment = async () => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to save equipment', severity: 'error' });
      return;
    }
    
    if (!formData.name || !formData.category || !formData.type) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    if (!isGlobalAdmin && formData.locationId !== currentLocationId) {
      setSnackbar({ open: true, message: 'You can only modify equipment for your location', severity: 'error' });
      return;
    }

    try {
      if (editingEquipment) {
        await dataService.update('equipment', editingEquipment.id, formData);
        setSnackbar({ open: true, message: 'Equipment updated successfully', severity: 'success' });
      } else {
        await dataService.create('equipment', formData);
        setSnackbar({ open: true, message: 'Equipment added successfully', severity: 'success' });
      }

      loadEquipment();
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Error saving equipment:', error);
      setSnackbar({ open: true, message: 'Error saving equipment', severity: 'error' });
    }
  };

  const handleDeleteEquipment = async (id) => {
    if (!canManageEquipment) {
      setSnackbar({ open: true, message: 'You do not have permission to delete equipment', severity: 'error' });
      return;
    }
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        await dataService.remove('equipment', id);
        setSnackbar({ open: true, message: 'Equipment deleted successfully', severity: 'success' });
        loadEquipment();
      } catch (error) {
        console.error('Error deleting equipment:', error);
        setSnackbar({ open: true, message: 'Error deleting equipment', severity: 'error' });
      }
    }
  };

  const getRevisionStatus = (nextRevisionDate) => {
    if (!nextRevisionDate) return null;
    const nextDate = parseISO(nextRevisionDate);
    const now = new Date();
    if (isBefore(nextDate, now)) return 'overdue';
    if (isBefore(nextDate, addMonths(now, 3))) return 'dueSoon';
    return 'ok';
  };

  const handleBulkImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const importedEquipment = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const equipment = {
              name: values[0] || '',
              category: values[1] || 'diving',
              type: values[2] || 'standard',
              size: values[3] || '',
              serialNumber: values[4] || '',
              condition: values[5] || 'excellent',
              locationId: '550e8400-e29b-41d4-a716-446655440001',
              isAvailable: true,
              notes: values[6] || ''
            };
            importedEquipment.push(equipment);
          }
        }

        // Add all imported equipment
        importedEquipment.forEach(eq => {
          dataService.create('equipment', eq);
        });

        setSnackbar({ 
          open: true, 
          message: `${importedEquipment.length} equipment items imported successfully`, 
          severity: 'success' 
        });
        loadEquipment();
        setBulkDialogOpen(false);
      } catch (error) {
        setSnackbar({ open: true, message: 'Error importing file. Please check the format.', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // Get equipment list - for bike rental, only show bike rental equipment from pricing
  // For diving locations, only show diving equipment (separate, no mixing)
  const allEquipmentList = isBikeRental 
    ? getBikeRentalEquipment() // Only bike equipment for bike rental locations
    : equipment; // Only diving equipment for diving locations

  const filteredEquipment = allEquipmentList.filter(eq => {
    const matchesSearch = searchQuery.trim() === '' ||
      eq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || eq.type === filterType || eq.category === filterType;
    
    return matchesSearch && matchesType;
  });

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'success',
      good: 'info',
      fair: 'warning',
      poor: 'error'
    };
    return colors[condition] || 'default';
  };

  const availableCount = allEquipmentList.filter(eq => eq.isAvailable).length;
  const totalCount = allEquipmentList.length;

  const overdueCount = allEquipmentList.filter(eq => getRevisionStatus(eq.nextRevisionDate) === 'overdue').length;
  const dueSoonCount = allEquipmentList.filter(eq => getRevisionStatus(eq.nextRevisionDate) === 'dueSoon').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isBikeRental 
            ? 'Bike Rental Equipment' 
            : (isGlobalAdmin ? 'Global Equipment Inventory' : t('equipment.title'))}
        </Typography>
        {canManageEquipment && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isGlobalAdmin && (
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setBulkDialogOpen(true)}
              >
                {t('common.bulkImport')}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddEquipment}
            >
              {t('equipment.add') || 'Add Equipment'}
            </Button>
          </Box>
        )}
        {!canManageEquipment && (
          <Alert severity="info" sx={{ maxWidth: 400 }}>
            You can view equipment and update availability status. Equipment management is restricted to owners and administrators.
          </Alert>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.total')}</Typography>
              <Typography variant="h4" color="primary">
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.available')}</Typography>
              <Typography variant="h4" color="success.main">
                {availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.inUse')}</Typography>
              <Typography variant="h4" color="warning.main">
                {totalCount - availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {isGlobalAdmin && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Revision Due/Overdue</Typography>
                <Typography variant="h4" color={overdueCount > 0 ? "error.main" : "warning.main"}>
                  {overdueCount + dueSoonCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {isGlobalAdmin && (overdueCount > 0 || dueSoonCount > 0) && (
        <Box sx={{ mb: 3 }}>
          {overdueCount > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {overdueCount} equipment item(s) have overdue revisions
            </Alert>
          )}
          {dueSoonCount > 0 && (
            <Alert severity="warning">
              {dueSoonCount} equipment item(s) need revision within 3 months
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder={t('equipment.search')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {isBikeRental ? (
              <>
                <MenuItem value="bike_type">Bike Types</MenuItem>
                <MenuItem value="rental_equipment">Rental Equipment</MenuItem>
              </>
            ) : (
              <>
                <MenuItem value="BCD">BCD</MenuItem>
                <MenuItem value="Regulator">Regulator</MenuItem>
                <MenuItem value="Mask">Mask</MenuItem>
                <MenuItem value="Fins">Fins</MenuItem>
                <MenuItem value="Boots">Boots</MenuItem>
                <MenuItem value="Wetsuit">Wetsuit</MenuItem>
                <MenuItem value="Semi-Dry">Semi-Dry</MenuItem>
                <MenuItem value="Dry Suit">Dry Suit</MenuItem>
                <MenuItem value="Tank">Tank</MenuItem>
                <MenuItem value="Computer">Computer</MenuItem>
                <MenuItem value="Torch">Torch</MenuItem>
                <MenuItem value="Accessory">Accessory</MenuItem>
              </>
            )}
          </Select>
        </FormControl>
      </Box>

      {filteredEquipment.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          {isBikeRental ? (
            <BikeEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          ) : (
            <DivingEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          )}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? (t('equipment.noResults') || 'No equipment found') : (t('equipment.noEquipment') || 'No equipment registered')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEquipment.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6">
                      {isBikeRental && (item.isBikeType || item.isRentalEquipment) 
                        ? item.name 
                        : `${item.brand || ''} ${item.model || ''}`.trim() || item.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                      {item.isAvailable ? (
                        <Chip
                          icon={<AvailableIcon />}
                          label={t('equipment.available')}
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<UnavailableIcon />}
                          label={t('equipment.inUse')}
                          color="error"
                          size="small"
                        />
                      )}
                      {isGlobalAdmin && getRevisionStatus(item.nextRevisionDate) && (
                        <Chip
                          icon={<WarningIcon />}
                          label={getRevisionStatus(item.nextRevisionDate) === 'overdue' ? 'Overdue' : 'Due Soon'}
                          color={getRevisionStatus(item.nextRevisionDate) === 'overdue' ? 'error' : 'warning'}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>

                  {isBikeRental && (item.isBikeType || item.isRentalEquipment) ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.description || `Type: ${item.type}`}
                      </Typography>
                      {item.price && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Price: €{item.price.toFixed(2)}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type: {item.type} {item.size ? `(${item.size})` : ''}
                    </Typography>
                  )}
                  {item.serialNumber && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Serial: {item.serialNumber}
                    </Typography>
                  )}
                  {isGlobalAdmin && (
                    <>
                      {item.locationId && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Location: {locations.find(l => l.id === item.locationId)?.name || 'Unknown'}
                        </Typography>
                      )}
                      {item.purchaseDate && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Purchase: {item.purchaseDate} {item.warranty ? `(Warranty: ${item.warranty})` : ''}
                        </Typography>
                      )}
                      {item.nextRevisionDate && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Next Revision: {item.nextRevisionDate}
                        </Typography>
                      )}
                      {item.type === 'Regulator' && item.firstStageBrand && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" display="block">1st: {item.firstStageBrand} {item.firstStageModel}</Typography>
                          <Typography variant="caption" display="block">2nd: {item.secondStageBrand} {item.secondStageModel}</Typography>
                          <Typography variant="caption" display="block">Oct: {item.octopusBrand} {item.octopusModel}</Typography>
                        </Box>
                      )}
                    </>
                  )}
                  {!isBikeRental || (!item.isBikeType && !item.isRentalEquipment) ? (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={item.condition || 'excellent'}
                        color={getConditionColor(item.condition)}
                        size="small"
                      />
                    </Box>
                  ) : null}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {/* Bike rental equipment from pricing is read-only, show info only */}
                    {isBikeRental && (item.isBikeType || item.isRentalEquipment) ? (
                      <Alert severity="info" sx={{ width: '100%', py: 0.5 }}>
                        {item.isBikeType ? 'Bike type configured in Settings > Prices' : 'Pricing configured in Settings > Prices'}
                      </Alert>
                    ) : canManageEquipment ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditEquipment(item)}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteEquipment(item.id)}
                        >
                          {t('common.delete')}
                        </Button>
                      </>
                    ) : (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailability(item)}
                            color="success"
                          />
                        }
                        label={item.isAvailable ? "Available" : "In Use"}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEquipment ? (t('equipment.editTitle') || 'Edit Equipment') : (t('equipment.addTitle') || 'Add New Equipment')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={(t('equipment.form.name') || 'Equipment Name') + ' *'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('equipment.form.category') || 'Category'}</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="diving">{t('equipment.categories.diving') || 'Diving'}</MenuItem>
                  <MenuItem value="snorkeling">{t('equipment.categories.snorkeling') || 'Snorkeling'}</MenuItem>
                  <MenuItem value="safety">{t('equipment.categories.safety') || 'Safety'}</MenuItem>
                  <MenuItem value="maintenance">{t('equipment.categories.maintenance') || 'Maintenance'}</MenuItem>
                  <MenuItem value="own_equipment">{t('equipment.categories.ownEquipment') || 'Own Equipment'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('equipment.form.type') || 'Type'}</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="BCD">BCD</MenuItem>
                  <MenuItem value="Regulator">Regulator</MenuItem>
                  <MenuItem value="Mask">Mask</MenuItem>
                  <MenuItem value="Fins">Fins</MenuItem>
                  <MenuItem value="Boots">Boots</MenuItem>
                  <MenuItem value="Wetsuit">Wetsuit</MenuItem>
                  <MenuItem value="Semi-Dry">Semi-Dry</MenuItem>
                  <MenuItem value="Dry Suit">Dry Suit</MenuItem>
                  <MenuItem value="Tank">Tank</MenuItem>
                  <MenuItem value="Computer">Computer</MenuItem>
                  <MenuItem value="Torch">Torch</MenuItem>
                  <MenuItem value="Accessory">Accessory</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.size') || 'Size'}
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g., M, L, XL, 12L"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.serial') || 'Serial Number'}
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.brand') || 'Brand'}
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Mares, Cressi, Aqualung"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.model') || 'Model'}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Avant Quattro, Pro Light"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.thickness') || 'Thickness (for wetsuits)'}
                value={formData.thickness}
                onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                placeholder="e.g., 3mm, 5mm, 7mm"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.style') || 'Style (for wetsuits)'}
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                placeholder="e.g., Shorty, Full, Semi-Dry"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.hood') || 'Hood (for wetsuits)'}
                value={formData.hood}
                onChange={(e) => setFormData({ ...formData, hood: e.target.value })}
                placeholder="e.g., Yes, No"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('equipment.form.condition') || 'Condition'}</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <MenuItem value="excellent">{t('equipment.condition.excellent') || 'Excellent'}</MenuItem>
                  <MenuItem value="good">{t('equipment.condition.good') || 'Good'}</MenuItem>
                  <MenuItem value="fair">{t('equipment.condition.fair') || 'Fair'}</MenuItem>
                  <MenuItem value="poor">{t('equipment.condition.poor') || 'Poor'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {isGlobalAdmin && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Location *</InputLabel>
                    <Select
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    >
                      {locations.map(loc => (
                        <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Purchase Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warranty"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    placeholder="e.g., 2 years, 3 years"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Revision Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.lastRevisionDate}
                    onChange={(e) => setFormData({ ...formData, lastRevisionDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Next Revision Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.nextRevisionDate}
                    onChange={(e) => setFormData({ ...formData, nextRevisionDate: e.target.value })}
                  />
                </Grid>

                {formData.type === 'Regulator' && (
                  <>
                    <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 2 }}>Regulator Details</Typography></Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="1st Stage Brand"
                        value={formData.firstStageBrand}
                        onChange={(e) => setFormData({ ...formData, firstStageBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="1st Stage Model"
                        value={formData.firstStageModel}
                        onChange={(e) => setFormData({ ...formData, firstStageModel: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="2nd Stage Brand"
                        value={formData.secondStageBrand}
                        onChange={(e) => setFormData({ ...formData, secondStageBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="2nd Stage Model"
                        value={formData.secondStageModel}
                        onChange={(e) => setFormData({ ...formData, secondStageModel: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Octopus Brand"
                        value={formData.octopusBrand}
                        onChange={(e) => setFormData({ ...formData, octopusBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Octopus Model"
                        value={formData.octopusModel}
                        onChange={(e) => setFormData({ ...formData, octopusModel: e.target.value })}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('equipment.form.notes') || 'Notes'}
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this equipment..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveEquipment} variant="contained">
            {editingEquipment ? t('common.update') : t('common.add')} {t('nav.equipment')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('equipment.bulk.title') || 'Bulk Import Equipment'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('equipment.bulk.description') || 'Upload a CSV file with equipment data. The file should have the following columns:'}
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre">
              name,category,type,size,serialNumber,condition,notes
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('equipment.bulk.example') || 'Example:'}
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre">
              BCD Mares, diving, standard, M, BCD001, excellent, Good condition
              Regulator Aqualung, diving, premium, -, REG001, good, Recently serviced
              Mask Cressi, diving, standard, -, MASK001, excellent, New
            </Typography>
          </Box>
          <input
            type="file"
            accept=".csv"
            onChange={handleBulkImport}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default Equipment;
