// Presentational component for the Financial page "CurrentFinancialTab" tab.
// Extracted from Financial.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useFinancialData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const CurrentFinancialTab = (props) => {
  const {
    financialSummary, formatCurrency, getCustomerName, getExpenseCategories, handleAddExpense, 
    handleAddIncome, handleCloseDay, handleDateChange, handleDeleteExpense, handleDeleteIncome, 
    isAdmin, isBikeRental, loading, selectedDate, 
    t
  } = props;

  return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label={t('financial.selectDate')}
                type="date"
                value={selectedDate instanceof Date 
                  ? selectedDate.toISOString().split('T')[0] 
                  : selectedDate}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 200 }}
              />
              {isAdmin && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<TrendingDownIcon />}
                    onClick={handleAddExpense}
                  >
                    {t('financial.addExpense')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<TrendingUpIcon />}
                    onClick={handleAddIncome}
                  >
                    {t('financial.addIncome')}
                  </Button>
                  {!isBikeRental && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CloseIcon />}
                      onClick={handleCloseDay}
                    >
                      {t('financial.closeTheDay')}
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Box>

          {loading ? (
            <Typography>{t('financial.loading')}</Typography>
          ) : !financialSummary ? (
            <Alert severity="error">{t('financial.errorLoading')}</Alert>
          ) : (
            <>
              {/* Daily Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {t('financial.totalIncome')}
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(financialSummary.totalIncome)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {t('financial.totalExpenses')}
              </Typography>
              <Typography variant="h4" color="error">
                {formatCurrency(financialSummary.expenses.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Net Profit
              </Typography>
              <Typography 
                variant="h4" 
                color={financialSummary.netProfit >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(financialSummary.netProfit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Booking Income
              </Typography>
              <Typography variant="h4" color="info.main">
                {formatCurrency(financialSummary.bookingIncome.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Income Breakdown */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Income from Bookings
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Diving: {formatCurrency(financialSummary.bookingIncome.diving)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'diving')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Discovery: {formatCurrency(financialSummary.bookingIncome.discovery)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'discover' || d.activityType === 'discovery' || d.activityType === 'try_dive' || d.activityType === 'try_scuba' || d.activityType === 'orientation')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Snorkeling: {formatCurrency(financialSummary.bookingIncome.snorkeling)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Number of dives: {financialSummary.bookingIncome.details
                .filter(d => d.activityType === 'snorkeling' || d.activityType === 'snorkel')
                .reduce((sum, d) => sum + d.numberOfDives, 0)}
            </Typography>
          </Grid>
        </Grid>

        {financialSummary.bookingIncome.details.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Activity Type</TableCell>
                  <TableCell>Number of Dives</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Customer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.bookingIncome.details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <Chip 
                        label={detail.activityType === 'diving' ? 'Diving' : 
                               (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'Discovery' :
                               'Snorkeling'}
                        size="small"
                        color={detail.activityType === 'diving' ? 'primary' : 
                               (detail.activityType === 'discover' || detail.activityType === 'discovery' || detail.activityType === 'try_dive' || detail.activityType === 'try_scuba' || detail.activityType === 'orientation') ? 'secondary' :
                               'info'}
                      />
                    </TableCell>
                    <TableCell>{detail.numberOfDives}</TableCell>
                    <TableCell>{formatCurrency(detail.price)}</TableCell>
                    <TableCell>{getCustomerName(detail.customerId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Manual Income */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Manual Income (Not from Bookings)
          </Typography>
          <Typography variant="body1" color="primary">
            Total: {formatCurrency(financialSummary.manualIncome.total)}
          </Typography>
        </Box>
        {financialSummary.manualIncome.entries.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Notes</TableCell>
                  {isAdmin && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.manualIncome.entries.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{income.description}</TableCell>
                    <TableCell>{formatCurrency(income.amount)}</TableCell>
                    <TableCell>{income.notes || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteIncome(income.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No manual income entries for this date.
          </Typography>
        )}
      </Paper>

      {/* Expenses */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Expenses
          </Typography>
          <Typography variant="body1" color="error">
            Total: {formatCurrency(financialSummary.expenses.total)}
          </Typography>
        </Box>
        {financialSummary.expenses.entries.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Notes</TableCell>
                  {isAdmin && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {financialSummary.expenses.entries.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Chip 
                        label={getExpenseCategories().find(c => c.value === expense.category)?.label || expense.category}
                        size="small"
                        color="error"
                      />
                    </TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>{expense.notes || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No expenses recorded for this date.
          </Typography>
        )}
      </Paper>
            </>
          )}
        </Box>

  );
};

export default CurrentFinancialTab;
