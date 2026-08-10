// Presentational component for the Financial page "PreviousClosedDaysTab" tab.
// Extracted from Financial.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useFinancialData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const PreviousClosedDaysTab = (props) => {
  const {
    formatCurrency, formatDate, handleViewReport, loadStoredReports, locations, 
    storedReports
  } = props;

  return (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Previous Closed Days</Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadStoredReports}
            >
              Refresh
            </Button>
          </Box>
          {storedReports.length === 0 ? (
            <Alert severity="info">No stored reports found. Reports are stored when you close a day.</Alert>
          ) : (() => {
            const scope = localStorage.getItem('dcms_dashboard_scope');
            const isGlobal = scope === 'global';
            
            // Group reports by location if in global scope
            if (isGlobal) {
              const groupedByLocation = storedReports.reduce((acc, report) => {
                const locationId = report.locationId || report.location_id;
                const locationName = report.locationName || 
                  (locationId ? locations.find(l => l.id === locationId)?.name : null) || 
                  'All Locations';
                // Use locationId or 'unknown' as key to handle null values
                const groupKey = locationId || 'unknown';
                if (!acc[groupKey]) {
                  acc[groupKey] = {
                    locationId,
                    locationName,
                    reports: []
                  };
                }
                acc[groupKey].reports.push(report);
                return acc;
              }, {});
              
              const locationGroups = Object.values(groupedByLocation);
              
              return (
                <>
                  {locationGroups.map((group) => (
                    <Box key={group.locationId} sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                        {group.locationName}
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Stored At</TableCell>
                              <TableCell>Total Income</TableCell>
                              <TableCell>Total Expenses</TableCell>
                              <TableCell>Net Profit</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.reports
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .map((report) => (
                                <TableRow key={report.id}>
                                  <TableCell>{formatDate(report.date)}</TableCell>
                                  <TableCell>{formatDate(report.storedAt)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.totalIncome)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.expenses?.total)}</TableCell>
                                  <TableCell>{formatCurrency(report.financialSummary?.netProfit)}</TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="View Report">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleViewReport(report)}
                                      >
                                        <ViewIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </>
              );
            } else {
              // Single location view
              return (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Stored At</TableCell>
                        <TableCell>Total Income</TableCell>
                        <TableCell>Total Expenses</TableCell>
                        <TableCell>Net Profit</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {storedReports
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>{formatDate(report.date)}</TableCell>
                            <TableCell>{formatDate(report.storedAt)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.totalIncome)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.expenses?.total)}</TableCell>
                            <TableCell>{formatCurrency(report.financialSummary?.netProfit)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Report">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewReport(report)}
                                >
                                  <ViewIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              );
            }
          })()}
        </Box>

  );
};

export default PreviousClosedDaysTab;
