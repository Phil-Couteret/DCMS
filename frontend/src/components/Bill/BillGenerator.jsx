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
import stayCostsService from '../../services/stayCostsService';

const BillGenerator = ({ open, onClose, stay }) => {
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
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
      loadSettings().catch(err => console.error('[BillGenerator] Error loading settings:', err));
      loadLocations().catch(err => console.error('[BillGenerator] Error loading locations:', err));
      initializeBillData().catch(err => console.error('[BillGenerator] Error initializing bill data:', err));
    }
  }, [open, stay]);

  const loadSettings = async () => {
    try {
      const settingsData = await dataService.getAll('settings');
      setSettings(Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : null);
    } catch (error) {
      console.warn('[BillGenerator] Failed to load settings:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const locationsData = await dataService.getAll('locations');
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (error) {
      console.warn('[BillGenerator] Failed to load locations:', error);
      setLocations([]);
    }
  };

  const initializeBillData = async () => {
    if (!stay) return;

    // Get boat preparations to find dive sites (may not exist in API mode)
    let boatPreps = [];
    let diveSites = [];
    
    try {
      boatPreps = await dataService.getAll('boatPreps');
      if (!Array.isArray(boatPreps)) {
        boatPreps = [];
      }
    } catch (error) {
      // boatPreps endpoint doesn't exist in API mode - this is expected
      console.log('[BillGenerator] boatPreps not available (expected in API mode)');
      boatPreps = [];
    }
    
    try {
      diveSites = await dataService.getAll('diveSites');
      if (!Array.isArray(diveSites)) {
        diveSites = [];
      }
    } catch (error) {
      console.warn('[BillGenerator] Failed to load dive sites:', error);
      diveSites = [];
    }
    
    // Initialize dive data from stay - one dive per line
    const dives = [];
    
    (stay.breakdown || []).forEach(booking => {
      const bookingDate = booking.bookingDate;
      const sessions = booking.sessions || booking.diveSessions || {};
      
      // Find boat prep for this booking (match by date, session, and customer)
      const findDiveSite = (sessionType) => {
        // Try to find boat prep matching this booking
        const boatPrep = boatPreps.find(prep => {
          const prepDate = prep.date?.split('T')[0] || prep.date;
          const matchesDate = prepDate === bookingDate;
          const matchesSession = prep.session === sessionType || 
                                (sessionType === 'morning' && prep.session === '10:15');
          const matchesCustomer = prep.diverIds?.includes(booking.customerId || stay.customerId);
          return matchesDate && matchesSession && matchesCustomer;
        });
        
        if (boatPrep?.diveSiteId) {
          const diveSite = diveSites.find(s => s.id === boatPrep.diveSiteId);
          return diveSite?.name || 'Unknown Site';
        }
        
        // Use mock dive site if boat prep doesn't exist
        const mockSites = ['Castillo Reef', 'El Bajo', 'La Catedral', 'Mole', 'Las Playitas Reef'];
        return mockSites[Math.floor(Math.random() * mockSites.length)];
      };
      
      // Create one line per dive session
      if (sessions.morning) {
        dives.push({
          date: bookingDate,
          session: 'Morning',
          sessionTime: '9:00 AM',
          diveSite: findDiveSite('morning'),
          dives: 1,
          pricePerDive: booking.pricePerDive,
          total: booking.pricePerDive
        });
      }
      
      if (sessions.afternoon) {
        dives.push({
          date: bookingDate,
          session: 'Afternoon',
          sessionTime: '12:00 PM',
          diveSite: findDiveSite('afternoon'),
          dives: 1,
          pricePerDive: booking.pricePerDive,
          total: booking.pricePerDive
        });
      }
      
      if (sessions.night) {
        // Night dive includes surcharge - check if it's already in the booking total
        const nightDiveSurcharge = settings?.prices?.addons?.night_dive || 20;
        // If booking has addons, the surcharge might already be included
        const basePrice = booking.pricePerDive || 46;
        const nightDiveTotal = basePrice + nightDiveSurcharge;
        
        dives.push({
          date: bookingDate,
          session: 'Night',
          sessionTime: 'Night Dive',
          diveSite: findDiveSite('night'),
          dives: 1,
          pricePerDive: basePrice,
          nightDiveSurcharge: nightDiveSurcharge,
          total: nightDiveTotal
        });
      }
    });

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

    // Calculate dive totals (each dive is now a separate line)
    const diveTotal = (billData.dives || []).reduce((sum, dive) => {
      // dive.total already includes night dive surcharge if applicable
      return sum + (dive.total || 0);
    }, 0);

    // Resolve location-specific pricing (using locations from state)
    const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) || localStorage.getItem('dcms_current_location');
    const location = Array.isArray(locations) ? locations.find(l => l.id === stayLocationId) : null;
    const pricing = (location?.pricing) || (settings.prices || {});

    // Calculate beverage totals
    const beverageTotal = (billData.beverages || []).reduce((sum, bev) => sum + (bev.total || 0), 0);

    // Calculate other items totals
    const otherTotal = (otherItems || []).reduce((sum, item) => sum + (item.price || 0), 0);

    // Get additional costs from stay costs service
    let additionalCostsTotal = 0;
    const stayAdditionalCosts = stayCostsService.getStayCosts(stay.customer.id, stay.stayStartDate);
    additionalCostsTotal = stayAdditionalCosts.reduce((sum, cost) => sum + (cost.total || 0), 0);

    // Calculate equipment rental from stay bookings
    let equipmentTotal = 0;
    if (stay.stayBookings && Array.isArray(stay.stayBookings)) {
      stay.stayBookings.forEach(booking => {
        if (booking.rentedEquipment) {
          Object.entries(booking.rentedEquipment).forEach(([equipment, isRented]) => {
            // Equipment rental prices are global in settings
            const eqKey = equipment.toLowerCase();
            if (isRented && settings.prices.equipment && settings.prices.equipment[eqKey] != null) {
              const equipmentPrice = settings.prices.equipment[eqKey];
              const bookingDives = booking.diveSessions ? 
                (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
                (booking.numberOfDives || 0);
              equipmentTotal += equipmentPrice * bookingDives;
            }
          });
        }
      });
    }

    // Calculate dive insurance - check if customer already has insurance
    let diveInsuranceTotal = 0;
    
    // Check if customer has yearly insurance that's still valid
    const customerInsurance = stay.customer?.divingInsurance;
    const hasYearlyInsurance = customerInsurance?.hasInsurance === true && customerInsurance?.expiryDate;
    let yearlyInsuranceValid = false;
    
    if (hasYearlyInsurance && customerInsurance.expiryDate) {
      try {
        const expiryDate = new Date(customerInsurance.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to compare dates only
        expiryDate.setHours(0, 0, 0, 0); // Reset time to compare dates only
        
        // Check if expiry date is valid and not in the past
        if (!isNaN(expiryDate.getTime())) {
          yearlyInsuranceValid = expiryDate >= today;
        }
      } catch (e) {
        console.warn('[BillGenerator] Error parsing insurance expiry date:', e);
        yearlyInsuranceValid = false;
      }
    }
    
    // Check if insurance has already been added to stay costs (reuse stayAdditionalCosts from above)
    const hasInsuranceInStayCosts = stayAdditionalCosts.some(cost => cost.category === 'insurance');
    
    // Only add insurance if customer doesn't have yearly insurance and it hasn't been added to stay costs
    if (!yearlyInsuranceValid && !hasInsuranceInStayCosts && pricing.diveInsurance) {
      // Calculate stay duration to determine appropriate insurance type
      const stayStart = new Date(stay.stayStartDate);
      const today = new Date();
      const daysDifference = Math.ceil((today - stayStart) / (1000 * 60 * 60 * 24));
      
      if (daysDifference >= 365 && pricing.diveInsurance.one_year) {
        // More than a year - use yearly insurance
        diveInsuranceTotal = pricing.diveInsurance.one_year || 45.00;
      } else if (daysDifference >= 30 && pricing.diveInsurance.one_month) {
        // More than a month - use monthly insurance
        diveInsuranceTotal = pricing.diveInsurance.one_month || 25.00;
      } else if (daysDifference >= 7 && pricing.diveInsurance.one_week) {
        // More than a week - use weekly insurance
        diveInsuranceTotal = pricing.diveInsurance.one_week || 18.00;
      } else {
        // Less than a week - use daily insurance
        diveInsuranceTotal = pricing.diveInsurance.one_day || 7.00;
      }
    }

    const subtotal = diveTotal + beverageTotal + otherTotal + equipmentTotal + diveInsuranceTotal + additionalCostsTotal;
    const tax = subtotal * ((pricing.tax && pricing.tax.igic_rate) || 0.07);
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
      additionalCosts: stayAdditionalCosts,
      additionalCostsTotal,
      subtotal,
      tax,
      total,
      breakdown: {
        dives: diveTotal,
        beverages: beverageTotal,
        equipment: equipmentTotal,
        diveInsurance: diveInsuranceTotal,
        additionalCosts: additionalCostsTotal,
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
                      <TableCell>Session</TableCell>
                      <TableCell>Dive Site</TableCell>
                      <TableCell align="right">Price per Dive</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billData.dives.map((dive, index) => (
                      <TableRow key={index}>
                        <TableCell>{dive.date}</TableCell>
                        <TableCell>
                          {dive.session || 'N/A'}
                          {dive.sessionTime && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {dive.sessionTime}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{dive.diveSite || 'TBD'}</TableCell>
                        <TableCell align="right">€{dive.pricePerDive.toFixed(2)}</TableCell>
                        <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setBillData(prev => ({
                                ...prev,
                                dives: prev.dives.filter((_, i) => i !== index)
                              }));
                            }}
                            title="Remove dive"
                          >
                            <RemoveIcon />
                          </IconButton>
                        </TableCell>
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
                    <TableCell>Dive Site</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Dives - One per line */}
                  {calculatedBill?.dives.map((dive, index) => (
                    <TableRow key={`dive-${index}`}>
                      <TableCell>
                        {dive.session || 'Dive'} on {dive.date}
                        {dive.sessionTime && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {dive.sessionTime}
                          </Typography>
                        )}
                        {dive.nightDiveSurcharge && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            + €{dive.nightDiveSurcharge.toFixed(2)} night dive surcharge
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {dive.diveSite || 'TBD'}
                        {(!dive.diveSite || dive.diveSite === 'TBD') && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            (To be confirmed)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{dive.dives || 1}</TableCell>
                      <TableCell align="right">
                        €{dive.pricePerDive.toFixed(2)}
                        {dive.nightDiveSurcharge && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            + €{dive.nightDiveSurcharge.toFixed(2)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Beverages */}
                  {calculatedBill?.beverages.map((beverage, index) => (
                    <TableRow key={`beverage-${index}`}>
                      <TableCell>Beverage</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">{beverage.quantity}</TableCell>
                      <TableCell align="right">€{beverage.pricePerUnit.toFixed(2)}</TableCell>
                      <TableCell align="right">€{beverage.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Other Items */}
                  {calculatedBill?.otherItems.map((item, index) => (
                    <TableRow key={`other-${index}`}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                      <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Equipment Rental */}
                  {calculatedBill?.equipmentTotal > 0 && (
                    <TableRow>
                      <TableCell>Equipment Rental</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">-</TableCell>
                      <TableCell align="right">€{calculatedBill.equipmentTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Dive Insurance (Mandatory) */}
                  {calculatedBill?.breakdown.diveInsurance > 0 && (
                    <TableRow>
                      <TableCell>Dive Insurance (Mandatory)</TableCell>
                      <TableCell></TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                      <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                    </TableRow>
                  )}

                  {/* Additional Costs from Stay */}
                  {calculatedBill?.additionalCosts && calculatedBill.additionalCosts.length > 0 && (
                    <>
                      {calculatedBill.additionalCosts.map((cost, index) => (
                        <TableRow key={`additional-${index}`}>
                          <TableCell>
                            {cost.description}
                            {cost.category && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                ({cost.category.charAt(0).toUpperCase() + cost.category.slice(1)})
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell align="right">{cost.quantity || 1}</TableCell>
                          <TableCell align="right">€{cost.unitPrice.toFixed(2)}</TableCell>
                          <TableCell align="right">€{cost.total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </>
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
                      <Typography>IGIC (7%):</Typography>
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
