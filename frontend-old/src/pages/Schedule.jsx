import React from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import useScheduleData from '../hooks/useScheduleData';
import MonthView from '../components/Schedule/MonthView';
import DailyView from '../components/Schedule/DailyView';
import WeekView from '../components/Schedule/WeekView';
import DayDetailView from '../components/Schedule/DayDetailView';
import SlotDetailView from '../components/Schedule/SlotDetailView';

/**
 * Phase 6.5b (roadmap item 5): split out of the original 1,588-line
 * Schedule.jsx. Unlike BoatPrep/Financial/Equipment, this page switches
 * "views" (month/daily/week) via plain Buttons rather than MUI Tabs, and
 * has a header + two dialogs that read/write hook state closely enough
 * that pulling them into their own files would have meant threading most
 * of the hook's return value through anyway - so they stay here, and the
 * three heavy calendar views (each 100-200 lines) plus the two detail-view
 * subcomponents (which were already separate components in the original
 * file, just co-located) moved to components/Schedule/.
 */
const Schedule = () => {
  const data = useScheduleData();
  const {
    t,
    navigate,
    currentDate,
    viewMode, setViewMode,
    selectedSlot, setSelectedSlot,
    selectedDate, setSelectedDate,
    customers,
    staff,
    loading,
    slotAssignments,
    slotGuides,
    displayStart,
    displayEndDate,
    activeBoats,
    getDiscoveryBookings,
    getDiveBookings,
    handlePreviousWeek,
    handleNextWeek,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleCloseDialog,
    handleAssignCustomer,
    handleRemoveAssignment,
    handleRemoveBoatAssignment,
    handleUpdateGuides,
  } = data;

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">{t('schedule.diveSchedule')}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* Action Buttons */}
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/bookings/new')}
          >
            Add New Dive Trip
          </Button>

          {/* View Mode Toggle */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('month')}
            >
              {t('schedule.tripSchedules')}
            </Button>
            <Button
              variant={viewMode === 'daily' ? 'contained' : 'outlined'}
              size="small"
              color="warning"
              onClick={() => setViewMode('daily')}
            >
              Daily Summary
            </Button>
            <Button
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('week')}
            >
              {t('schedule.week')}
            </Button>
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={viewMode === 'month' ? handlePreviousMonth : handlePreviousWeek}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleToday}
            >
              Today
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={viewMode === 'month' ? handleNextMonth : handleNextWeek}
            >
              Next
            </Button>
          </Box>

          {/* Date Display */}
          <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
            {viewMode === 'month'
              ? format(currentDate, 'MMMM yyyy')
              : viewMode === 'daily'
              ? format(currentDate, 'EEEE, MMMM d, yyyy')
              : `${format(displayStart, 'MMM d')} - ${format(displayEndDate, 'MMM d, yyyy')}`
            }
          </Typography>
        </Box>
      </Box>

      {viewMode === 'month' && <MonthView {...data} />}
      {viewMode === 'daily' && <DailyView {...data} />}
      {viewMode === 'week' && <WeekView {...data} />}

      {/* Month View Day Detail Dialog */}
      <Dialog
        open={selectedDate !== null && viewMode === 'month'}
        onClose={() => setSelectedDate(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Typography>
            <IconButton onClick={() => setSelectedDate(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDate && (
            <DayDetailView
              slot={{ type: 'day', date: selectedDate }}
              discoveryBookings={getDiscoveryBookings(selectedDate)}
              diveBookings={getDiveBookings(selectedDate)}
              customers={customers}
              boats={activeBoats}
              staff={staff}
              slotAssignments={slotAssignments}
              slotGuides={slotGuides}
              onSlotClick={(type, date, boatId, sessionTime) => {
                setSelectedDate(null);
                setViewMode('week'); // Switch to week view to show slot details
                if (type === 'mole') {
                  setSelectedSlot({ type: 'mole', date });
                } else if (type === 'boat') {
                  setSelectedSlot({ type: 'boat', date, boatId, sessionTime });
                }
              }}
              onAssign={handleAssignCustomer}
              onRemoveAssignment={handleRemoveAssignment}
              onUpdateGuides={handleUpdateGuides}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDate(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Slot Detail Dialog */}
      <Dialog
        open={!!selectedSlot && viewMode === 'week'}
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

export default Schedule;
