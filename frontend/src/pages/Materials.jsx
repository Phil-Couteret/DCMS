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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material';
import {
  Inventory as MaterialsIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useTranslation } from '../utils/languageContext';
import dataService from '../services/dataService';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

const MATERIAL_TYPES = ['BCD', 'Reg', 'Tank', 'Suits', 'Fins', 'Mask', 'Boots'];

const Materials = () => {
  const { t } = useTranslation();
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    type: '',
    brand: '',
    model: '',
    purchaseDate: '',
    warranty: '',
    lastRevisionDate: '',
    nextRevisionDate: '',
    // Regulator specific fields
    firstStageBrand: '',
    firstStageModel: '',
    secondStageBrand: '',
    secondStageModel: '',
    octopusBrand: '',
    octopusModel: '',
    locationId: localStorage.getItem('dcms_current_location') || '550e8400-e29b-41d4-a716-446655440001',
    notes: ''
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = () => {
    const allMaterials = dataService.getAll('materials') || [];
    setMaterials(allMaterials);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleAddMaterial = () => {
    const currentLocation = localStorage.getItem('dcms_current_location') || '550e8400-e29b-41d4-a716-446655440001';
    setFormData({
      type: '',
      brand: '',
      model: '',
      purchaseDate: '',
      warranty: '',
      lastRevisionDate: '',
      nextRevisionDate: '',
      firstStageBrand: '',
      firstStageModel: '',
      secondStageBrand: '',
      secondStageModel: '',
      octopusBrand: '',
      octopusModel: '',
      locationId: currentLocation,
      notes: ''
    });
    setEditingMaterial(null);
    setAddDialogOpen(true);
  };

  const handleEditMaterial = (item) => {
    setFormData({
      type: item.type || '',
      brand: item.brand || '',
      model: item.model || '',
      purchaseDate: item.purchaseDate || '',
      warranty: item.warranty || '',
      lastRevisionDate: item.lastRevisionDate || '',
      nextRevisionDate: item.nextRevisionDate || '',
      firstStageBrand: item.firstStageBrand || '',
      firstStageModel: item.firstStageModel || '',
      secondStageBrand: item.secondStageBrand || '',
      secondStageModel: item.secondStageModel || '',
      octopusBrand: item.octopusBrand || '',
      octopusModel: item.octopusModel || '',
      locationId: item.locationId || localStorage.getItem('dcms_current_location') || '550e8400-e29b-41d4-a716-446655440001',
      notes: item.notes || ''
    });
    setEditingMaterial(item);
    setAddDialogOpen(true);
  };

  const handleSaveMaterial = () => {
    if (!formData.type || !formData.brand || !formData.model) {
      setSnackbar({ open: true, message: 'Please fill in type, brand, and model', severity: 'error' });
      return;
    }

    const materialData = {
      ...formData,
      id: editingMaterial?.id || `material_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (editingMaterial) {
      dataService.update('materials', editingMaterial.id, materialData);
      setSnackbar({ open: true, message: 'Material updated successfully', severity: 'success' });
    } else {
      dataService.create('materials', materialData);
      setSnackbar({ open: true, message: 'Material added successfully', severity: 'success' });
    }

    loadMaterials();
    setAddDialogOpen(false);
  };

  const handleDeleteMaterial = (id) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      dataService.remove('materials', id);
      setSnackbar({ open: true, message: 'Material deleted successfully', severity: 'success' });
      loadMaterials();
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = !searchQuery || 
      material.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.type?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || material.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getRevisionStatus = (nextRevisionDate) => {
    if (!nextRevisionDate) return { status: 'unknown', color: 'default', label: 'Not set' };
    
    try {
      const nextDate = parseISO(nextRevisionDate);
      const today = new Date();
      const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
      
      if (isBefore(nextDate, today)) {
        return { status: 'overdue', color: 'error', label: 'Overdue', days: Math.abs(daysUntil) };
      } else if (daysUntil <= 30) {
        return { status: 'due_soon', color: 'warning', label: `Due in ${daysUntil} days`, days: daysUntil };
      } else {
        return { status: 'ok', color: 'success', label: `Due in ${daysUntil} days`, days: daysUntil };
      }
    } catch (e) {
      return { status: 'unknown', color: 'default', label: 'Invalid date' };
    }
  };

  const materialsNeedingRevision = filteredMaterials.filter(m => {
    const status = getRevisionStatus(m.nextRevisionDate);
    return status.status === 'overdue' || status.status === 'due_soon';
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Material Inventory
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddMaterial}
        >
          Add Material
        </Button>
      </Box>

      {materialsNeedingRevision.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{materialsNeedingRevision.length}</strong> material(s) need revision soon or are overdue.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Materials</Typography>
              <Typography variant="h4" color="primary">
                {materials.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Due for Revision</Typography>
              <Typography variant="h4" color="warning.main">
                {materialsNeedingRevision.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Overdue</Typography>
              <Typography variant="h4" color="error.main">
                {filteredMaterials.filter(m => getRevisionStatus(m.nextRevisionDate).status === 'overdue').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search by brand, model, or type..."
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
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              {MATERIAL_TYPES.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {filteredMaterials.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <MaterialsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery || typeFilter !== 'all' ? 'No materials found' : 'No materials registered'}
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Type</strong></TableCell>
                <TableCell><strong>Brand</strong></TableCell>
                <TableCell><strong>Model</strong></TableCell>
                <TableCell><strong>Purchase Date</strong></TableCell>
                <TableCell><strong>Warranty</strong></TableCell>
                <TableCell><strong>Last Revision</strong></TableCell>
                <TableCell><strong>Next Revision</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMaterials.map((material) => {
                const revisionStatus = getRevisionStatus(material.nextRevisionDate);
                return (
                  <TableRow key={material.id} sx={{ 
                    bgcolor: revisionStatus.status === 'overdue' ? 'error.light' : 
                             revisionStatus.status === 'due_soon' ? 'warning.light' : 'inherit'
                  }}>
                    <TableCell>{material.type}</TableCell>
                    <TableCell>{material.brand}</TableCell>
                    <TableCell>
                      {material.type === 'Reg' ? (
                        <Box>
                          <Typography variant="body2">{material.model}</Typography>
                          {material.firstStageBrand && (
                            <Typography variant="caption" color="text.secondary">
                              1st: {material.firstStageBrand} {material.firstStageModel}
                            </Typography>
                          )}
                          {material.secondStageBrand && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              2nd: {material.secondStageBrand} {material.secondStageModel}
                            </Typography>
                          )}
                          {material.octopusBrand && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Oct: {material.octopusBrand} {material.octopusModel}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        material.model
                      )}
                    </TableCell>
                    <TableCell>
                      {material.purchaseDate ? format(parseISO(material.purchaseDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>{material.warranty || '-'}</TableCell>
                    <TableCell>
                      {material.lastRevisionDate ? format(parseISO(material.lastRevisionDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {material.nextRevisionDate ? format(parseISO(material.nextRevisionDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={revisionStatus.label}
                        color={revisionStatus.color}
                        size="small"
                        icon={revisionStatus.status === 'overdue' ? <WarningIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditMaterial(material)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMaterial(material.id)}
                        color="error"
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
      )}

      {/* Add/Edit Material Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMaterial ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Type *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {MATERIAL_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Brand *"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Model *"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Purchase Date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Warranty"
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                placeholder="e.g., 2 years, until 2025-12-31"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Revision Date"
                type="date"
                value={formData.lastRevisionDate}
                onChange={(e) => setFormData({ ...formData, lastRevisionDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Next Revision Date"
                type="date"
                value={formData.nextRevisionDate}
                onChange={(e) => setFormData({ ...formData, nextRevisionDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Regulator Specific Fields */}
            {formData.type === 'Reg' && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Regulator Details</Typography>
                </Grid>
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

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this material..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveMaterial} variant="contained">
            {editingMaterial ? 'Update' : 'Add'} Material
          </Button>
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

export default Materials;

