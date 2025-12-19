import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  ReceiptLong as EndStayIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import stayService from '../services/stayService';
import BillGenerator from '../components/Bill/BillGenerator';
import { useTranslation } from '../utils/languageContext';

const Stays = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showBillGenerator, setShowBillGenerator] = useState(false);

  useEffect(() => {
    loadActiveStays();
  }, []);

  const loadActiveStays = () => {
    setLoading(true);
    const stays = stayService.getActiveStays(30); // Last 30 days
    setActiveStays(stays);
    setLoading(false);
  };

  const getStatusColor = (totalDives) => {
    if (totalDives >= 9) return 'success';
    if (totalDives >= 6) return 'info';
    if (totalDives >= 3) return 'warning';
    return 'default';
  };

  const getStatusText = (totalDives) => {
    if (totalDives >= 9) return t('stays.status.high') || 'High Volume';
    if (totalDives >= 6) return t('stays.status.medium') || 'Medium Volume';
    if (totalDives >= 3) return t('stays.status.low') || 'Low Volume';
    return t('stays.status.new') || 'New Stay';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEndStay = (stay) => {
    setSelectedStay(stay);
    setShowBillGenerator(true);
  };

  const handleCloseBillGenerator = () => {
    setShowBillGenerator(false);
    setSelectedStay(null);
  };

  const getSessionText = (sessions) => {
    if (!sessions) return 'N/A';
    const parts = [];
    if (sessions.morning) parts.push(t('bookings.details.morning') || 'Morning (9AM)');
    if (sessions.afternoon) parts.push(t('bookings.details.afternoon') || 'Afternoon (12PM)');
    return parts.join(', ') || (t('stays.noSessions') || 'No sessions');
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{t('stays.loading') || 'Loading stays...'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {t('stays.title') || 'Customer Stays'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadActiveStays}
          >
            {t('stays.refresh') || 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.new')}
          </Button>
        </Box>
      </Box>

      {activeStays.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('stays.empty') || 'No active stays found'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('stays.emptyHint') || 'Customers with bookings in the last 30 days will appear here'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            {t('bookings.createFirst')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {activeStays.map((stay) => (
            <Accordion key={stay.customer.id} defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {stay.customer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stay.customer.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(t('stays.started') || 'Stay started') + ': '} {formatDate(stay.stayStartDate)}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={getStatusText(stay.totalDives)}
                      color={getStatusColor(stay.totalDives)}
                    />
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        €{stay.totalPrice.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stay.totalDives} {(t('bookings.details.dives') || 'dives')} @ €{stay.pricePerDive.toFixed(2)} {(t('stays.each') || 'each')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('stays.breakdownTitle') || 'Stay Breakdown'}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('stays.table.date') || 'Date'}</TableCell>
                          <TableCell>{t('stays.table.sessions') || 'Sessions'}</TableCell>
                          <TableCell>{t('stays.table.dives') || 'Dives'}</TableCell>
                          <TableCell align="right">{t('stays.table.pricePerDive') || 'Price per Dive'}</TableCell>
                          <TableCell align="right">{t('stays.table.total') || 'Total'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stay.breakdown.map((booking, index) => (
                          <TableRow key={booking.bookingId}>
                            <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                            <TableCell>
                              {booking.sessions ? getSessionText(booking.sessions) : 'N/A'}
                            </TableCell>
                            <TableCell>{booking.dives}</TableCell>
                            <TableCell align="right">€{booking.pricePerDive.toFixed(2)}</TableCell>
                            <TableCell align="right">€{booking.totalForBooking.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>{t('stays.cumulativeTitle') || 'Cumulative Pricing'}:</strong> {t('stays.cumulativeTextPart1') || 'All dives in this stay are priced at'} €{stay.pricePerDive.toFixed(2)} {t('stays.cumulativeTextPart2') || 'per dive based on the total volume of'} {stay.totalDives} {(t('bookings.details.dives') || 'dives')}. {t('stays.cumulativeTextPart3') || 'This ensures customers get the best possible rate for their entire stay.'}
                    </Typography>
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/bookings/new?customerId=${stay.customer.id}`)}
                    >
                      {t('stays.addBooking') || 'Add Booking'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/customers?id=${stay.customer.id}`)}
                    >
                      {t('stays.viewCustomer') || 'View Customer'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<EndStayIcon />}
                      onClick={() => handleEndStay(stay)}
                    >
                      {t('stays.endStay') || 'End Stay & Generate Bill'}
                    </Button>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Bill Generator Dialog */}
      <BillGenerator
        open={showBillGenerator}
        onClose={handleCloseBillGenerator}
        stay={selectedStay}
      />
    </Box>
  );
};

export default Stays;
