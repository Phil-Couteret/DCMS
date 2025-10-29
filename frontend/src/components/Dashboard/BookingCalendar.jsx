import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const BookingCalendar = ({ bookings, customers, onBookingClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of week for the month (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = Array(firstDayOfWeek).fill(null);

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getBookingsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.bookingDate === dateStr);
  };

  const handleDateClick = (date) => {
    const dayBookings = getBookingsForDate(date);
    setSelectedDate(date);
    setSelectedBookings(dayBookings);
  };

  const handleCloseDialog = () => {
    setSelectedDate(null);
    setSelectedBookings([]);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'success',
      pending: 'warning',
      completed: 'info',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePrevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6">
            {format(currentDate, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={handleNextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Day headers */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Grid item xs={12/7} key={day}>
            <Typography variant="caption" align="center" sx={{ fontWeight: 'bold' }}>
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar grid */}
      <Grid container spacing={1}>
        {/* Empty cells for days before month start */}
        {daysBeforeMonth.map((_, index) => (
          <Grid item xs={12/7} key={`empty-${index}`}>
            <Box sx={{ height: 80 }} />
          </Grid>
        ))}
        
        {/* Days in month */}
        {daysInMonth.map((date) => {
          const dayBookings = getBookingsForDate(date);
          const isToday = isSameDay(date, new Date());
          const isCurrentMonth = isSameMonth(date, currentDate);
          
          return (
            <Grid item xs={12/7} key={format(date, 'yyyy-MM-dd')}>
              <Box
                onClick={() => handleDateClick(date)}
                sx={{
                  height: 80,
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 0.5,
                  cursor: 'pointer',
                  backgroundColor: isToday ? 'primary.light' : 'background.paper',
                  opacity: isCurrentMonth ? 1 : 0.3,
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: isToday ? 'bold' : 'normal' }}>
                  {format(date, 'd')}
                </Typography>
                {dayBookings.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={dayBookings.length}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Dialog for selected date bookings */}
      <Dialog open={selectedDate !== null} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Bookings for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </DialogTitle>
        <DialogContent>
          {selectedBookings.length === 0 ? (
            <Typography color="text.secondary">No bookings for this date</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedBookings.map((booking) => (
                <Box
                  key={booking.id}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    },
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (onBookingClick) {
                      onBookingClick(booking);
                    }
                    handleCloseDialog();
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {getCustomerName(booking.customerId)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {booking.activityType} - {booking.numberOfDives} dive(s)
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={booking.status}
                        size="small"
                        color={getStatusColor(booking.status)}
                      />
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        €{booking.totalPrice?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default BookingCalendar;

