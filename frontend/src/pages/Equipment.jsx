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
  Snackbar
} from '@mui/material';
import {
  ScubaDiving as EquipmentIcon,
  Search as SearchIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';

const Equipment = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    locationId: '550e8400-e29b-41d4-a716-446655440001', // Caleta de Fuste
    isAvailable: true,
    notes: '',
    brand: '',
    model: '',
    thickness: '',
    style: '',
    hood: ''
  });

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = () => {
    const allEquipment = dataService.getAll('equipment');
    setEquipment(allEquipment);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleAddEquipment = () => {
    setFormData({
      name: '',
      category: '',
      type: '',
      size: '',
      serialNumber: '',
      condition: 'excellent',
      locationId: '550e8400-e29b-41d4-a716-446655440001',
      isAvailable: true,
      notes: ''
    });
    setEditingEquipment(null);
    setAddDialogOpen(true);
  };

  const handleEditEquipment = (item) => {
    setFormData(item);
    setEditingEquipment(item);
    setAddDialogOpen(true);
  };

  const handleSaveEquipment = () => {
    if (!formData.name || !formData.category || !formData.type) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    if (editingEquipment) {
      dataService.update('equipment', editingEquipment.id, formData);
      setSnackbar({ open: true, message: 'Equipment updated successfully', severity: 'success' });
    } else {
      dataService.create('equipment', formData);
      setSnackbar({ open: true, message: 'Equipment added successfully', severity: 'success' });
    }

    loadEquipment();
    setAddDialogOpen(false);
  };

  const handleDeleteEquipment = (id) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      dataService.remove('equipment', id);
      setSnackbar({ open: true, message: 'Equipment deleted successfully', severity: 'success' });
      loadEquipment();
    }
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

  const filteredEquipment = searchQuery
    ? equipment.filter(eq =>
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.size?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.serialNumber?.toLowerCase().includes(query.toLowerCase())
      )
    : equipment;

  const getConditionColor = (condition) => {
    const colors = {
      excellent: 'success',
      good: 'info',
      fair: 'warning',
      poor: 'error'
    };
    return colors[condition] || 'default';
  };

  const availableCount = equipment.filter(eq => eq.isAvailable).length;
  const totalCount = equipment.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Equipment Tracking
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEquipment}
          >
            Add Equipment
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Equipment</Typography>
              <Typography variant="h4" color="primary">
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Available</Typography>
              <Typography variant="h4" color="success.main">
                {availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">In Use</Typography>
              <Typography variant="h4" color="warning.main">
                {totalCount - availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TextField
        fullWidth
        placeholder="Search equipment by name, size, or serial number..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {filteredEquipment.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? 'No equipment found' : 'No equipment registered'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEquipment.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      {item.name}
                    </Typography>
                    {item.isAvailable ? (
                      <Chip
                        icon={<AvailableIcon />}
                        label="Available"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<UnavailableIcon />}
                        label="In Use"
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Type: {item.type}
                  </Typography>
                  {item.brand && item.model && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Brand: {item.brand} {item.model}
                    </Typography>
                  )}
                  {item.size && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Size: {item.size}
                    </Typography>
                  )}
                  {item.thickness && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Thickness: {item.thickness}
                    </Typography>
                  )}
                  {item.style && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Style: {item.style}
                    </Typography>
                  )}
                  {item.hood && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Hood: {item.hood}
                    </Typography>
                  )}
                  {item.serialNumber && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Serial: {item.serialNumber}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={item.condition || 'excellent'}
                      color={getConditionColor(item.condition)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditEquipment(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteEquipment(item.id)}
                    >
                      Delete
                    </Button>
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
          {editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Equipment Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="diving">Diving</MenuItem>
                  <MenuItem value="snorkeling">Snorkeling</MenuItem>
                  <MenuItem value="safety">Safety</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                  <MenuItem value="own_equipment">Own Equipment</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
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
                label="Size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g., M, L, XL, 12L"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Serial Number"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Mares, Cressi, Aqualung"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Avant Quattro, Pro Light"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Thickness (for wetsuits)"
                value={formData.thickness}
                onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                placeholder="e.g., 3mm, 5mm, 7mm"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Style (for wetsuits)"
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                placeholder="e.g., Shorty, Full, Semi-Dry"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Hood (for wetsuits)"
                value={formData.hood}
                onChange={(e) => setFormData({ ...formData, hood: e.target.value })}
                placeholder="e.g., Yes, No"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <MenuItem value="excellent">Excellent</MenuItem>
                  <MenuItem value="good">Good</MenuItem>
                  <MenuItem value="fair">Fair</MenuItem>
                  <MenuItem value="poor">Poor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
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
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEquipment} variant="contained">
            {editingEquipment ? 'Update' : 'Add'} Equipment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Import Equipment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a CSV file with equipment data. The file should have the following columns:
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre">
              name,category,type,size,serialNumber,condition,notes
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Example:
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
          <Button onClick={() => setBulkDialogOpen(false)}>Close</Button>
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
