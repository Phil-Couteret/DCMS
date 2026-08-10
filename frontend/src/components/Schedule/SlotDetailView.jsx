import React, { useState } from 'react';
import { Box, Chip, FormControl, InputLabel, MenuItem, Paper, Select, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { format, addMinutes } from 'date-fns';
import { MOLE_START_TIME, MOLE_SLOT_DURATION, MOLE_SLOT_INTERVAL, BOAT_SESSIONS } from '../../utils/scheduleConstants';

// Phase 6.5b extraction bug fix: the boat-slot delete-chip handler below
// calls `onRemoveBoatAssignment(...)`, which was missing from this
// component's own destructured props in the original single-file
// Schedule.jsx (it was passed at the call site for the 'boat' case, see
// Schedule.jsx's Slot Detail Dialog, but never received here) - a live,
// reachable ReferenceError whenever someone removed an assigned customer
// from a boat slot. Added to the destructure below.
const SlotDetailView = ({ slot, bookings, customers, boats, staff, slotAssignments, slotGuides, onAssign, onRemoveAssignment, onUpdateGuides, onRemoveBoatAssignment }) => {
  const [draggedBookingId, setDraggedBookingId] = useState(null);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);
  const [dragOverBoatId, setDragOverBoatId] = useState(null);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || customer.email || 'Unknown';
  };

  const handleDragStart = (e, bookingId) => {
    setDraggedBookingId(bookingId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookingId);
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    setDraggedBookingId(null);
    setDragOverSlotId(null);
    setDragOverBoatId(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e, slotId = null, boatId = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (slotId) {
      setDragOverSlotId(slotId);
    } else if (boatId) {
      setDragOverBoatId(boatId);
    }
  };

  const handleDragLeave = () => {
    setDragOverSlotId(null);
    setDragOverBoatId(null);
  };

  const handleDrop = (e, slotId, slotType, boatId = null, sessionTime = null) => {
    e.preventDefault();
    const bookingId = e.dataTransfer.getData('text/plain') || draggedBookingId;
    
    if (bookingId && onAssign) {
      if (slotType === 'mole' && slotId) {
        onAssign(bookingId, slotId, 'mole');
      } else if (slotType === 'boat' && boatId) {
        onAssign(bookingId, `boat-${boatId}-${sessionTime || 'morning'}`, 'boat', boatId, sessionTime || 'morning');
      }
    }
    
    setDraggedBookingId(null);
    setDragOverSlotId(null);
    setDragOverBoatId(null);
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

            const isDragOver = dragOverSlotId === slotItem.id;

            return (
              <Paper
                key={slotItem.id}
                onDragOver={(e) => handleDragOver(e, slotItem.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slotItem.id, 'mole')}
                sx={{
                  p: 2,
                  border: 2,
                  borderColor: isDragOver ? 'success.main' : (assignedBookings.length > 0 ? 'primary.main' : 'divider'),
                  backgroundColor: isDragOver ? 'success.light' : (assignedBookings.length > 0 ? 'primary.light' : 'background.paper'),
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: isDragOver ? 'success.light' : (assignedBookings.length > 0 ? 'primary.light' : 'action.hover')
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, assignedBooking.id)}
                          onDragEnd={handleDragEnd}
                          sx={{ 
                            mr: 0.5, 
                            mb: 0.5,
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedBookingId === assignedBooking.id ? 0.5 : 1
                          }}
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
                      onChange={(e) => onUpdateGuides(slotItem.id, e.target.value, { slotType: 'mole', date: slot.date })}
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
                    {assignedBookings.length > 0 ? 'Add more customers (drag & drop or click):' : 'Drag customers here or click to assign:'}
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, booking.id)}
                          onDragEnd={handleDragEnd}
                          sx={{ 
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' },
                            opacity: draggedBookingId === booking.id ? 0.5 : 1
                          }}
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
    // Phase 6.17 (roadmap): guide-slot key now includes the date - it used
    // to be `boat-${boatId}-${session}` with no date at all, which meant
    // guides "assigned" to e.g. Boat A's morning session would show as
    // assigned on every day, not just the day they were actually set for.
    const dateStr = format(slot.date, 'yyyy-MM-dd');
    const boatGuideSlotKey = `boat-${slot.boatId}-${dateStr}-${sessionKey}`;

    // Get bookings assigned to this boat for this session (check by
    // boatId+session in booking; bookings saved before Phase 6.17 have no
    // session at all, treated as 'morning' for backward compatibility).
    const assignedBookings = bookings.filter(b => {
      const bookingBoatId = b.boatId || b.boat_id;
      const bookingSession = b.session || 'morning';
      return bookingBoatId === slot.boatId && bookingSession === sessionKey;
    });

    // Get unassigned bookings (no boatId set)
    const unassignedBookings = bookings.filter(b => {
      const bookingBoatId = b.boatId || b.boat_id;
      return !bookingBoatId;
    });

    const isDragOverBoat = dragOverBoatId === slot.boatId;

    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
          {boats.find(b => b.id === slot.boatId)?.name || 'Boat'} - {selectedSession?.name || 'Morning'} ({selectedSession?.time})
        </Typography>
        
          <Paper
            onDragOver={(e) => handleDragOver(e, null, slot.boatId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null, 'boat', slot.boatId, sessionKey)}
            sx={{
              p: 2,
              border: 2,
              borderColor: isDragOverBoat ? 'success.main' : (assignedBookings.length > 0 ? 'primary.main' : 'divider'),
              backgroundColor: isDragOverBoat ? 'success.light' : (assignedBookings.length > 0 ? 'primary.light' : 'background.paper'),
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isDragOverBoat ? 'success.light' : (assignedBookings.length > 0 ? 'primary.light' : 'action.hover')
              }
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, booking.id)}
                    onDragEnd={handleDragEnd}
                    sx={{ 
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                      opacity: draggedBookingId === booking.id ? 0.5 : 1
                    }}
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
                value={slotGuides[boatGuideSlotKey] || []}
                onChange={(e) => onUpdateGuides(boatGuideSlotKey, e.target.value, { slotType: 'boat', date: slot.date, boatId: slot.boatId })}
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
              {assignedBookings.length > 0 ? 'Add more customers (drag & drop or click):' : 'Drag customers here or click to assign:'}
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

export default SlotDetailView;
