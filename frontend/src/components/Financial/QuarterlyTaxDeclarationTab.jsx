// Presentational component for the Financial page "QuarterlyTaxDeclarationTab" tab.
// Extracted from Financial.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useFinancialData() and is passed in via props.
import React from 'react';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
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
  Typography
} from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const QuarterlyTaxDeclarationTab = (props) => {
  const {
    formatCurrency, generateIgicDeclarationHTML, getQuarterDateRange, igicDeclaration, 
    igicLoading, loadIgicDeclaration, selectedQuarter, selectedYear, setSelectedQuarter, 
    setSelectedYear, 
    taxName
  } = props;

  return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5">Quarterly {igicDeclaration?.taxName || taxName} Declaration</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadIgicDeclaration}
            >
              Refresh
            </Button>
          </Box>

          {/* Quarter and Year Selector */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quarter</InputLabel>
                  <Select
                    value={selectedQuarter}
                    label="Quarter"
                    onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                  >
                    <MenuItem value={1}>Q1 (Jan - Mar)</MenuItem>
                    <MenuItem value={2}>Q2 (Apr - Jun)</MenuItem>
                    <MenuItem value={3}>Q3 (Jul - Sep)</MenuItem>
                    <MenuItem value={4}>Q4 (Oct - Dec)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                  inputProps={{ min: 2020, max: 2100 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Period: {igicDeclaration?.dateRange ? 
                    `${format(new Date(igicDeclaration.dateRange.start), 'dd/MM/yyyy')} - ${format(new Date(igicDeclaration.dateRange.end), 'dd/MM/yyyy')}` 
                    : getQuarterDateRange(selectedQuarter, selectedYear).start + ' - ' + getQuarterDateRange(selectedQuarter, selectedYear).end}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {igicLoading ? (
            <Typography>Loading {taxName} declaration data...</Typography>
          ) : igicDeclaration ? (
            <>
              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Sales Base (Base Imponible)
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(igicDeclaration.sales.baseImponible)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.sales.numberOfBills} bills
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        {igicDeclaration.taxName || 'IGIC'} Collected (Cuota Devengada)
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {formatCurrency(igicDeclaration.sales.cuotaDevengada)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.taxName || 'IGIC'} Rate: {(igicDeclaration.igicRate * 100).toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        Purchases Base (Base Imponible)
                      </Typography>
                      <Typography variant="h4" color="info.main">
                        {formatCurrency(igicDeclaration.purchases.baseImponible)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {igicDeclaration.purchases.numberOfExpenses} expenses
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom variant="body2">
                        {igicDeclaration.taxName || 'IGIC'} Paid (Cuota Soportada)
                      </Typography>
                      <Typography variant="h4" color="warning.main">
                        {formatCurrency(igicDeclaration.purchases.cuotaSoportada)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Net IGIC Result */}
              <Paper sx={{ p: 3, mb: 3, bgcolor: igicDeclaration.netIgicToPay >= 0 ? 'success.light' : 'info.light' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom>
                      Net {igicDeclaration.taxName || 'IGIC'} to {igicDeclaration.netIgicToPay >= 0 ? 'Pay' : 'Receive'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Resultado a {igicDeclaration.netIgicToPay >= 0 ? 'ingresar' : 'compensar'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                    <Typography 
                      variant="h3" 
                      color={igicDeclaration.netIgicToPay >= 0 ? 'success.main' : 'info.main'}
                      fontWeight="bold"
                    >
                      {formatCurrency(Math.abs(igicDeclaration.netIgicToPay))}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Detailed Breakdown */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Detailed Breakdown
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Concept</strong></TableCell>
                        <TableCell align="right"><strong>Base Imponible</strong></TableCell>
                        <TableCell align="right"><strong>{igicDeclaration.taxName || 'IGIC'} ({(igicDeclaration.igicRate * 100).toFixed(1)}%)</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Sales (Ventas)</strong></TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.baseImponible)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.cuotaDevengada)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.sales.baseImponible + igicDeclaration.sales.cuotaDevengada)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Purchases (Compras)</strong></TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.baseImponible)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.cuotaSoportada)}</TableCell>
                        <TableCell align="right">{formatCurrency(igicDeclaration.purchases.baseImponible + igicDeclaration.purchases.cuotaSoportada)}</TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Net Result</strong></TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(igicDeclaration.netIgicToPay)}</strong>
                        </TableCell>
                        <TableCell align="right">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Action Buttons */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    const html = generateIgicDeclarationHTML(igicDeclaration);
                    printWindow.document.write(html);
                    printWindow.document.close();
                    printWindow.print();
                  }}
                >
                  Print Declaration
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const html = generateIgicDeclarationHTML(igicDeclaration);
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const taxName = (igicDeclaration.taxName || 'IGIC').toLowerCase();
                    link.setAttribute('download', `${taxName}_declaration_Q${igicDeclaration.quarter}_${igicDeclaration.year}.html`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Declaration
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              Select a quarter and year, then the declaration will be calculated automatically.
            </Alert>
          )}
        </Box>

  );
};

export default QuarterlyTaxDeclarationTab;
