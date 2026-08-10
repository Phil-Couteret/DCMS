import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import SlotDetailView from './SlotDetailView';

// Day Detail View Component - Shows all slots for a day
//
// Phase 6.5b extraction bug fix: this component calls `navigate(...)` (Mole
// section's "Trip Details" button, below) and, in the slot.type !== 'day'
// branch, reads `staff`/`slotGuides`/`onUpdateGuides`. In the original
// single-file Schedule.jsx, DayDetailView was a *separate* top-level
// component (not nested in Schedule), so none of those were actually in
// scope there either - `navigate` was a real, reachable ReferenceError
// (this component is always invoked with slot.type: 'day', so that branch
// runs every time the day-detail dialog opens), while `staff`/`slotGuides`/
// `onUpdateGuides` were an undeclared-variable bug in a branch that never
// executes (the only call site always passes `slot={{ type: 'day', ... }}`)
// - latent, not live, but still wrong. Fixed here by getting `navigate`
// from useNavigate() directly (this is its own module now, so that's
// straightforward) and accepting staff/slotGuides/onUpdateGuides as props
// so the dead branch is at least correctly scoped if it's ever reached.
const DayDetailView = ({ slot, discoveryBookings, diveBookings, customers, boats, staff, slotAssignments, slotGuides, onSlotClick, onAssign, onRemoveAssignment, onUpdateGuides }) => {
  const navigate = useNavigate();
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" color="secondary" onClick={() => onSlotClick('mole', slot.date)}>
                View Slots
              </Button>
              <Button 
                variant="contained" 
                size="small" 
                color="secondary"
                onClick={() => {
                  const dateStr = format(slot.date, 'yyyy-MM-dd');
                  navigate(`/schedule/trip/${dateStr}/mole`);
                }}
              >
                Trip Details
              </Button>
            </Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
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
                <Button 
                  variant="contained" 
                  size="small" 
                  color="primary"
                  fullWidth
                  onClick={() => {
                    const dateStr = format(slot.date, 'yyyy-MM-dd');
                    window.location.href = `/schedule/trip/${dateStr}/boat/${boat.id}/morning`;
                  }}
                >
                  Trip Details
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

export default DayDetailView;
