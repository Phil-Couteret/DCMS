import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { format, isSameDay, isSameMonth } from 'date-fns';

/**
 * Phase 6.5b extraction: month calendar grid view, split out of
 * Schedule.jsx. Presentational only - state/handlers come from
 * useScheduleData() via props.
 */
export default function MonthView(props) {
  const {
    currentDate,
    daysBeforeMonth,
    daysInMonth,
    formatTripEntry,
    getBookingsForDate,
    getDiscoveryBookings,
    getDiveBookings,
    handleMonthDayClick,
    navigate,
  } = props;

  return (
        <Box sx={{ mb: 2 }}>
          {/* Day headers */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <Box key={day} sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {day}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Calendar grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {/* Empty cells for days before month start */}
            {Array.from({ length: daysBeforeMonth }).map((_, index) => (
              <Box key={`empty-${index}`} sx={{ minHeight: 100 }} />
            ))}
            
            {/* Days in month */}
            {daysInMonth.map((date) => {
              const dayBookings = getBookingsForDate(date);
              const discoveryBookings = getDiscoveryBookings(date);
              const diveBookings = getDiveBookings(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentDate);
              const totalBookings = discoveryBookings.length + diveBookings.length;
              
              return (
                <Paper
                  key={format(date, 'yyyy-MM-dd')}
                  onClick={() => handleMonthDayClick(date)}
                  sx={{
                    minHeight: 100,
                    p: 1,
                    border: isToday ? 2 : 1,
                    borderColor: isToday ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    backgroundColor: isToday ? 'primary.light' : (isCurrentMonth ? 'background.paper' : 'action.hover'),
                    opacity: isCurrentMonth ? 1 : 0.5,
                    '&:hover': {
                      backgroundColor: isToday ? 'primary.main' : 'action.hover',
                      borderColor: 'primary.dark'
                    }
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: isToday ? 'bold' : 'normal',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    {format(date, 'd')}
                  </Typography>
                  {/* Show trip entries like DiveAdmin: "9a (1) Shore, Jemelos" */}
                  <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {discoveryBookings.map((booking, idx) => (
                      <Box
                        key={booking.id}
                        sx={{
                          backgroundColor: 'info.main',
                          color: 'white',
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'info.dark'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = format(date, 'yyyy-MM-dd');
                          navigate(`/schedule/trip/${dateStr}/mole`);
                        }}
                      >
                        {formatTripEntry(booking)}
                      </Box>
                    ))}
                    {diveBookings.slice(0, 2).map((booking, idx) => (
                      <Box
                        key={booking.id}
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'white',
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'primary.dark'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const boatId = booking.boatId || booking.boat_id;
                          if (boatId) {
                            navigate(`/schedule/trip/${dateStr}/boat/${boatId}/morning`);
                          }
                        }}
                      >
                        {formatTripEntry(booking)}
                      </Box>
                    ))}
                    {diveBookings.length > 2 && (
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        +{diveBookings.length - 2} more
                      </Typography>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
  );
}
