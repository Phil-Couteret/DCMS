import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  MenuItem,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  Event as EventIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { usePartnerAuth } from '../../utils/partnerAuthContext';
import { format } from 'date-fns';
import { httpClient } from '../../services/api/httpClient';
import dataService from '../../services/dataService';

const PartnerDashboard = () => {
  const { partner, logout } = usePartnerAuth();
  const [invoices, setInvoices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  
  // Customer dialog state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    nationality: '',
  });

  // Booking dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    customerId: '',
    createNewCustomer: false,
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
    locationId: '',
    bookingDate: '',
    activityType: 'scuba_diving',
    numberOfDives: 1,
    price: 0,
    discount: 0,
    totalPrice: 0,
    specialRequirements: '',
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [partner]);

  const loadData = async () => {
    if (!partner) return;

    setLoading(true);
    try {
      // Load invoices for this partner
      const invoicesData = await dataService.getAll('partnerInvoices');
      const partnerInvoices = Array.isArray(invoicesData)
        ? invoicesData.filter(inv => inv.partnerId === partner.id || inv.partner_id === partner.id)
        : [];
      
      setInvoices(partnerInvoices);

      // Load bookings for this partner
      try {
        const bookingsResponse = await httpClient.get('/partner/bookings');
        setBookings(Array.isArray(bookingsResponse) ? bookingsResponse : []);
      } catch (error) {
        console.error('Error loading partner bookings:', error);
        setBookings([]);
      }

      // Load customers for this partner
      try {
        const customersResponse = await httpClient.get('/partner/customers');
        setCustomers(Array.isArray(customersResponse) ? customersResponse : []);
      } catch (error) {
        console.error('Error loading partner customers:', error);
        setCustomers([]);
      }

      // Load locations
      try {
        const locationsData = await dataService.getAll('locations');
        const allowedLocations = partner.allowedLocations || partner.allowed_locations || [];
        if (allowedLocations.length > 0) {
          const filtered = Array.isArray(locationsData)
            ? locationsData.filter(loc => allowedLocations.includes(loc.id))
            : [];
          setLocations(filtered);
        } else {
          setLocations(Array.isArray(locationsData) ? locationsData : []);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  const handleCreateCustomer = async () => {
    try {
      const response = await httpClient.post('/partner/customers', customerFormData);
      setSnackbar({
        open: true,
        message: 'Customer created successfully!',
        severity: 'success'
      });
      setCustomerDialogOpen(false);
      setCustomerFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        nationality: '',
      });
      await loadData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error creating customer',
        severity: 'error'
      });
    }
  };

  const handleCreateBooking = async () => {
    try {
      const bookingData = {
        ...bookingFormData,
        bookingDate: bookingFormData.bookingDate,
        totalPrice: bookingFormData.price - (bookingFormData.discount || 0),
      };

      if (bookingFormData.createNewCustomer) {
        bookingData.customer = bookingFormData.customer;
        delete bookingData.customerId;
      } else {
        delete bookingData.customer;
      }

      const response = await httpClient.post('/partner/bookings', bookingData);
      setSnackbar({
        open: true,
        message: 'Booking created successfully!',
        severity: 'success'
      });
      setBookingDialogOpen(false);
      setBookingFormData({
        customerId: '',
        createNewCustomer: false,
        customer: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
        },
        locationId: '',
        bookingDate: '',
        activityType: 'scuba_diving',
        numberOfDives: 1,
        price: 0,
        discount: 0,
        totalPrice: 0,
        specialRequirements: '',
      });
      await loadData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error creating booking',
        severity: 'error'
      });
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€0.00';
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'info';
      case 'overdue': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  // Calculate statistics
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const totalCommission = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const paidAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount || inv.paid_amount) || 0), 0);
  const outstandingAmount = totalCommission - paidAmount;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {partner?.name || partner?.companyName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Partner Dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography color="text.secondary" variant="body2">
                  Total Invoices
                </Typography>
              </Box>
              <Typography variant="h4">{totalInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography color="text.secondary" variant="body2">
                  Total Commission
                </Typography>
              </Box>
              <Typography variant="h4">{formatCurrency(totalCommission)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography color="text.secondary" variant="body2">
                  Total Bookings
                </Typography>
              </Box>
              <Typography variant="h4">{bookings.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography color="text.secondary" variant="body2">
                  Total Customers
                </Typography>
              </Box>
              <Typography variant="h4">{customers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="Customers" />
          <Tab label="Bookings" />
          <Tab label="Invoices" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Commission Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Commission Rate
              </Typography>
              <Typography variant="h6">
                {partner?.commissionRate ? `${(parseFloat(partner.commissionRate || partner.commission_rate) * 100).toFixed(1)}%` : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Outstanding Amount
              </Typography>
              <Typography variant="h6" color="error.main">
                {formatCurrency(outstandingAmount)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Customers</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCustomerDialogOpen(true)}
            >
              Add Customer
            </Button>
          </Box>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : customers.length === 0 ? (
            <Typography color="text.secondary">No customers yet</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Nationality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        {customer.first_name || customer.firstName} {customer.last_name || customer.lastName}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.nationality}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Bookings</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setBookingDialogOpen(true)}
            >
              Create Booking
            </Button>
          </Box>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : bookings.length === 0 ? (
            <Typography color="text.secondary">No bookings yet</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Activity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bookings.map((booking) => {
                    const customer = booking.customers || booking.customer;
                    const location = booking.locations || booking.location;
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          {booking.booking_date ? format(new Date(booking.booking_date), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {customer ? `${customer.first_name || customer.firstName} ${customer.last_name || customer.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>{booking.activity_type || booking.activityType}</TableCell>
                        <TableCell>{location ? location.name : 'N/A'}</TableCell>
                        <TableCell align="right">{formatCurrency(booking.total_price || booking.totalPrice)}</TableCell>
                        <TableCell>
                          <Chip
                            label={booking.status || 'pending'}
                            size="small"
                            color={getStatusColor(booking.status)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Invoices
          </Typography>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : invoices.length === 0 ? (
            <Typography color="text.secondary">No invoices yet</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice Number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="right">Subtotal</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Outstanding</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.slice(0, 10).map((invoice) => {
                    const subtotal = parseFloat(invoice.subtotal) || 0;
                    const tax = parseFloat(invoice.tax) || 0;
                    const total = parseFloat(invoice.total) || 0;
                    const paid = parseFloat(invoice.paidAmount || invoice.paid_amount) || 0;
                    const outstanding = total - paid;
                    return (
                      <TableRow key={invoice.id} hover>
                        <TableCell>{invoice.invoiceNumber || invoice.invoice_number}</TableCell>
                        <TableCell>
                          {invoice.invoiceDate ? format(new Date(invoice.invoiceDate || invoice.invoice_date), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {invoice.dueDate ? format(new Date(invoice.dueDate || invoice.due_date), 'dd/MM/yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(subtotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(tax)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(total)}</TableCell>
                        <TableCell align="right">{formatCurrency(paid)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: outstanding > 0 ? 'bold' : 'normal', color: outstanding > 0 ? 'error.main' : 'text.primary' }}>
                          {formatCurrency(outstanding)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status || 'pending'}
                            size="small"
                            color={getStatusColor(invoice.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setInvoiceDetailOpen(true);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={customerFormData.firstName}
                onChange={(e) => setCustomerFormData({ ...customerFormData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={customerFormData.lastName}
                onChange={(e) => setCustomerFormData({ ...customerFormData, lastName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={customerFormData.email}
                onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={customerFormData.phone}
                onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={customerFormData.dob}
                onChange={(e) => setCustomerFormData({ ...customerFormData, dob: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nationality"
                value={customerFormData.nationality}
                onChange={(e) => setCustomerFormData({ ...customerFormData, nationality: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCustomer}
            variant="contained"
            disabled={!customerFormData.firstName || !customerFormData.lastName}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Booking</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Create New Customer?"
                value={bookingFormData.createNewCustomer ? 'yes' : 'no'}
                onChange={(e) => setBookingFormData({ ...bookingFormData, createNewCustomer: e.target.value === 'yes' })}
              >
                <MenuItem value="no">Use Existing Customer</MenuItem>
                <MenuItem value="yes">Create New Customer</MenuItem>
              </TextField>
            </Grid>

            {bookingFormData.createNewCustomer ? (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={bookingFormData.customer.firstName}
                    onChange={(e) => setBookingFormData({
                      ...bookingFormData,
                      customer: { ...bookingFormData.customer, firstName: e.target.value }
                    })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={bookingFormData.customer.lastName}
                    onChange={(e) => setBookingFormData({
                      ...bookingFormData,
                      customer: { ...bookingFormData.customer, lastName: e.target.value }
                    })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={bookingFormData.customer.email}
                    onChange={(e) => setBookingFormData({
                      ...bookingFormData,
                      customer: { ...bookingFormData.customer, email: e.target.value }
                    })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={bookingFormData.customer.phone}
                    onChange={(e) => setBookingFormData({
                      ...bookingFormData,
                      customer: { ...bookingFormData.customer, phone: e.target.value }
                    })}
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Customer"
                  value={bookingFormData.customerId}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, customerId: e.target.value })}
                  required
                >
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.first_name || customer.firstName} {customer.last_name || customer.lastName}
                      {customer.email ? ` (${customer.email})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Location"
                value={bookingFormData.locationId}
                onChange={(e) => setBookingFormData({ ...bookingFormData, locationId: e.target.value })}
                required
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Booking Date"
                type="date"
                value={bookingFormData.bookingDate}
                onChange={(e) => setBookingFormData({ ...bookingFormData, bookingDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Activity Type"
                value={bookingFormData.activityType}
                onChange={(e) => setBookingFormData({ ...bookingFormData, activityType: e.target.value })}
                required
              >
                <MenuItem value="scuba_diving">Scuba Diving</MenuItem>
                <MenuItem value="snorkeling">Snorkeling</MenuItem>
                <MenuItem value="discover_scuba">Discover Scuba</MenuItem>
                <MenuItem value="dive_course">Dive Course</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Number of Dives"
                type="number"
                value={bookingFormData.numberOfDives}
                onChange={(e) => setBookingFormData({ ...bookingFormData, numberOfDives: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={bookingFormData.price}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  setBookingFormData({
                    ...bookingFormData,
                    price,
                    totalPrice: price - (bookingFormData.discount || 0)
                  });
                }}
                InputProps={{ startAdornment: '€' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Discount"
                type="number"
                value={bookingFormData.discount}
                onChange={(e) => {
                  const discount = parseFloat(e.target.value) || 0;
                  setBookingFormData({
                    ...bookingFormData,
                    discount,
                    totalPrice: bookingFormData.price - discount
                  });
                }}
                InputProps={{ startAdornment: '€' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Price"
                value={formatCurrency(bookingFormData.totalPrice || bookingFormData.price - (bookingFormData.discount || 0))}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Requirements"
                value={bookingFormData.specialRequirements}
                onChange={(e) => setBookingFormData({ ...bookingFormData, specialRequirements: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateBooking}
            variant="contained"
            disabled={
              !bookingFormData.locationId ||
              !bookingFormData.bookingDate ||
              (!bookingFormData.customerId && (!bookingFormData.customer.firstName || !bookingFormData.customer.lastName))
            }
          >
            Create Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={invoiceDetailOpen} onClose={() => setInvoiceDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Invoice Details - {selectedInvoice?.invoiceNumber || selectedInvoice?.invoice_number || 'N/A'}
        </DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Invoice Date</Typography>
                  <Typography variant="body1">
                    {selectedInvoice.invoiceDate ? format(new Date(selectedInvoice.invoiceDate || selectedInvoice.invoice_date), 'dd/MM/yyyy') : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Due Date</Typography>
                  <Typography variant="body1">
                    {selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate || selectedInvoice.due_date), 'dd/MM/yyyy') : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                {selectedInvoice.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Breakdown</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {selectedInvoice.notes}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Invoice Summary</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'primary.light', bgcolor: 'rgba(25, 118, 210, 0.08)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Subtotal (Amount due before tax):</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(selectedInvoice.subtotal || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Tax (IGIC 7%):</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency(selectedInvoice.tax || 0)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Total Due:</Typography>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        {formatCurrency(selectedInvoice.total || 0)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      This is the amount you pay to the diving center (booking total - your commission + tax)
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="body1">Paid</Typography>
                    <Typography variant="body1">{formatCurrency(selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body1" fontWeight="bold">Outstanding</Typography>
                    <Typography variant="body1" fontWeight="bold" color="error.main">
                      {formatCurrency((selectedInvoice.total || 0) - (selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0))}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedInvoice && (() => {
            // Check if invoice has wrong calculation (old format)
            // Old calculation: subtotal = booking total, tax = commission * 0.07, total = commission + tax
            // New calculation: subtotal = booking total - commission, tax = (booking total - commission) * 0.07, total = subtotal + tax
            const subtotal = parseFloat(selectedInvoice.subtotal) || 0;
            const tax = parseFloat(selectedInvoice.tax) || 0;
            const total = parseFloat(selectedInvoice.total) || 0;
            // If total is very small compared to subtotal, it's likely the old calculation
            const isOldCalculation = subtotal > 0 && total < subtotal * 0.2;
            
            return (
              <>
                {isOldCalculation && (
                  <Button
                    color="warning"
                    onClick={async () => {
                      try {
                        // Get partner commission rate
                        const partnerData = await dataService.getById('partners', selectedInvoice.partnerId || selectedInvoice.partner_id);
                        const commissionRate = partnerData?.commissionRate || partnerData?.commission_rate || 0.1;
                        
                        // Recalculate: bookingTotal is the subtotal (what customer paid)
                        const bookingTotal = subtotal;
                        const commissionAmount = bookingTotal * parseFloat(commissionRate);
                        const amountDueBeforeTax = bookingTotal - commissionAmount;
                        const newTax = amountDueBeforeTax * 0.07;
                        const newTotal = amountDueBeforeTax + newTax;
                        
                        // Update invoice
                        const billId = selectedInvoice.billId || selectedInvoice.bill_id || 'N/A';
                        
                        await dataService.update('partnerInvoices', selectedInvoice.id, {
                          subtotal: amountDueBeforeTax,
                          tax: newTax,
                          total: newTotal,
                          notes: `Partner invoice - ${billId}. Customer paid: €${bookingTotal.toFixed(2)}, Partner commission (${(parseFloat(commissionRate) * 100).toFixed(1)}%): €${commissionAmount.toFixed(2)}, Amount due before tax: €${amountDueBeforeTax.toFixed(2)}, Tax (7% IGIC): €${newTax.toFixed(2)}, Total due: €${newTotal.toFixed(2)}`
                        });
                        
                        // Reload invoices
                        const invoicesData = await dataService.getAll('partnerInvoices');
                        const partnerInvoices = Array.isArray(invoicesData)
                          ? invoicesData.filter(inv => inv.partnerId === partner.id || inv.partner_id === partner.id)
                          : [];
                        setInvoices(partnerInvoices);
                        
                        // Update selected invoice
                        const updatedInvoice = partnerInvoices.find(inv => inv.id === selectedInvoice.id);
                        if (updatedInvoice) {
                          setSelectedInvoice(updatedInvoice);
                        }
                        
                        setSnackbar({ open: true, message: 'Invoice recalculated successfully!', severity: 'success' });
                        setInvoiceDetailOpen(false); // Close dialog to show updated table
                      } catch (error) {
                        console.error('Error recalculating invoice:', error);
                        setSnackbar({ open: true, message: `Error recalculating invoice: ${error.message || 'Please try again.'}`, severity: 'error' });
                      }
                    }}
                  >
                    Fix Calculation
                  </Button>
                )}
                <Button onClick={() => setInvoiceDetailOpen(false)}>Close</Button>
              </>
            );
          })()}
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PartnerDashboard;
