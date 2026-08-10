import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { format, isSameDay } from 'date-fns';

/**
 * Phase 6.5b extraction: 4-week rolling calendar view (Mole + boat slots
 * per day), split out of Schedule.jsx. Presentational only - state/
 * handlers come from useScheduleData() via props.
 */
export default function WeekView(props) {
  const {
    activeBoats,
    daysToDisplay,
    getBookingsForDate,
    getDiscoveryBookings,
    getDiveBookings,
    handleBoatClick,
    handleMoleClick,
  } = props;

  return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {daysToDisplay.map((day) => {
          const dayBookings = getBookingsForDate(day);
          const discoveryBookings = getDiscoveryBookings(day);
          const diveBookings = getDiveBookings(day);
          const isToday = isSameDay(day, new Date());
          const totalBookings = discoveryBookings.length + diveBookings.length;

          return (
            <Paper
              key={format(day, 'yyyy-MM-dd')}
              sx={{
                p: 0.5,
                minHeight: 140,
                border: isToday ? 2 : 1,
                borderColor: isToday ? 'primary.main' : 'divider',
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 calc(14.28% - 8px)', // 7 columns: 100% / 7 = 14.28%
                minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 8px)', lg: 'calc(14.28% - 8px)' },
                maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 8px)', lg: 'calc(14.28% - 8px)' }
              }}
            >
              {/* Day and Date Header - One line, smaller font */}
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  mb: 0.5,
                  color: isToday ? 'primary.main' : 'text.primary'
                }}
              >
                {format(day, 'EEE d')}
              </Typography>
              
              {/* Mole Rectangle - Independent clickable */}
              <Box
                onClick={(e) => handleMoleClick(day, e)}
                sx={{
                  border: 1,
                  borderColor: 'info.main',
                  borderRadius: 0.5,
                  p: 0.5,
                  mb: 0.5,
                  bgcolor: 'rgba(33, 150, 243, 0.08)', // Light blue background with low opacity
                  minHeight: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'rgba(33, 150, 243, 0.15)',
                    borderColor: 'info.dark'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'text.primary' }}>
                  Mole {discoveryBookings.length > 0 && `(${discoveryBookings.length})`}
                </Typography>
              </Box>
              
              {/* Boat Rectangles - Calculate number of boats needed based on diver count */}
              {(() => {
                // Only show boats if there are dive bookings for this day
                if (diveBookings.length === 0) {
                  return null; // No boats needed if no dive bookings
                }
                
                // Count total divers for the day (sum of numberOfDives from all dive bookings)
                const totalDivers = diveBookings.reduce((sum, booking) => {
                  const numDives = booking.numberOfDives || booking.number_of_dives || 1;
                  return sum + numDives;
                }, 0);
                
                // Get boats with assigned bookings
                const boatsWithBookings = activeBoats.filter(boat => {
                  const boatBookings = diveBookings.filter(b => {
                    const bookingBoatId = b.boatId || b.boat_id;
                    return bookingBoatId === boat.id;
                  });
                  return boatBookings.length > 0;
                });
                
                // Count unassigned dive bookings
                const unassignedDiveBookings = diveBookings.filter(b => {
                  const bookingBoatId = b.boatId || b.boat_id;
                  return !bookingBoatId;
                });
                
                // Calculate how many boats are needed based on capacity
                // Use boat capacity if available, otherwise default to 8 divers per boat
                const getBoatCapacity = (boat) => {
                  return boat.capacity || 8; // Default to 8 if not specified
                };
                
                // Calculate boats needed: count total divers and divide by average capacity
                // For simplicity, use the first boat's capacity or default to 8
                const defaultCapacity = activeBoats.length > 0 ? getBoatCapacity(activeBoats[0]) : 8;
                const boatsNeeded = Math.ceil(totalDivers / defaultCapacity);
                
                // Determine which boats to show:
                // 1. Always show boats that have assigned bookings
                // 2. If there are unassigned bookings, show the number of boats needed
                const neededBoatIds = new Set();
                
                // Add boats with assigned bookings
                boatsWithBookings.forEach(boat => neededBoatIds.add(boat.id));
                
                // If there are unassigned bookings, add boats up to the number needed
                if (unassignedDiveBookings.length > 0) {
                  const unassignedDivers = unassignedDiveBookings.reduce((sum, booking) => {
                    const numDives = booking.numberOfDives || booking.number_of_dives || 1;
                    return sum + numDives;
                  }, 0);
                  const boatsNeededForUnassigned = Math.ceil(unassignedDivers / defaultCapacity);
                  
                  // Show up to the number of boats needed (but don't exceed available boats)
                  const boatsToShow = Math.min(boatsNeededForUnassigned, activeBoats.length);
                  activeBoats.slice(0, boatsToShow).forEach(boat => {
                    neededBoatIds.add(boat.id);
                  });
                } else if (boatsWithBookings.length === 0 && boatsNeeded > 0) {
                  // If all bookings are assigned but we need to show boats, show the calculated number
                  const boatsToShow = Math.min(boatsNeeded, activeBoats.length);
                  activeBoats.slice(0, boatsToShow).forEach(boat => {
                    neededBoatIds.add(boat.id);
                  });
                }
                
                // Filter to only show needed boats
                const boatsToShow = activeBoats.filter(boat => neededBoatIds.has(boat.id));
                
                return boatsToShow.map((boat) => {
                  const boatBookings = diveBookings.filter(b => {
                    const bookingBoatId = b.boatId || b.boat_id;
                    return bookingBoatId === boat.id;
                  });
                  const boatBookingCount = boatBookings.length;
                  
                  return (
                    <Box
                      key={boat.id}
                      onClick={(e) => handleBoatClick(day, boat.id, e)}
                      sx={{
                        border: 1,
                        borderColor: 'primary.main',
                        borderRadius: 0.5,
                        p: 0.5,
                        mb: 0.5,
                        bgcolor: boatBookingCount > 0 ? 'primary.light' : 'action.hover',
                        minHeight: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: boatBookingCount > 0 ? 'primary.main' : 'action.selected',
                          borderColor: 'primary.dark'
                        }
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'medium' }}>
                        {boat.name} {boatBookingCount > 0 && `(${boatBookingCount})`}
                      </Typography>
                    </Box>
                  );
                });
              })()}
            </Paper>
          );
        })}
      </Box>
  );
}
