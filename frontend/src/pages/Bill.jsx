import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import dataService from '../services/dataService';
import stayService, { getCustomerStayBookings } from '../services/stayService';
import stayCostsService from '../services/stayCostsService';

const Bill = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stay = location.state?.stay;
  
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [billData, setBillData] = useState({
    dives: [],
    equipment: [],
    otherItems: []
  });
  const [otherItems, setOtherItems] = useState([{ name: '', price: 0 }]);
  const [calculatedBill, setCalculatedBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerInvoicesCreated, setPartnerInvoicesCreated] = useState(false);

  useEffect(() => {
    if (stay) {
      loadSettings().catch(err => console.error('[Bill] Error loading settings:', err));
      loadLocations().catch(err => console.error('[Bill] Error loading locations:', err));
      initializeBillData().catch(err => console.error('[Bill] Error initializing bill data:', err));
    } else {
      // No stay data - redirect back to stays
      navigate('/stays');
    }
  }, [stay, navigate]);

  const loadSettings = async () => {
    try {
      const settingsData = await dataService.getAll('settings');
      setSettings(Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : null);
    } catch (error) {
      console.warn('[Bill] Failed to load settings:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const locationsData = await dataService.getAll('locations');
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (error) {
      console.warn('[Bill] Failed to load locations:', error);
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
      console.log('[Bill] boatPreps not available (expected in API mode)');
      boatPreps = [];
    }
    
    try {
      diveSites = await dataService.getAll('diveSites');
      if (!Array.isArray(diveSites)) {
        diveSites = [];
      }
    } catch (error) {
      console.warn('[Bill] Failed to load dive sites:', error);
      diveSites = [];
    }

    // Get stay bookings and format them as bill items
    const stayBookings = await stayService.getCustomerStayBookings(stay.customer.id, stay.stayStartDate);
    const dives = [];

    for (const booking of stayBookings) {
      // Get dive site name from boat prep or dive site list
      let diveSiteName = 'Dive Site TBD';
      const boatPrep = boatPreps.find(bp => 
        bp.date === booking.bookingDate && 
        bp.session === (booking.diveSessions?.morning ? 'morning' : booking.diveSessions?.afternoon ? 'afternoon' : 'night')
      );
      
      if (boatPrep?.diveSiteId) {
        const site = diveSites.find(ds => ds.id === boatPrep.diveSiteId);
        if (site) {
          diveSiteName = site.name;
        }
      }

      // Calculate dive price from booking
      const divePrice = booking.totalPrice || booking.price || 0;
      const numberOfDives = booking.diveSessions ? 
        (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
        (booking.numberOfDives || 1);

      // Create a line item for each dive
      for (let i = 0; i < numberOfDives; i++) {
        const session = booking.diveSessions?.morning ? 'Morning' : 
                       booking.diveSessions?.afternoon ? 'Afternoon' : 
                       booking.diveSessions?.night ? 'Night' : 'Morning';
        
        dives.push({
          date: booking.bookingDate,
          diveSite: diveSiteName,
          session,
          price: divePrice / numberOfDives,
          total: divePrice / numberOfDives
        });
      }
    }

    setBillData({ dives, equipment: [], otherItems: [] });
    setLoading(false);
  };

  const calculateBill = useCallback(() => {
    if (!stay || !settings || !billData.dives.length) {
      return;
    }

    // Calculate dive totals (each dive is now a separate line)
    const diveTotal = (billData.dives || []).reduce((sum, dive) => {
      return sum + (dive.total || 0);
    }, 0);

    // Resolve location-specific pricing (using locations from state)
    const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) || localStorage.getItem('dcms_current_location');
    const location = Array.isArray(locations) ? locations.find(l => l.id === stayLocationId) : null;
    const pricing = (location?.pricing) || (settings.prices || {});

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

    // Calculate dive insurance
    let diveInsuranceTotal = 0;
    const customerInsurance = stay.customer?.divingInsurance;
    const hasYearlyInsurance = customerInsurance?.hasInsurance === true && customerInsurance?.expiryDate;
    let yearlyInsuranceValid = false;
    
    if (hasYearlyInsurance && customerInsurance.expiryDate) {
      try {
        const expiryDate = new Date(customerInsurance.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        if (!isNaN(expiryDate.getTime())) {
          yearlyInsuranceValid = expiryDate >= today;
        }
      } catch (e) {
        console.warn('[Bill] Error parsing insurance expiry date:', e);
        yearlyInsuranceValid = false;
      }
    }
    
    const hasInsuranceInStayCosts = stayAdditionalCosts.some(cost => cost.category === 'insurance');
    
    if (!yearlyInsuranceValid && !hasInsuranceInStayCosts && pricing.diveInsurance) {
      const stayStart = new Date(stay.stayStartDate);
      const today = new Date();
      const daysDifference = Math.ceil((today - stayStart) / (1000 * 60 * 60 * 24));
      
      if (daysDifference >= 365 && pricing.diveInsurance.one_year) {
        diveInsuranceTotal = pricing.diveInsurance.one_year || 45.00;
      } else if (daysDifference >= 30 && pricing.diveInsurance.one_month) {
        diveInsuranceTotal = pricing.diveInsurance.one_month || 25.00;
      } else if (daysDifference >= 7 && pricing.diveInsurance.one_week) {
        diveInsuranceTotal = pricing.diveInsurance.one_week || 18.00;
      } else {
        diveInsuranceTotal = pricing.diveInsurance.one_day || 7.00;
      }
    }

    const subtotal = diveTotal + otherTotal + equipmentTotal + diveInsuranceTotal + additionalCostsTotal;
    const tax = subtotal * ((pricing.tax && pricing.tax.igic_rate) || 0.07);
    const total = subtotal + tax;

    const bill = {
      customer: stay.customer,
      stayStartDate: stay.stayStartDate,
      billDate: new Date().toISOString().split('T')[0],
      billNumber: `BILL-${Date.now()}`,
      dives: billData.dives,
      otherItems: (otherItems || []).filter(item => item.name && item.price > 0),
      equipmentTotal,
      additionalCosts: stayAdditionalCosts,
      additionalCostsTotal,
      subtotal,
      tax,
      total,
      breakdown: {
        dives: diveTotal,
        equipment: equipmentTotal,
        diveInsurance: diveInsuranceTotal,
        additionalCosts: additionalCostsTotal,
        other: otherTotal
      }
    };

    setCalculatedBill(bill);
  }, [stay, settings, locations, billData, otherItems]);

  useEffect(() => {
    if (settings && locations.length > 0 && billData.dives.length > 0 && stay) {
      calculateBill();
    }
  }, [settings, locations, billData, stay, calculateBill]);

  // Create partner invoices when bill is calculated
  useEffect(() => {
    const createPartnerInvoices = async () => {
      if (!calculatedBill || partnerInvoicesCreated || !stay) return;

      try {
        // Get all bookings for this stay
        const stayBookings = await getCustomerStayBookings(stay.customer.id, stay.stayStartDate);
        
        // Group bookings by partner
        const bookingsByPartner = {};
        stayBookings.forEach(booking => {
          const partnerId = booking.partnerId || booking.partner_id;
          if (partnerId) {
            if (!bookingsByPartner[partnerId]) {
              bookingsByPartner[partnerId] = [];
            }
            bookingsByPartner[partnerId].push(booking);
          }
        });

        // Create invoice for each partner
        const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) || 
                               localStorage.getItem('dcms_current_location');
        
        for (const [partnerId, bookings] of Object.entries(bookingsByPartner)) {
          try {
            // Calculate commission using backend service
            const bookingIds = bookings.map(b => b.id);
            
            // Get partner to check commission rate
            const partner = await dataService.getById('partners', partnerId);
            if (!partner || partner.isActive === false) continue;

            const commissionRate = partner.commissionRate || partner.commission_rate || 0;
            if (!commissionRate || commissionRate === 0) continue;

            // Calculate subtotal and commission
            const subtotal = bookings.reduce((sum, booking) => {
              return sum + (parseFloat(booking.totalPrice || booking.total_price || booking.price || 0));
            }, 0);

            const commissionAmount = subtotal * parseFloat(commissionRate);
            const tax = commissionAmount * 0.07; // IGIC tax
            const total = commissionAmount + tax;

            // Create invoice
            const invoiceDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

            await dataService.create('partnerInvoices', {
              partnerId,
              customerId: stay.customer.id,
              billId: calculatedBill.billNumber,
              locationId: stayLocationId,
              invoiceDate,
              dueDate: dueDate.toISOString().split('T')[0],
              paymentTermsDays: 30,
              subtotal,
              tax,
              total,
              bookingIds,
              notes: `Commission for bill ${calculatedBill.billNumber} - ${bookings.length} booking(s)`
            });
          } catch (error) {
            console.error(`Error creating invoice for partner ${partnerId}:`, error);
            // Continue with other partners even if one fails
          }
        }

        setPartnerInvoicesCreated(true);
      } catch (error) {
        console.error('Error creating partner invoices:', error);
      }
    };

    createPartnerInvoices();
  }, [calculatedBill, stay, partnerInvoicesCreated]);

  const printBill = () => {
    window.print();
  };

  const downloadBill = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const billHtml = generateBillHTML();
    printWindow.document.write(billHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const emailBill = () => {
    if (!calculatedBill || !stay.customer.email) {
      alert('Customer email address not available.');
      return;
    }

    const subject = encodeURIComponent(`Invoice ${calculatedBill.billNumber} - Deep Blue Diving`);
    const body = encodeURIComponent(
      `Dear ${stay.customer.firstName} ${stay.customer.lastName},\n\n` +
      `Please find attached your invoice for your stay.\n\n` +
      `Invoice Number: ${calculatedBill.billNumber}\n` +
      `Stay Start Date: ${calculatedBill.stayStartDate}\n` +
      `Total Amount: €${calculatedBill.total.toFixed(2)}\n\n` +
      `Best regards,\nDeep Blue Diving`
    );
    
    // Create mailto link
    window.location.href = `mailto:${stay.customer.email}?subject=${subject}&body=${body}`;
  };

  const generateBillHTML = () => {
    if (!calculatedBill) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${calculatedBill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .bill-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Deep Blue Diving</h1>
          <h2>Invoice ${calculatedBill.billNumber}</h2>
        </div>
        <div class="bill-info">
          <p><strong>Customer:</strong> ${calculatedBill.customer.firstName} ${calculatedBill.customer.lastName}</p>
          <p><strong>Email:</strong> ${calculatedBill.customer.email || 'N/A'}</p>
          <p><strong>Bill Date:</strong> ${calculatedBill.billDate}</p>
          <p><strong>Stay Start:</strong> ${calculatedBill.stayStartDate}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${calculatedBill.dives.map(dive => `
              <tr>
                <td>${dive.diveSite} - ${dive.session}</td>
                <td>${dive.date}</td>
                <td>1</td>
                <td>€${dive.price.toFixed(2)}</td>
                <td>€${dive.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${calculatedBill.additionalCosts.map(cost => `
              <tr>
                <td>${cost.description || cost.category}</td>
                <td>${cost.date}</td>
                <td>${cost.quantity || 1}</td>
                <td>€${(cost.unitPrice || cost.total).toFixed(2)}</td>
                <td>€${cost.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="4" class="total">Subtotal:</td>
              <td>€${calculatedBill.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" class="total">IGIC (7%):</td>
              <td>€${calculatedBill.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" class="total">Total:</td>
              <td>€${calculatedBill.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  if (loading || !calculatedBill) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading bill...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/stays')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Invoice {calculatedBill.billNumber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={emailBill}
            disabled={!stay.customer.email}
          >
            Email Bill
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printBill}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadBill}
          >
            Download
          </Button>
        </Box>
      </Box>

      {/* Bill Content */}
      <Paper sx={{ p: 4 }}>
        {/* Company Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Deep Blue Diving
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Muelle Deportivo / Calle Teneriffe, E - 35610 Caleta de Fuste - Fuerteventura
          </Typography>
          <Typography variant="body2" color="text.secondary">
            +34.928 163 712 / +34.606 275 468 | info@deep-blue-diving.com
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Customer Info */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Bill To:</Typography>
          <Typography>{calculatedBill.customer.firstName} {calculatedBill.customer.lastName}</Typography>
          {calculatedBill.customer.email && (
            <Typography>{calculatedBill.customer.email}</Typography>
          )}
          {calculatedBill.customer.phone && (
            <Typography>{calculatedBill.customer.phone}</Typography>
          )}
        </Box>

        {/* Bill Details */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Invoice Number:</Typography>
            <Typography variant="body1" fontWeight="bold">{calculatedBill.billNumber}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Bill Date:</Typography>
            <Typography variant="body1">{calculatedBill.billDate}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Stay Start:</Typography>
            <Typography variant="body1">{calculatedBill.stayStartDate}</Typography>
          </Box>
        </Box>

        {/* Items Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Dives */}
              {calculatedBill.dives.map((dive, index) => (
                <TableRow key={`dive-${index}`}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {dive.diveSite}
                    </Typography>
                    {dive.session && (
                      <Typography variant="caption" color="text.secondary">
                        {dive.session}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{dive.date}</TableCell>
                  <TableCell align="right">1</TableCell>
                  <TableCell align="right">€{dive.price.toFixed(2)}</TableCell>
                  <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}

              {/* Additional Costs */}
              {calculatedBill.additionalCosts.map((cost, index) => (
                <TableRow key={`cost-${index}`}>
                  <TableCell>{cost.description || cost.category}</TableCell>
                  <TableCell>{cost.date}</TableCell>
                  <TableCell align="right">{cost.quantity || 1}</TableCell>
                  <TableCell align="right">€{(cost.unitPrice || cost.total).toFixed(2)}</TableCell>
                  <TableCell align="right">€{cost.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}

              {/* Equipment */}
              {calculatedBill.breakdown.equipment > 0 && (
                <TableRow>
                  <TableCell>Equipment Rental</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right">€{calculatedBill.breakdown.equipment.toFixed(2)}</TableCell>
                </TableRow>
              )}

              {/* Dive Insurance */}
              {calculatedBill.breakdown.diveInsurance > 0 && (
                <TableRow>
                  <TableCell>Dive Insurance</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                </TableRow>
              )}

              {/* Totals */}
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="body1" fontWeight="bold">Subtotal:</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold">
                    €{calculatedBill.subtotal.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="body1">IGIC (7%):</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1">€{calculatedBill.tax.toFixed(2)}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="h6" fontWeight="bold">Total:</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6" fontWeight="bold">
                    €{calculatedBill.total.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 4 }} />

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Thank you for diving with Deep Blue Diving!
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Bill;

