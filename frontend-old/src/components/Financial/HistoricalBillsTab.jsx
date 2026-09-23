// Presentational component for the Financial page "HistoricalBillsTab" tab.
// Extracted from Financial.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useFinancialData() and is passed in via props.
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Print as PrintIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const HistoricalBillsTab = (props) => {
  const {
    bills, billsLoading, customerFilter, customers, endDate, filteredBills, formatCurrency, 
    formatDate, getBillCustomerName, handlePrintBill, handleViewBill, loadBills, 
    setCustomerFilter, setEndDate, setStartDate, startDate, 
    t
  } = props;

  return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5">Historical Bills</Typography>
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
                  <Typography variant="h4">{bills.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Amount
                  </Typography>
                  <Typography variant="h4">{formatCurrency(bills.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0))}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Tax
                  </Typography>
                  <Typography variant="h4">{formatCurrency(bills.reduce((sum, bill) => sum + (parseFloat(bill.tax) || 0), 0))}</Typography>
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
                    <MenuItem value="">{t('financial.allCustomers')}</MenuItem>
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
          {billsLoading ? (
            <Typography>Loading bills...</Typography>
          ) : (
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
                        <TableCell>{getBillCustomerName(bill)}</TableCell>
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
          )}
        </Box>

  );
};

export default HistoricalBillsTab;
