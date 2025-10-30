import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Calculate as CalculateIcon,
  Print as PrintIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import stayService from '../../services/stayService';

const BillGenerator = ({ open, onClose, stay }) => {
  const [settings, setSettings] = useState(null);
  const [billData, setBillData] = useState({
    dives: [],
    equipment: [],
    beverages: [],
    otherItems: []
  });
  const [beverageQuantity, setBeverageQuantity] = useState(0);
  const [otherItems, setOtherItems] = useState([{ name: '', price: 0 }]);
  const [showBill, setShowBill] = useState(false);
  const [calculatedBill, setCalculatedBill] = useState(null);

  useEffect(() => {
    if (open && stay) {
      loadSettings();
      initializeBillData();
    }
  }, [open, stay]);

  const loadSettings = () => {
    const settingsData = dataService.getAll('settings')[0];
    setSettings(settingsData);
  };

  const initializeBillData = () => {
    if (!stay) return;

    // Initialize dive data from stay
    const dives = (stay.breakdown || []).map(booking => ({
      date: booking.bookingDate,
      sessions: booking.sessions,
      dives: booking.dives,
      pricePerDive: booking.pricePerDive,
      total: booking.totalForBooking
    }));

    setBillData(prev => ({
      ...prev,
      dives
    }));
  };

  const addBeverage = () => {
    if (beverageQuantity > 0 && settings) {
      const beveragePrice = settings.prices.beverages.water || 1.8;
      const newBeverage = {
        type: 'beverage',
        quantity: beverageQuantity,
        pricePerUnit: beveragePrice,
        total: beverageQuantity * beveragePrice
      };

      setBillData(prev => ({
        ...prev,
        beverages: [...prev.beverages, newBeverage]
      }));

      setBeverageQuantity(0);
    }
  };

  const removeBeverage = (index) => {
    setBillData(prev => ({
      ...prev,
      beverages: prev.beverages.filter((_, i) => i !== index)
    }));
  };

  const addOtherItem = () => {
    setOtherItems(prev => [...prev, { name: '', price: 0 }]);
  };

  const updateOtherItem = (index, field, value) => {
    setOtherItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeOtherItem = (index) => {
    setOtherItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateBill = () => {
    if (!stay || !settings) return;

    // Calculate dive totals
    const diveTotal = (billData.dives || []).reduce((sum, dive) => sum + (dive.total || 0), 0);

    // Calculate beverage totals
    const beverageTotal = (billData.beverages || []).reduce((sum, bev) => sum + (bev.total || 0), 0);

    // Calculate other items totals
    const otherTotal = (otherItems || []).reduce((sum, item) => sum + (item.price || 0), 0);

    // Calculate equipment rental from stay bookings
    let equipmentTotal = 0;
    if (stay.stayBookings && Array.isArray(stay.stayBookings)) {
      stay.stayBookings.forEach(booking => {
        if (booking.rentedEquipment) {
          Object.entries(booking.rentedEquipment).forEach(([equipment, isRented]) => {
            if (isRented && settings.prices.equipment[equipment.toLowerCase()]) {
              const equipmentPrice = settings.prices.equipment[equipment.toLowerCase()];
              const bookingDives = booking.diveSessions ? 
                (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
                (booking.numberOfDives || 0);
              equipmentTotal += equipmentPrice * bookingDives;
            }
          });
        }
      });
    }

    // Calculate dive insurance (mandatory for all divers)
    let diveInsuranceTotal = 0;
    if (settings.prices.diveInsurance) {
      // For now, we'll use one_day insurance as default
      // In a real implementation, this would be based on the stay duration
      diveInsuranceTotal = settings.prices.diveInsurance.one_day || 7.00;
    }

    const subtotal = diveTotal + beverageTotal + otherTotal + equipmentTotal + diveInsuranceTotal;
    const tax = subtotal * (settings.prices.tax.iva_rate || 0.21);
    const total = subtotal + tax;

    const bill = {
      customer: stay.customer,
      stayStartDate: stay.stayStartDate,
      billDate: new Date().toISOString().split('T')[0],
      billNumber: `BILL-${Date.now()}`,
      dives: billData.dives,
      beverages: billData.beverages,
      otherItems: (otherItems || []).filter(item => item.name && item.price > 0),
      equipmentTotal,
      subtotal,
      tax,
      total,
      breakdown: {
        dives: diveTotal,
        beverages: beverageTotal,
        equipment: equipmentTotal,
        diveInsurance: diveInsuranceTotal,
        other: otherTotal
      }
    };

    setCalculatedBill(bill);
    setShowBill(true);
  };

  const printBill = () => {
    window.print();
  };

  const downloadBill = () => {
    // This would generate a PDF - for now, we'll use window.print()
    // In a real implementation, you'd use a library like jsPDF
    window.print();
  };


  if (!settings) return null;

  return (
    <>
      <Dialog open={open && !showBill} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" gutterBottom>
            Generate Bill - {stay?.customer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay from {stay?.stayStartDate} • {stay?.totalDives} dives
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Dives Summary */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Dives Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Sessions</TableCell>
                      <TableCell>Dives</TableCell>
                      <TableCell align="right">Price per Dive</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billData.dives.map((dive, index) => (
                      <TableRow key={index}>
                        <TableCell>{dive.date}</TableCell>
                        <TableCell>
                          {dive.sessions ? 
                            (dive.sessions.morning ? 'Morning' : '') + 
                            (dive.sessions.morning && dive.sessions.afternoon ? ', ' : '') +
                            (dive.sessions.afternoon ? 'Afternoon' : '') : 'N/A'}
                        </TableCell>
                        <TableCell>{dive.dives}</TableCell>
                        <TableCell align="right">€{dive.pricePerDive.toFixed(2)}</TableCell>
                        <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Beverages */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Beverages (€1.80 each)
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Number of Beverages"
                    type="number"
                    size="small"
                    fullWidth
                    value={beverageQuantity}
                    onChange={(e) => setBeverageQuantity(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0 }}
                    helperText="€1.80 per beverage"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addBeverage}
                    disabled={beverageQuantity <= 0}
                    fullWidth
                    sx={{ height: '56px' }}
                  >
                    Add Beverages
                  </Button>
                </Grid>
              </Grid>

              {billData.beverages.map((beverage, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    Beverage x {beverage.quantity} = €{beverage.total.toFixed(2)}
                  </Typography>
                  <IconButton size="small" onClick={() => removeBeverage(index)}>
                    <RemoveIcon />
                  </IconButton>
                </Box>
              ))}
            </Paper>

            {/* Other Items */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Other Items
              </Typography>
              {otherItems.map((item, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={5}>
                    <TextField
                      label="Item Description"
                      size="small"
                      fullWidth
                      value={item.name}
                      onChange={(e) => updateOtherItem(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Price (€)"
                      type="number"
                      size="small"
                      fullWidth
                      value={item.price}
                      onChange={(e) => updateOtherItem(index, 'price', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={addOtherItem}
                      fullWidth
                    >
                      Add
                    </Button>
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton 
                      onClick={() => removeOtherItem(index)}
                      disabled={otherItems.length === 1}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<CalculateIcon />}
            onClick={calculateBill}
          >
            Calculate Bill
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bill Display Dialog */}
      <Dialog open={showBill} onClose={() => setShowBill(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h5" gutterBottom>
            Bill - {calculatedBill?.customer.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bill #{calculatedBill?.billNumber} • {calculatedBill?.billDate}
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Box id="bill-content" sx={{ p: 2 }}>
            {/* Bill Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                Deep Blue Diving
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Caleta de Fuste, Fuerteventura, Spain
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tel: +34 123 456 789 • Email: info@deep-blue-diving.com
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Customer Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>Bill To:</Typography>
              <Typography variant="body1">{calculatedBill?.customer.name}</Typography>
              <Typography variant="body2" color="text.secondary">{calculatedBill?.customer.email}</Typography>
            </Box>

            {/* Bill Details */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Dives */}
                  {calculatedBill?.dives.map((dive, index) => (
                    <TableRow key={`dive-${index}`}>
                      <TableCell>
                        Dive on {dive.date} 
                        {dive.sessions && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {dive.sessions.morning ? 'Morning' : ''}
                            {dive.sessions.morning && dive.sessions.afternoon ? ', ' : ''}
                            {dive.sessions.afternoon ? 'Afternoon' : ''}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{dive.dives}</TableCell>
                      <TableCell align="right">€{dive.pricePerDive.toFixed(2)}</TableCell>
                      <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Beverages */}
                  {calculatedBill?.beverages.map((beverage, index) => (
                    <TableRow key={`beverage-${index}`}>
                      <TableCell>Beverage</TableCell>
                      <TableCell align="right">{beverage.quantity}</TableCell>
                      <TableCell align="right">€{beverage.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell align="right">€{beverage.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Other Items */}
                  {calculatedBill?.otherItems.map((item, index) => (
                    <TableRow key={`other-${index}`}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                      <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Equipment Rental */}
                  {calculatedBill?.equipmentTotal > 0 && (
                    <TableRow>
                      <TableCell>Equipment Rental</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">€{calculatedBill.equipmentTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Dive Insurance (Mandatory) */}
                  {calculatedBill?.breakdown.diveInsurance > 0 && (
                    <TableRow>
                      <TableCell>Dive Insurance (Mandatory)</TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                      <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Totals */}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="h6">Subtotal:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6">€{calculatedBill?.subtotal.toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography>IVA (21%):</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography>€{calculatedBill?.tax.toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="h5" color="primary">Total:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h5" color="primary">€{calculatedBill?.total.toFixed(2)}</Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Thank you for diving with us! Safe travels!
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowBill(false)}>Close</Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printBill}
          >
            Print
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadBill}
          >
            Download PDF
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BillGenerator;
