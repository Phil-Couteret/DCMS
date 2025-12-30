import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Snackbar,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import dataService from '../services/dataService';
import { useAuth } from '../utils/authContext';
import { format } from 'date-fns';

const PartnerInvoices = () => {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadInvoices();
    loadPartners();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, selectedPartner, statusFilter]);

  const loadInvoices = async () => {
    try {
      const allInvoices = await dataService.getAll('partnerInvoices') || [];
      console.log('[PartnerInvoices] Loaded invoices:', allInvoices);
      setInvoices(Array.isArray(allInvoices) ? allInvoices : []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    }
  };

  const loadPartners = async () => {
    try {
      const allPartners = await dataService.getAll('partners') || [];
      setPartners(Array.isArray(allPartners) ? allPartners : []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    if (selectedPartner !== 'all') {
      filtered = filtered.filter(inv => inv.partnerId === selectedPartner || inv.partner_id === selectedPartner);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const handleMarkAsPaid = (invoice) => {
    setSelectedInvoice(invoice);
    setPaidAmount(invoice.total?.toString() || '0');
    setPayDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedInvoice) return;

    try {
      const amount = parseFloat(paidAmount);
      if (isNaN(amount) || amount < 0) {
        setSnackbar({
          open: true,
          message: 'Please enter a valid amount',
          severity: 'error'
        });
        return;
      }

      await dataService.update('partnerInvoices', selectedInvoice.id, {
        paidAmount: amount,
        status: amount >= selectedInvoice.total ? 'paid' : (amount > 0 ? 'partial' : 'pending')
      });

      setSnackbar({
        open: true,
        message: 'Payment updated successfully!',
        severity: 'success'
      });

      setPayDialogOpen(false);
      setSelectedInvoice(null);
      setPaidAmount('');
      await loadInvoices();
    } catch (error) {
      console.error('Error updating payment:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error updating payment',
        severity: 'error'
      });
    }
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

  // Calculate statistics
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
  const paidAmountTotal = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount || inv.paid_amount) || 0), 0);
  const outstandingAmount = totalAmount - paidAmountTotal;

  // Get partner name
  const getPartnerName = (invoice) => {
    if (invoice.partner) {
      return invoice.partner.name || invoice.partner.companyName || invoice.partner.company_name;
    }
    const partner = partners.find(p => p.id === invoice.partnerId || p.id === invoice.partner_id);
    return partner ? (partner.name || partner.companyName || partner.company_name) : 'Unknown';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ReceiptIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Partner Invoices
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage partner invoices and commission payments
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInvoices}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Invoices
              </Typography>
              <Typography variant="h4">{totalInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">{pendingInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Amount
              </Typography>
              <Typography variant="h4">{formatCurrency(totalAmount)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Outstanding
              </Typography>
              <Typography variant="h4" color="error.main">{formatCurrency(outstandingAmount)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Partner</InputLabel>
              <Select
                value={selectedPartner}
                label="Partner"
                onChange={(e) => setSelectedPartner(e.target.value)}
              >
                <MenuItem value="all">All Partners</MenuItem>
                {partners.map(partner => (
                  <MenuItem key={partner.id} value={partner.id}>
                    {partner.name || partner.companyName || partner.company_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="partial">Partial</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Invoices Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice Number</TableCell>
              <TableCell>Partner</TableCell>
              <TableCell>Invoice Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Outstanding</TableCell>
              <TableCell>Status</TableCell>
              {isAdmin() && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin() ? 9 : 8} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {invoices.length === 0
                      ? 'No invoices found. Partner invoices are created automatically when bills are finalized for partner customers. Check the browser console (F12) for debugging information.'
                      : 'No invoices match the selected filters.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const total = parseFloat(invoice.total) || 0;
                const paid = parseFloat(invoice.paidAmount || invoice.paid_amount) || 0;
                const outstanding = total - paid;
                const isOverdue = invoice.status !== 'paid' && new Date(invoice.dueDate || invoice.due_date) < new Date();

                return (
                  <TableRow key={invoice.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {invoice.invoiceNumber || invoice.invoice_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{getPartnerName(invoice)}</TableCell>
                    <TableCell>{formatDate(invoice.invoiceDate || invoice.invoice_date)}</TableCell>
                    <TableCell>
                      <Typography color={isOverdue ? 'error.main' : 'text.primary'}>
                        {formatDate(invoice.dueDate || invoice.due_date)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(total)}</TableCell>
                    <TableCell align="right">{formatCurrency(paid)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight="medium"
                        color={outstanding > 0 ? 'error.main' : 'text.primary'}
                      >
                        {formatCurrency(outstanding)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isOverdue && invoice.status !== 'paid' ? 'Overdue' : invoice.status || 'pending'}
                        size="small"
                        color={getStatusColor(isOverdue && invoice.status !== 'paid' ? 'overdue' : invoice.status)}
                      />
                    </TableCell>
                    {isAdmin() && (
                      <TableCell align="right">
                        <Tooltip title="Mark as Paid">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleMarkAsPaid(invoice)}
                            disabled={invoice.status === 'paid'}
                          >
                            <CheckIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Dialog */}
      <Dialog
        open={payDialogOpen}
        onClose={() => {
          setPayDialogOpen(false);
          setSelectedInvoice(null);
          setPaidAmount('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Invoice: <strong>{selectedInvoice.invoiceNumber || selectedInvoice.invoice_number}</strong>
                </Typography>
                <Typography variant="body2">
                  Partner: <strong>{getPartnerName(selectedInvoice)}</strong>
                </Typography>
                <Typography variant="body2">
                  Total Amount: <strong>{formatCurrency(selectedInvoice.total)}</strong>
                </Typography>
                <Typography variant="body2">
                  Already Paid: <strong>{formatCurrency(selectedInvoice.paidAmount || selectedInvoice.paid_amount || 0)}</strong>
                </Typography>
              </Alert>
              <TextField
                fullWidth
                label="Paid Amount"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                helperText={`Enter the amount paid (total: ${formatCurrency(selectedInvoice.total)})`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPayDialogOpen(false);
            setSelectedInvoice(null);
            setPaidAmount('');
          }}>Cancel</Button>
          <Button onClick={handleSavePayment} variant="contained" disabled={!paidAmount}>
            Save Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default PartnerInvoices;

