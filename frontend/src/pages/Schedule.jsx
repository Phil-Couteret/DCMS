import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, addMinutes, startOfDay } from 'date-fns';
import dataService from '../services/dataService';

// Slot configuration for Mole (discovery)
const MOLE_START_TIME = '09:30';
const MOLE_SLOT_DURATION = 60; // 1 hour in minutes
const MOLE_SLOT_INTERVAL = 30; // 30 minutes between slots

// Boat slot configuration (morning, afternoon, night sessions)
const BOAT_SESSIONS = [
  { name: 'Morning', time: '09:00', duration: 240 },
  { name: 'Afternoon', time: '12:00', duration: 240 },
  { name: 'Night', time: '18:00', duration: 120 }
];

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [locations, setLocations] = useState([]);
  const [boats, setBoats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotAssignments, setSlotAssignments] = useState({});
  const [slotGuides, setSlotGuides] = useState({}); // { slotId: [guideId1, guideId2, ...] }

  const currentLocationId = localStorage.getItem('dcms_current_location');
  
  // Calculate 4 rolling weeks: 1 week before, current week, 2 weeks after
  const weekStart = startOfWeek(startOfDay(currentDate), { weekStartsOn: 1 }); // Monday
  const displayStart = subWeeks(weekStart, 1); // 1 week before
  const displayEnd = addWeeks(weekStart, 3); // 3 weeks after (total 4 weeks)
  const displayEndDate = endOfWeek(displayEnd, { weekStartsOn: 1 }); // End of the 4th week
  const daysToDisplay = eachDayOfInterval({ start: displayStart, end: displayEndDate });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locationsData, boatsData, bookingsData, customersData, diveSitesData, staffData] = await Promise.all([
        dataService.getAll('locations'),
        dataService.getAll('boats'),
        dataService.getAll('bookings'),
        dataService.getAll('customers'),
        dataService.getAll('diveSites'),
        dataService.getAll('staff')
      ]);

      setLocations(Array.isArray(locationsData) ? locationsData : []);
      const filteredBoats = Array.isArray(boatsData) ? boatsData.filter(b => {
        const boatLocationId = b.locationId || b.location_id;
        return boatLocationId === currentLocationId && (b.isActive !== false);
      }) : [];
      setBoats(filteredBoats);
      const allBookings = Array.isArray(bookingsData) ? bookingsData : [];
      setBookings(allBookings);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setDiveSites(Array.isArray(diveSitesData) ? diveSitesData : []);
      setStaff(Array.isArray(staffData) ? staffData.filter(s => s.isActive !== false) : []);

      // Initialize slot assignments from existing bookings
      // Store arrays of booking IDs per slot to allow multiple divers
      // Preserve any existing optimistic updates that might not be in the database yet
      setSlotAssignments(prev => {
        const initialAssignments = {};
        allBookings.forEach(booking => {
          if (booking.slotAssignment) {
            const slotAssign = booking.slotAssignment;
            if (slotAssign.type === 'mole' && slotAssign.slotId) {
              if (!initialAssignments[slotAssign.slotId]) {
                initialAssignments[slotAssign.slotId] = [];
              }
              if (!initialAssignments[slotAssign.slotId].includes(booking.id)) {
                initialAssignments[slotAssign.slotId].push(booking.id);
              }
            } else if (slotAssign.type === 'boat' && slotAssign.boatId && slotAssign.session) {
              const boatSlotId = `boat-${slotAssign.boatId}-${slotAssign.session}`;
              if (!initialAssignments[boatSlotId]) {
                initialAssignments[boatSlotId] = [];
              }
              if (!initialAssignments[boatSlotId].includes(booking.id)) {
                initialAssignments[boatSlotId].push(booking.id);
              }
            }
          }
        });
        // Merge with previous state to preserve optimistic updates
        Object.keys(initialAssignments).forEach(slotId => {
          if (prev[slotId] && Array.isArray(prev[slotId])) {
            initialAssignments[slotId] = [...new Set([...prev[slotId], ...initialAssignments[slotId]])];
          }
        });
        return { ...prev, ...initialAssignments };
      });

      // Initialize guide assignments from slotAssignments (if guides are stored in booking.slotAssignment)
      setSlotGuides(prev => {
        const initialGuides = {};
        allBookings.forEach(booking => {
          if (booking.slotAssignment && booking.slotAssignment.guideIds) {
            const slotAssign = booking.slotAssignment;
            let slotId = null;
            if (slotAssign.type === 'mole' && slotAssign.slotId) {
              slotId = slotAssign.slotId;
            } else if (slotAssign.type === 'boat' && slotAssign.boatId && slotAssign.session) {
              slotId = `boat-${slotAssign.boatId}-${slotAssign.session}`;
            }
            if (slotId && Array.isArray(slotAssign.guideIds)) {
              if (!initialGuides[slotId]) {
                initialGuides[slotId] = [];
              }
              // Merge guide IDs (avoid duplicates)
              initialGuides[slotId] = [...new Set([...initialGuides[slotId], ...slotAssign.guideIds])];
            }
          }
        });
        return { ...prev, ...initialGuides };
      });
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get boats for current location (same logic as BoatPrep)
  const activeBoats = useMemo(() => {
    if (!currentLocationId) return [];
    return boats
      .filter(boat => {
        const boatLocationId = boat.locationId || boat.location_id;
        const isActive = boat.isActive !== false; // Default to true if not set
        return boatLocationId === currentLocationId && isActive;
      })
      .sort((a, b) => {
        // Sort boats by name (White, Black, Grey)
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const order = ['white', 'black', 'grey'];
        const indexA = order.findIndex(o => nameA.includes(o));
        const indexB = order.findIndex(o => nameB.includes(o));
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return nameA.localeCompare(nameB);
      });
  }, [boats, currentLocationId]);

  // Generate Mole slots for a day
  const generateMoleSlots = (date) => {
    const slots = [];
    const [hours, minutes] = MOLE_START_TIME.split(':').map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    // Generate slots until 13:00 (last session ends at 13:00)
    let currentSlot = new Date(startTime);
    const endTime = new Date(date);
    endTime.setHours(13, 0, 0, 0);

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, MOLE_SLOT_DURATION);
      if (slotEnd <= endTime) {
        slots.push({
          start: new Date(currentSlot),
          end: slotEnd,
          id: `mole-${format(currentSlot, 'yyyy-MM-dd-HH-mm')}`
        });
      }
      currentSlot = addMinutes(currentSlot, MOLE_SLOT_INTERVAL);
    }

    return slots;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(booking => {
      const bookingDate = booking.bookingDate || booking.booking_date;
      const bookingDateStr = bookingDate ? (bookingDate.split('T')[0] || bookingDate) : null;
      const bookingLocationId = booking.locationId || booking.location_id;
      return bookingDateStr === dateStr && bookingLocationId === currentLocationId;
    });
  };

  // Get discovery bookings for a date (for Mole slots)
  // Discovery, try scuba, and orientation dives are always done at Mole
  const getDiscoveryBookings = (date) => {
    const dateBookings = getBookingsForDate(date);
    return dateBookings.filter(booking => {
      const activityType = booking.activityType || booking.activity_type;
      return activityType === 'discovery' || 
             activityType === 'discover' || 
             activityType === 'try_dive' ||
             activityType === 'orientation' ||
             activityType === 'try_scuba';
    });
  };

  // Get dive bookings for a date (for boat slots)
  const getDiveBookings = (date) => {
    const dateBookings = getBookingsForDate(date);
    return dateBookings.filter(booking => {
      const activityType = booking.activityType || booking.activity_type;
      return activityType === 'diving';
    });
  };

  // Get customer name
  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || customer.email || 'Unknown';
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleDayClick = (date) => {
    // Don't do anything on day click - each rectangle is independent
  };

  const handleMoleClick = (date, event) => {
    event.stopPropagation(); // Prevent day click
    setSelectedSlot({ type: 'mole', date });
  };

  const handleBoatClick = (date, boatId, event) => {
    event.stopPropagation(); // Prevent day click
    setSelectedSlot({ type: 'boat', date, boatId, sessionTime: 'morning' });
  };

  const handleCloseDialog = () => {
    setSelectedSlot(null);
  };

  const handleAssignCustomer = async (bookingId, slotId, slotType, boatId = null, sessionTime = null) => {
    try {
      console.log('[Schedule] handleAssignCustomer called:', { bookingId, slotId, slotType, boatId, sessionTime });
      
      // Update booking with slot assignment
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        console.error('[Schedule] Booking not found:', bookingId);
        return;
      }

      const updateData = {};
      
      if (slotType === 'mole') {
        // Store slot time for Mole assignments
        // Slot ID format: mole-yyyy-MM-dd-HH-mm
        // So after split by '-': [0]=mole, [1]=yyyy, [2]=MM, [3]=dd, [4]=HH, [5]=mm
        const slotInfo = slotId.split('-');
        if (slotInfo.length >= 6) {
          const slotTime = `${slotInfo[4]}:${slotInfo[5]}`; // HH:mm (indices 4 and 5)
          updateData.slotAssignment = {
            type: 'mole',
            slotId: slotId,
            slotTime: slotTime
          };
        } else {
          // Fallback: still set slotAssignment even if time parsing fails
          console.warn('[Schedule] Invalid Mole slot ID format, using slotId only:', slotId);
          updateData.slotAssignment = {
            type: 'mole',
            slotId: slotId
          };
        }
      } else if (slotType === 'boat') {
        // Store boat and session for boat assignments
        updateData.boatId = boatId;
        updateData.slotAssignment = {
          type: 'boat',
          boatId: boatId,
          session: sessionTime || 'morning'
        };
      }

      console.log('[Schedule] Updating booking with:', updateData);
      
      // Note: Multiple customers can always be assigned to the same slot
      // - Discovery dives (Mole slots): Always shore dives, multiple customers allowed
      // - Boat slots: Multiple customers allowed, personal instructor customers count as 2 in capacity calculations
      
      // Update local state optimistically (before API call for immediate UI feedback)
      setSlotAssignments(prev => {
        const prevSlotAssignments = prev[slotId];
        // Handle both array and single value for backward compatibility
        const prevArray = Array.isArray(prevSlotAssignments) 
          ? prevSlotAssignments 
          : (prevSlotAssignments ? [prevSlotAssignments] : []);
        return {
          ...prev,
          [slotId]: [...prevArray, bookingId]
        };
      });
      
      // Update booking via API
      await dataService.update('bookings', bookingId, updateData);
      
      // Update the local bookings state to reflect the change
      setBookings(prev => prev.map(b => 
        b.id === bookingId 
          ? { ...b, slotAssignment: updateData.slotAssignment }
          : b
      ));
      
      // Reload bookings to get updated data and refresh slotAssignments
      // This ensures slotAssignments is synced with the database
      await loadData();
      
      console.log('[Schedule] Customer assigned successfully');
    } catch (error) {
      console.error('[Schedule] Error assigning customer to slot:', error);
      // Revert optimistic update on error
      setSlotAssignments(prev => {
        const newState = { ...prev };
        if (Array.isArray(newState[slotId])) {
          newState[slotId] = newState[slotId].filter(id => id !== bookingId);
          if (newState[slotId].length === 0) {
            delete newState[slotId];
          }
        } else {
          delete newState[slotId];
        }
        return newState;
      });
    }
  };

  const handleRemoveAssignment = async (slotId, slotType, bookingIdToRemove = null) => {
    try {
      const slotBookings = slotAssignments[slotId];
      if (!slotBookings || (Array.isArray(slotBookings) && slotBookings.length === 0)) {
        return;
      }
      
      // If bookingIdToRemove is provided, remove only that booking; otherwise remove all
      const bookingIdsToRemove = bookingIdToRemove 
        ? [bookingIdToRemove]
        : (Array.isArray(slotBookings) ? slotBookings : [slotBookings]);
      
      // Update each booking
      for (const bookingId of bookingIdsToRemove) {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
          // Remove slot assignment from booking
          const updateData = { slotAssignment: null };
          if (slotType === 'boat') {
            updateData.boatId = null;
          }
          
          await dataService.update('bookings', bookingId, updateData);
        }
      }
      
      // Update local state
      setSlotAssignments(prev => {
        const newState = { ...prev };
        if (bookingIdToRemove && Array.isArray(newState[slotId])) {
          // Remove specific booking from array
          newState[slotId] = newState[slotId].filter(id => id !== bookingIdToRemove);
          if (newState[slotId].length === 0) {
            delete newState[slotId];
          }
        } else {
          // Remove entire slot
          delete newState[slotId];
        }
        return newState;
      });
      
      // Reload bookings
      await loadData();
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const handleRemoveBoatAssignment = async (bookingId, boatId) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        // Remove boat assignment from booking
        const updateData = { 
          boatId: null,
          slotAssignment: null
        };
        
        await dataService.update('bookings', bookingId, updateData);
        
        // Reload bookings
        await loadData();
      }
    } catch (error) {
      console.error('Error removing boat assignment:', error);
    }
  };

  const handleUpdateGuides = async (slotId, guideIds) => {
    try {
      // Update local state
      setSlotGuides(prev => ({
        ...prev,
        [slotId]: guideIds
      }));

      // Determine slot type and update all bookings for this slot
      const slotBookings = slotAssignments[slotId];
      if (!slotBookings || (Array.isArray(slotBookings) && slotBookings.length === 0)) {
        // No bookings yet, just store the guide assignment (could store in a separate slotGuides table)
        return;
      }

      const bookingIds = Array.isArray(slotBookings) ? slotBookings : [slotBookings];
      
      // Update each booking's slotAssignment to include guideIds
      for (const bookingId of bookingIds) {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking && booking.slotAssignment) {
          const updateData = {
            slotAssignment: {
              ...booking.slotAssignment,
              guideIds: guideIds
            }
          };
          await dataService.update('bookings', bookingId, updateData);
        }
      }
      
      // Reload bookings to sync
      await loadData();
    } catch (error) {
      console.error('Error updating guides:', error);
      // Revert on error
      setSlotGuides(prev => {
        const newState = { ...prev };
        delete newState[slotId];
        return newState;
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading schedule...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Dive Schedule</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handlePreviousWeek}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 180, textAlign: 'center' }}>
            {format(displayStart, 'MMM d')} - {format(displayEndDate, 'MMM d, yyyy')}
          </Typography>
          <IconButton onClick={handleNextWeek}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Grid - 7 columns for days of week, rows for weeks */}
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

      {/* Slot Detail Dialog */}
      <Dialog
        open={!!selectedSlot}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedSlot?.type === 'mole' 
                ? 'Mole - Discovery/Try Scuba/Orientation Slots' 
                : selectedSlot?.type === 'boat'
                  ? `${activeBoats.find(b => b.id === selectedSlot?.boatId)?.name || 'Boat'} - Morning Session`
                  : 'Day Schedule'}
            </Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {selectedSlot && format(selectedSlot.date, 'EEEE, MMMM d, yyyy')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedSlot && selectedSlot.type === 'mole' && (
            <SlotDetailView 
              slot={selectedSlot} 
              bookings={getDiscoveryBookings(selectedSlot.date)} 
              customers={customers} 
              boats={activeBoats} 
              staff={staff}
              slotAssignments={slotAssignments}
              slotGuides={slotGuides}
              onAssign={handleAssignCustomer} 
              onRemoveAssignment={handleRemoveAssignment}
              onUpdateGuides={handleUpdateGuides}
            />
          )}
          {selectedSlot && selectedSlot.type === 'boat' && (
            <SlotDetailView 
              slot={selectedSlot} 
              bookings={getDiveBookings(selectedSlot.date)} 
              customers={customers} 
              boats={activeBoats} 
              staff={staff}
              slotAssignments={slotAssignments}
              slotGuides={slotGuides}
              onAssign={handleAssignCustomer} 
              onRemoveAssignment={handleRemoveAssignment}
              onUpdateGuides={handleUpdateGuides}
              onRemoveBoatAssignment={handleRemoveBoatAssignment}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Day Detail View Component - Shows all slots for a day
const DayDetailView = ({ slot, discoveryBookings, diveBookings, customers, boats, slotAssignments, onSlotClick, onAssign, onRemoveAssignment }) => {
  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || customer.email || 'Unknown';
  };

  if (slot.type === 'day') {
    // Show overview of all slots for the day
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
          All Slots for {format(slot.date, 'EEEE, MMMM d, yyyy')}
        </Typography>
        
        {/* Mole Section */}
        <Paper sx={{ p: 2, mb: 2, border: 1, borderColor: 'secondary.main' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" color="secondary.main">Mole - Discovery / Try Scuba / Orientation</Typography>
            <Button variant="outlined" size="small" color="secondary" onClick={() => onSlotClick('mole', slot.date)}>
              View Slots
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {discoveryBookings.length} booking{discoveryBookings.length !== 1 ? 's' : ''} (Discovery/Try Scuba/Orientation)
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
            All discovery, try scuba, and orientation dives are done at Mole
          </Typography>
        </Paper>

        {/* Boat Sections */}
        {boats.slice(0, 3).map((boat) => {
          const boatDiveBookings = diveBookings.filter(b => (b.boatId === boat.id || !b.boatId));
          return (
            <Paper key={boat.id} sx={{ p: 2, mb: 2, border: 1, borderColor: 'primary.main' }}>
              <Typography variant="h6" color="primary.main" gutterBottom>{boat.name}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="primary" 
                  onClick={() => onSlotClick('boat', slot.date, boat.id, 'morning')}
                  sx={{ flex: 1 }}
                >
                  Morning (9AM)
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="primary" 
                  onClick={() => onSlotClick('boat', slot.date, boat.id, 'afternoon')}
                  sx={{ flex: 1 }}
                >
                  Afternoon (12PM)
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {boatDiveBookings.length} dive booking{boatDiveBookings.length !== 1 ? 's' : ''} available
              </Typography>
            </Paper>
          );
        })}
      </Box>
    );
  }

  // For specific slot types (mole or boat), show the slot detail view
  return <SlotDetailView slot={slot} bookings={slot.type === 'mole' ? discoveryBookings : diveBookings} customers={customers} boats={boats} staff={staff} slotAssignments={slotAssignments} slotGuides={slotGuides} onAssign={onAssign} onRemoveAssignment={onRemoveAssignment} onUpdateGuides={onUpdateGuides} />;
};

// Slot Detail View Component - For specific slot types
const SlotDetailView = ({ slot, bookings, customers, boats, staff, slotAssignments, slotGuides, onAssign, onRemoveAssignment, onUpdateGuides }) => {
  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || customer.email || 'Unknown';
  };

  if (slot.type === 'mole') {
    // Generate Mole slots
    const slots = [];
    const [hours, minutes] = MOLE_START_TIME.split(':').map(Number);
    const startTime = new Date(slot.date);
    startTime.setHours(hours, minutes, 0, 0);

    let currentSlot = new Date(startTime);
    const endTime = new Date(slot.date);
    endTime.setHours(13, 0, 0, 0); // Last session ends at 13:00

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, MOLE_SLOT_DURATION);
      if (slotEnd <= endTime) {
        slots.push({
          start: new Date(currentSlot),
          end: slotEnd,
          id: `mole-${format(currentSlot, 'yyyy-MM-dd-HH-mm')}`
        });
      }
      currentSlot = addMinutes(currentSlot, MOLE_SLOT_INTERVAL);
    }

    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
          Available Slots (30-minute intervals, 1-hour duration)
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {slots.map((slotItem) => {
            const slotAssignmentsForSlot = slotAssignments[slotItem.id];
            // Handle both array and single value for backward compatibility
            const assignedBookingIds = Array.isArray(slotAssignmentsForSlot) 
              ? slotAssignmentsForSlot 
              : (slotAssignmentsForSlot ? [slotAssignmentsForSlot] : []);
            const assignedBookings = assignedBookingIds
              .map(id => bookings.find(b => b.id === id))
              .filter(Boolean);
            
            // Filter out bookings that are already assigned to THIS specific slot
            // Allow multiple bookings per slot, so only filter if already in this slot
            const unassignedBookings = bookings.filter(b => {
              const bookingId = b.id;
              // Check if this booking is already assigned to THIS slot
              const slotBookings = slotAssignments[slotItem.id];
              const isAssignedToThisSlot = Array.isArray(slotBookings) 
                ? slotBookings.includes(bookingId) 
                : slotBookings === bookingId;
              return !isAssignedToThisSlot;
            });

            return (
              <Paper
                key={slotItem.id}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: assignedBookings.length > 0 ? 'primary.main' : 'divider',
                  backgroundColor: assignedBookings.length > 0 ? 'primary.light' : 'background.paper',
                  '&:hover': {
                    backgroundColor: assignedBookings.length > 0 ? 'primary.light' : 'action.hover'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {format(slotItem.start, 'HH:mm')} - {format(slotItem.end, 'HH:mm')}
                  </Typography>
                  <Chip
                    label={assignedBookings.length > 0 ? `${assignedBookings.length} assigned` : 'Available'}
                    size="small"
                    color={assignedBookings.length > 0 ? 'primary' : 'default'}
                  />
                </Box>
                {/* Always show assigned bookings if any */}
                {assignedBookings.length > 0 && (
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Assigned customers:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {assignedBookings.map((assignedBooking) => (
                        <Chip
                          key={assignedBooking.id}
                          icon={<PersonIcon />}
                          label={getCustomerName(assignedBooking.customerId || assignedBooking.customer_id)}
                          size="medium"
                          color="primary"
                          onDelete={() => onRemoveAssignment(slotItem.id, 'mole', assignedBooking.id)}
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                {/* Guide Assignment */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Guides</InputLabel>
                    <Select
                      multiple
                      value={slotGuides[slotItem.id] || []}
                      onChange={(e) => onUpdateGuides(slotItem.id, e.target.value)}
                      renderValue={(selected) => {
                        if (selected.length === 0) return 'Select guides';
                        return selected.map(id => {
                          const guide = staff.find(s => s.id === id);
                          return guide ? `${guide.firstName || ''} ${guide.lastName || ''}`.trim() : id;
                        }).join(', ');
                      }}
                    >
                      {staff.filter(s => s.role === 'divemaster' || s.role === 'instructor' || s.role === 'assistant').map((guide) => (
                        <MenuItem key={guide.id} value={guide.id}>
                          {`${guide.firstName || ''} ${guide.lastName || ''}`.trim() || guide.email || guide.id}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Always show unassigned bookings so more can be added */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    {assignedBookings.length > 0 ? 'Add more customers:' : 'Click a customer below to assign:'}
                  </Typography>
                  {unassignedBookings.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {unassignedBookings.map((booking) => (
                        <Chip
                          key={booking.id}
                          icon={<PersonIcon />}
                          label={getCustomerName(booking.customerId || booking.customer_id)}
                          size="small"
                          clickable
                          onClick={() => onAssign(booking.id, slotItem.id, 'mole')}
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      No unassigned customers
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Box>
    );
  } else {
    // Boat slots - show only the selected session (morning or afternoon)
    const selectedSession = BOAT_SESSIONS.find(s => s.name.toLowerCase() === (slot.sessionTime || 'morning'));
    const sessionKey = slot.sessionTime || 'morning';
    
    // Get bookings assigned to this boat (check by boatId in booking)
    const assignedBookings = bookings.filter(b => {
      const bookingBoatId = b.boatId || b.boat_id;
      return bookingBoatId === slot.boatId;
    });
    
    // Get unassigned bookings (no boatId set)
    const unassignedBookings = bookings.filter(b => {
      const bookingBoatId = b.boatId || b.boat_id;
      return !bookingBoatId;
    });

    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
          {boats.find(b => b.id === slot.boatId)?.name || 'Boat'} - {selectedSession?.name || 'Morning'} ({selectedSession?.time})
        </Typography>
        
        <Paper
          sx={{
            p: 2,
            border: 1,
            borderColor: assignedBookings.length > 0 ? 'primary.main' : 'divider',
            backgroundColor: assignedBookings.length > 0 ? 'primary.light' : 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              {selectedSession?.name} Session - {selectedSession?.time} ({selectedSession?.duration} min)
            </Typography>
            <Chip
              label={assignedBookings.length > 0 ? `${assignedBookings.length} assigned` : 'Available'}
              size="small"
              color={assignedBookings.length > 0 ? 'primary' : 'default'}
            />
          </Box>

          {/* Always show assigned customers if any */}
          {assignedBookings.length > 0 && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Assigned customers:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {assignedBookings.map((booking) => (
                  <Chip
                    key={booking.id}
                    icon={<PersonIcon />}
                    label={getCustomerName(booking.customerId || booking.customer_id)}
                    size="medium"
                    color="primary"
                    onDelete={() => onRemoveBoatAssignment(booking.id, slot.boatId)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Guide Assignment */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Guides</InputLabel>
              <Select
                multiple
                value={slotGuides[`boat-${slot.boatId}-${sessionKey}`] || []}
                onChange={(e) => onUpdateGuides(`boat-${slot.boatId}-${sessionKey}`, e.target.value)}
                renderValue={(selected) => {
                  if (selected.length === 0) return 'Select guides';
                  return selected.map(id => {
                    const guide = staff.find(s => s.id === id);
                    return guide ? `${guide.firstName || ''} ${guide.lastName || ''}`.trim() : id;
                  }).join(', ');
                }}
              >
                {staff.filter(s => s.role === 'divemaster' || s.role === 'instructor' || s.role === 'assistant').map((guide) => (
                  <MenuItem key={guide.id} value={guide.id}>
                    {`${guide.firstName || ''} ${guide.lastName || ''}`.trim() || guide.email || guide.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Always show unassigned bookings so they can be added */}
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              {assignedBookings.length > 0 ? 'Add more customers:' : 'Click a customer below to assign to this session:'}
            </Typography>
            {unassignedBookings.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {unassignedBookings.map((booking) => (
                  <Chip
                    key={booking.id}
                    icon={<PersonIcon />}
                    label={getCustomerName(booking.customerId || booking.customer_id)}
                    size="medium"
                    clickable
                    onClick={() => onAssign(booking.id, `boat-${slot.boatId}-${sessionKey}`, 'boat', slot.boatId, sessionKey)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No unassigned dive bookings for this date
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    );
  }
};

export default Schedule;

