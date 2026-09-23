// Presentational component for the Financial page "FinancialDialogs" (dialogs).
// Extracted from Financial.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useFinancialData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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
  Close as CloseIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  Email as EmailIcon
} from '@mui/icons-material';

const FinancialDialogs = (props) => {
  const {
    dailyReportHtml, expenseFormData, formatCurrency, formatDate, generateDailyReportHTML, 
    getBillCustomerName, getExpenseCategories, handleDownloadReport, handleEmailReport, 
    handlePrintBill, handleSaveExpense, handleSaveIncome, handleStoreReport, incomeFormData, 
    selectedBill, selectedDate, selectedReport, setExpenseFormData, setIncomeFormData, 
    setShowCloseDayDialog, setShowExpenseDialog, setShowIncomeDialog, setViewBillDialogOpen, 
    setViewReportDialogOpen, showCloseDayDialog, showExpenseDialog, showIncomeDialog, t, 
    taxName, viewBillDialogOpen, 
    viewReportDialogOpen
  } = props;

  return (
    <>
      <Dialog open={showExpenseDialog} onClose={() => setShowExpenseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('financial.addExpense')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>{t('financial.category')}</InputLabel>
                <Select
                  value={expenseFormData.category}
                  label={t('financial.category')}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                >
                  {getExpenseCategories().map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {t(cat.labelKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.description')}
                value={expenseFormData.description}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${t('financial.amount')} (€)`}
                type="number"
                value={expenseFormData.amount}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.date')}
                type="date"
                value={expenseFormData.date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.notes')}
                multiline
                rows={3}
                value={expenseFormData.notes}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpenseDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveExpense} variant="contained" color="error">
            {t('financial.saveExpense')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Income Dialog */}
      <Dialog open={showIncomeDialog} onClose={() => setShowIncomeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('financial.addManualIncome')}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.description')}
                value={incomeFormData.description}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                required
                placeholder="e.g., Equipment sale, Service fee, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={`${t('financial.amount')} (€)`}
                type="number"
                value={incomeFormData.amount}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                required
                inputProps={{ step: '0.01', min: '0' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.date')}
                type="date"
                value={incomeFormData.date}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('financial.notes')}
                multiline
                rows={3}
                value={incomeFormData.notes}
                onChange={(e) => setIncomeFormData({ ...incomeFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIncomeDialog(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveIncome} variant="contained" color="success">
            {t('financial.saveIncome')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close the Day Dialog */}
      <Dialog 
        open={showCloseDayDialog} 
        onClose={() => setShowCloseDayDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Daily Financial Report - {selectedDate instanceof Date 
                ? selectedDate.toISOString().split('T')[0] 
                : selectedDate}
            </Typography>
            <IconButton onClick={() => setShowCloseDayDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '100%' }}>
          <iframe
            srcDoc={dailyReportHtml || generateDailyReportHTML()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              minHeight: '600px'
            }}
            title="Daily Financial Report"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
          <Box>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(dailyReportHtml || generateDailyReportHTML());
                printWindow.document.close();
                printWindow.print();
              }}
            >
              Print
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
            >
              Download
            </Button>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleStoreReport}
            >
              Store
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EmailIcon />}
              onClick={handleEmailReport}
            >
              Share by Email
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* View Stored Report Dialog */}
      <Dialog
        open={viewReportDialogOpen}
        onClose={() => setViewReportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Daily Financial Report - {selectedReport?.date}
            </Typography>
            <IconButton onClick={() => setViewReportDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: '100%' }}>
          {selectedReport && (
            <iframe
              srcDoc={selectedReport.html}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                minHeight: '600px'
              }}
              title="Stored Financial Report"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewReportDialogOpen(false)}>Close</Button>
          {selectedReport && (
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(selectedReport.html);
                printWindow.document.close();
                printWindow.print();
              }}
            >
              Print
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog
        open={viewBillDialogOpen}
        onClose={() => setViewBillDialogOpen(false)}
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
                  <Typography variant="body1">{getBillCustomerName(selectedBill)}</Typography>
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
                    <Typography variant="body2" color="text.secondary">Tax ({taxName})</Typography>
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
          <Button onClick={() => setViewBillDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => handlePrintBill(selectedBill)}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

    </>

  );
};

export default FinancialDialogs;
