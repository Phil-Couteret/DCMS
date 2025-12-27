import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as EndStayIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import stayService from '../services/stayService';
import stayCostsService from '../services/stayCostsService';
import { useTranslation } from '../utils/languageContext';

const Stays = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stayCosts, setStayCosts] = useState({}); // { 'customerId-stayStartDate': [...] }
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [currentStayKey, setCurrentStayKey] = useState(null);
  const [costFormData, setCostFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'insurance',
    description: '',
    amount: '',
    quantity: 1,
    unitPrice: '',
    notes: ''
  });

  useEffect(() => {
    loadActiveStays();
  }, []);

  useEffect(() => {
    // Load costs for all active stays
    const costsMap = {};
    activeStays.forEach(stay => {
      const key = `${stay.customer.id}|${stay.stayStartDate}`;
      costsMap[key] = stayCostsService.getStayCosts(stay.customer.id, stay.stayStartDate);
    });
    setStayCosts(costsMap);
  }, [activeStays]);

  const loadActiveStays = async () => {
    setLoading(true);
    try {
      const stays = await stayService.getActiveStays(30); // Last 30 days
      setActiveStays(stays);
    } catch (error) {
      console.error('Error loading active stays:', error);
      setActiveStays([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (totalDives) => {
    if (totalDives >= 9) return 'success';
    if (totalDives >= 6) return 'info';
    if (totalDives >= 3) return 'warning';
    return 'default';
  };

  const getStatusText = (totalDives) => {
    if (totalDives >= 9) return t('stays.status.high') || 'High Volume';
    if (totalDives >= 6) return t('stays.status.medium') || 'Medium Volume';
    if (totalDives >= 3) return t('stays.status.low') || 'Low Volume';
    return t('stays.status.new') || 'New Stay';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEndStay = (stay) => {
    navigate('/bill', { state: { stay } });
  };

  const getSessionText = (sessions) => {
    if (!sessions) return 'N/A';
    const parts = [];
    if (sessions.morning) parts.push(t('bookings.details.morning') || 'Morning (9AM)');
    if (sessions.afternoon) parts.push(t('bookings.details.afternoon') || 'Afternoon (12PM)');
    return parts.join(', ') || (t('stays.noSessions') || 'No sessions');
  };

  const getStayKey = (stay) => {
    return `${stay.customer.id}|${stay.stayStartDate}`;
  };

  const getStayCostsTotal = (stay) => {
    const key = getStayKey(stay);
    const costs = stayCosts[key] || [];
    return costs.reduce((sum, cost) => sum + (cost.total || 0), 0);
  };

  const handleOpenCostDialog = (stay, cost = null) => {
    setCurrentStayKey(getStayKey(stay));
    if (cost) {
      setEditingCost(cost);
      setCostFormData({
        date: cost.date,
        category: cost.category,
        description: cost.description,
        amount: cost.total.toString(),
        quantity: cost.quantity || 1,
        unitPrice: cost.unitPrice.toString(),
        notes: cost.notes || ''
      });
    } else {
      setEditingCost(null);
      setCostFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'insurance',
        description: '',
        amount: '',
        quantity: 1,
        unitPrice: '',
        notes: ''
      });
    }
    setShowCostDialog(true);
  };

  const handleCloseCostDialog = () => {
    setShowCostDialog(false);
    setEditingCost(null);
    setCurrentStayKey(null);
  };

  const handleSaveCost = () => {
    if (!currentStayKey) return;
    
    const [customerId, stayStartDate] = currentStayKey.split('|');
    const costData = {
      date: costFormData.date,
      category: costFormData.category,
      description: costFormData.description,
      quantity: parseInt(costFormData.quantity) || 1,
      unitPrice: parseFloat(costFormData.unitPrice) || parseFloat(costFormData.amount) || 0,
      notes: costFormData.notes
    };

    try {
      if (editingCost) {
        stayCostsService.updateStayCost(editingCost.id, costData);
      } else {
        stayCostsService.addStayCost(customerId, stayStartDate, costData);
      }
      
      // Reload costs
      const costsMap = { ...stayCosts };
      costsMap[currentStayKey] = stayCostsService.getStayCosts(customerId, stayStartDate);
      setStayCosts(costsMap);
      handleCloseCostDialog();
    } catch (error) {
      console.error('Error saving cost:', error);
    }
  };

  const handleDeleteCost = (stay, costId) => {
    const key = getStayKey(stay);
    const [customerId, stayStartDate] = key.split('|');
    
    try {
      stayCostsService.deleteStayCost(costId);
      const costsMap = { ...stayCosts };
      costsMap[key] = stayCostsService.getStayCosts(customerId, stayStartDate);
      setStayCosts(costsMap);
    } catch (error) {
      console.error('Error deleting cost:', error);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      insurance: 'Insurance',
      equipment: 'Equipment',
      clothes: 'Clothes',
      goodies: 'Goodies',
      other: 'Other'
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{t('stays.loading') || 'Loading stays...'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('stays.title') || 'Customer Stays'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadActiveStays}
          >
            {t('stays.refresh') || 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.new')}
          </Button>
        </Box>
      </Box>

      {activeStays.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('stays.empty') || 'No active stays found'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('stays.emptyHint') || 'Customers with bookings in the last 30 days will appear here'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.createFirst')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {activeStays.map((stay) => (
            <Accordion key={stay.customer.id} defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {stay.customer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stay.customer.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(t('stays.started') || 'Stay started') + ': '} {formatDate(stay.stayStartDate)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={getStatusText(stay.totalDives)}
                      color={getStatusColor(stay.totalDives)}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        €{stay.totalPrice.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stay.totalDives} {(t('bookings.details.dives') || 'dives')} @ €{stay.pricePerDive.toFixed(2)} {(t('stays.each') || 'each')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('stays.breakdownTitle') || 'Stay Breakdown'}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('stays.table.date') || 'Date'}</TableCell>
                          <TableCell>{t('stays.table.sessions') || 'Sessions'}</TableCell>
                          <TableCell>{t('stays.table.dives') || 'Dives'}</TableCell>
                          <TableCell align="right">{t('stays.table.pricePerDive') || 'Price per Dive'}</TableCell>
                          <TableCell align="right">{t('stays.table.total') || 'Total'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stay.breakdown.map((booking, index) => (
                          <TableRow key={booking.bookingId}>
                            <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                            <TableCell>
                              {booking.sessions ? getSessionText(booking.sessions) : 'N/A'}
                            </TableCell>
                            <TableCell>{booking.dives}</TableCell>
                            <TableCell align="right">€{booking.pricePerDive.toFixed(2)}</TableCell>
                            <TableCell align="right">€{booking.totalForBooking.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>{t('stays.cumulativeTitle') || 'Cumulative Pricing'}:</strong> {t('stays.cumulativeTextPart1') || 'All dives in this stay are priced at'} €{stay.pricePerDive.toFixed(2)} {t('stays.cumulativeTextPart2') || 'per dive based on the total volume of'} {stay.totalDives} {(t('bookings.details.dives') || 'dives')}. {t('stays.cumulativeTextPart3') || 'This ensures customers get the best possible rate for their entire stay.'}
                    </Typography>
                  </Alert>

                  {/* Additional Costs Section */}
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Additional Costs
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenCostDialog(stay)}
                      >
                        Add Cost
                      </Button>
                    </Box>

                    {(() => {
                      const key = getStayKey(stay);
                      const costs = stayCosts[key] || [];
                      const total = getStayCostsTotal(stay);

                      if (costs.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                            No additional costs recorded yet
                          </Typography>
                        );
                      }

                      return (
                        <>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Category</TableCell>
                                  <TableCell>Description</TableCell>
                                  <TableCell align="right">Quantity</TableCell>
                                  <TableCell align="right">Unit Price</TableCell>
                                  <TableCell align="right">Total</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {costs.map((cost) => (
                                  <TableRow key={cost.id}>
                                    <TableCell>{formatDate(cost.date)}</TableCell>
                                    <TableCell>
                                      <Chip label={getCategoryLabel(cost.category)} size="small" />
                                    </TableCell>
                                    <TableCell>{cost.description}</TableCell>
                                    <TableCell align="right">{cost.quantity || 1}</TableCell>
                                    <TableCell align="right">€{cost.unitPrice.toFixed(2)}</TableCell>
                                    <TableCell align="right">€{cost.total.toFixed(2)}</TableCell>
                                    <TableCell align="right">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleOpenCostDialog(stay, cost)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleDeleteCost(stay, cost.id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Typography variant="h6">
                              Total Additional Costs: €{total.toFixed(2)}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/bookings/new?customerId=${stay.customer.id}`)}
                    >
                      {t('stays.addBooking') || 'Add Booking'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/customers?id=${stay.customer.id}`)}
                    >
                      {t('stays.viewCustomer') || 'View Customer'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<EndStayIcon />}
                      onClick={() => handleEndStay(stay)}
                    >
                      {t('stays.endStay') || 'End Stay & Generate Bill'}
                    </Button>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Add/Edit Cost Dialog */}
      <Dialog open={showCostDialog} onClose={handleCloseCostDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCost ? 'Edit Cost' : 'Add Additional Cost'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={costFormData.date}
                onChange={(e) => setCostFormData({ ...costFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={costFormData.category}
                  onChange={(e) => setCostFormData({ ...costFormData, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="insurance">Insurance</MenuItem>
                  <MenuItem value="equipment">Equipment</MenuItem>
                  <MenuItem value="clothes">Clothes</MenuItem>
                  <MenuItem value="goodies">Goodies</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={costFormData.description}
                onChange={(e) => setCostFormData({ ...costFormData, description: e.target.value })}
                placeholder="e.g., Dive Insurance, T-shirt, Equipment purchase"
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                value={costFormData.quantity}
                onChange={(e) => {
                  const qty = parseInt(e.target.value) || 1;
                  setCostFormData({ ...costFormData, quantity: qty });
                }}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Unit Price (€)"
                value={costFormData.unitPrice}
                onChange={(e) => setCostFormData({ ...costFormData, unitPrice: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Total (€)"
                value={((parseFloat(costFormData.unitPrice) || 0) * (parseInt(costFormData.quantity) || 1)).toFixed(2)}
                InputProps={{ readOnly: true }}
                helperText="Calculated automatically"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes (Optional)"
                value={costFormData.notes}
                onChange={(e) => setCostFormData({ ...costFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCostDialog}>Cancel</Button>
          <Button
            onClick={handleSaveCost}
            variant="contained"
            disabled={!costFormData.description || !costFormData.unitPrice}
          >
            {editingCost ? 'Update' : 'Add'} Cost
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Stays;
