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

const Stays = () => {
  const navigate = useNavigate();
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
    if (totalDives >= 9) return 'High Volume';
    if (totalDives >= 6) return 'Medium Volume';
    if (totalDives >= 3) return 'Low Volume';
    return 'New Stay';
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
    if (sessions.morning) parts.push('Morning (9AM)');
    if (sessions.afternoon) parts.push('Afternoon (12PM)');
    return parts.join(', ') || 'No sessions';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading stays...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Customer Stays
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadActiveStays}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            New Booking
          </Button>
        </Box>
      </Box>

      {activeStays.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ReceiptIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No active stays found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Customers with bookings in the last 30 days will appear here
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            Create First Booking
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
                        Stay started: {formatDate(stay.stayStartDate)}
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
                        {stay.totalDives} dives @ €{stay.pricePerDive.toFixed(2)} each
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Stay Breakdown
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Sessions</TableCell>
                          <TableCell>Dives</TableCell>
                          <TableCell align="right">Price per Dive</TableCell>
                          <TableCell align="right">Total</TableCell>
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
                      <strong>Cumulative Pricing:</strong> All dives in this stay are priced at €{stay.pricePerDive.toFixed(2)} 
                      per dive based on the total volume of {stay.totalDives} dives. This ensures customers get the best 
                      possible rate for their entire stay.
                    </Typography>
                  </Alert>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/bookings/new?customerId=${stay.customer.id}`)}
                    >
                      Add Booking
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/customers?id=${stay.customer.id}`)}
                    >
                      View Customer
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<EndStayIcon />}
                      onClick={() => handleEndStay(stay)}
                    >
                      End Stay & Generate Bill
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
