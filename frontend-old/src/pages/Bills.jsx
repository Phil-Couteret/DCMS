import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Tooltip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import { format } from 'date-fns';

const Bills = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadBills();
    loadCustomers();
  }, []);

  useEffect(() => {
    filterBills();
  }, [bills, customerFilter, startDate, endDate]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const allBills = await dataService.getAll('customerBills') || [];
      setBills(Array.isArray(allBills) ? allBills : []);
    } catch (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const allCustomers = await dataService.getAll('customers') || [];
      setCustomers(Array.isArray(allCustomers) ? allCustomers : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const filterBills = () => {
    let filtered = [...bills];

    if (customerFilter) {
      filtered = filtered.filter(bill => {
        const billCustomerId = bill.customerId || bill.customer_id;
        return billCustomerId === customerFilter;
      });
    }

    if (startDate) {
      filtered = filtered.filter(bill => {
        const billDate = bill.billDate || bill.bill_date;
        return billDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(bill => {
        const billDate = bill.billDate || bill.bill_date;
        return billDate <= endDate;
      });
    }

    setFilteredBills(filtered);
  };

  const getCustomerName = (bill) => {
    if (bill.customer) {
      const firstName = bill.customer.firstName || bill.customer.first_name || '';
      const lastName = bill.customer.lastName || bill.customer.last_name || '';
      return `${firstName} ${lastName}`.trim() || bill.customer.email || 'Unknown';
    }
    return 'Unknown';
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€0.00';
    return `€${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy');
    } catch {
      return date;
    }
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setViewDialogOpen(true);
  };

  const handlePrintBill = (bill) => {
    // TODO: Implement print functionality
    window.print();
  };

  // Calculate statistics
  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0);
  const totalTax = bills.reduce((sum, bill) => sum + (parseFloat(bill.tax) || 0), 0);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading bills...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Historical Bills
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all billed stays for tax control
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadBills}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Bills
              </Typography>
              <Typography variant="h4">{totalBills}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Amount
              </Typography>
              <Typography variant="h4">{formatCurrency(totalAmount)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Tax
              </Typography>
              <Typography variant="h4">{formatCurrency(totalTax)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Customer</InputLabel>
              <Select
                value={customerFilter}
                label="Customer"
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <MenuItem value="">All Customers</MenuItem>
                {customers.map(customer => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.firstName || customer.first_name} {customer.lastName || customer.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Bills Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Bill Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Bill Date</TableCell>
              <TableCell>Stay Start</TableCell>
              <TableCell align="right">Subtotal</TableCell>
              <TableCell align="right">Tax</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {bills.length === 0
                      ? 'No bills found. Bills are created automatically when stays are closed.'
                      : 'No bills match the selected filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {bill.billNumber || bill.bill_number}
                    </Typography>
                  </TableCell>
                  <TableCell>{getCustomerName(bill)}</TableCell>
                  <TableCell>{formatDate(bill.billDate || bill.bill_date)}</TableCell>
                  <TableCell>{formatDate(bill.stayStartDate || bill.stay_start_date)}</TableCell>
                  <TableCell align="right">{formatCurrency(bill.subtotal)}</TableCell>
                  <TableCell align="right">{formatCurrency(bill.tax)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {formatCurrency(bill.total)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Bill">
                      <IconButton
                        size="small"
                        onClick={() => handleViewBill(bill)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton
                        size="small"
                        onClick={() => handlePrintBill(bill)}
                      >
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Bill Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Bill Details - {selectedBill?.billNumber || selectedBill?.bill_number}
        </DialogTitle>
        <DialogContent>
          {selectedBill && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Customer</Typography>
                  <Typography variant="body1">{getCustomerName(selectedBill)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Bill Date</Typography>
                  <Typography variant="body1">{formatDate(selectedBill.billDate || selectedBill.bill_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Stay Start</Typography>
                  <Typography variant="body1">{formatDate(selectedBill.stayStartDate || selectedBill.stay_start_date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="h6">{formatCurrency(selectedBill.total)}</Typography>
                </Grid>
              </Grid>

              {/* Bill Items */}
              {selectedBill.billItems && selectedBill.billItems.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Bill Items</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Unit Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedBill.billItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={item.type} size="small" />
                            </TableCell>
                            <TableCell>{item.description || item.name || item.diveSite || '-'}</TableCell>
                            <TableCell>{item.date ? formatDate(item.date) : '-'}</TableCell>
                            <TableCell align="right">{item.quantity || 1}</TableCell>
                            <TableCell align="right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Payment Split */}
              {(selectedBill.partnerPaidTotal > 0 || selectedBill.partner_paid_total > 0) && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Partner Payment:</strong> {formatCurrency(selectedBill.partnerPaidTotal || selectedBill.partner_paid_total || 0)} 
                    {selectedBill.partnerTax || selectedBill.partner_tax > 0 ? ` (Tax: ${formatCurrency(selectedBill.partnerTax || selectedBill.partner_tax)})` : ''}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Customer Payment:</strong> {formatCurrency(selectedBill.customerPaidTotal || selectedBill.customer_paid_total || 0)}
                    {selectedBill.customerTax || selectedBill.customer_tax > 0 ? ` (Tax: ${formatCurrency(selectedBill.customerTax || selectedBill.customer_tax)})` : ''}
                  </Typography>
                </Alert>
              )}

              {/* Summary */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1">{formatCurrency(selectedBill.subtotal)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Tax (IGIC)</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="body1">{formatCurrency(selectedBill.tax)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6">Total</Typography>
                  </Grid>
                  <Grid item xs={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{formatCurrency(selectedBill.total)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => handlePrintBill(selectedBill)}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bills;

