import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { format } from 'date-fns';

/**
 * Phase 6.5b extraction: daily summary view, split out of Schedule.jsx.
 * Presentational only - state/handlers come from useScheduleData() via
 * props.
 */
export default function DailyView(props) {
  const {
    currentDate,
    customers,
    formatTripEntry,
    getBoatNameForBooking,
    getDiscoveryBookings,
    getDiveBookings,
  } = props;

  return (
        <Box>
          <Typography variant="h6" gutterBottom>
            Daily Summary for {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </Typography>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Discovery/Shore Dives */}
              {getDiscoveryBookings(currentDate).length > 0 && (
                <Box>
                  <Typography variant="subtitle1" color="info.main" gutterBottom>
                    Shore Dives (Discovery/Try Scuba)
                  </Typography>
                  {getDiscoveryBookings(currentDate).map(booking => {
                    const customer = customers.find(c => c.id === (booking.customerId || booking.customer_id));
                    const customerName = customer ? `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim() : 'Unknown';
                    return (
                      <Box key={booking.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <Typography variant="body2">
                          {customerName} - {formatTripEntry(booking)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
              
              {/* Boat Dives */}
              {getDiveBookings(currentDate).length > 0 && (
                <Box>
                  <Typography variant="subtitle1" color="primary.main" gutterBottom>
                    Boat Dives
                  </Typography>
                  {getDiveBookings(currentDate).map(booking => {
                    const customer = customers.find(c => c.id === (booking.customerId || booking.customer_id));
                    const customerName = customer ? `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim() : 'Unknown';
                    const boatName = getBoatNameForBooking(booking) || 'Unassigned';
                    return (
                      <Box key={booking.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                        <Typography variant="body2">
                          {customerName} - {formatTripEntry(booking)} ({boatName})
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
              
              {getDiscoveryBookings(currentDate).length === 0 && getDiveBookings(currentDate).length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No trips scheduled for this day
                </Typography>
              )}
            </Box>
          </Paper>
        </Box>
  );
}
