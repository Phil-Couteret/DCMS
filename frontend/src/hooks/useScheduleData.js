import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMinutes,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths
} from 'date-fns';
import dataService from '../services/dataService';
import { useTranslation } from '../utils/languageContext';
import { MOLE_START_TIME, MOLE_SLOT_DURATION, MOLE_SLOT_INTERVAL } from '../utils/scheduleConstants';

/**
 * Phase 6.5b extraction (roadmap item 5, same shared-hook pattern as
 * BoatPrep/Financial/Equipment in Phases 5.2/6.5a): all state/effects/
 * handlers for the Schedule page. Unlike those pages, Schedule switches
 * between view modes (month/daily/week) via plain Buttons rather than MUI
 * Tabs, but the underlying reason for one shared hook is the same - all
 * three views (and the day/slot detail dialogs) read and mutate the same
 * bookings/slotAssignments/slotGuides state.
 */
export default function useScheduleData() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', or 'daily'
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // For month view date selection
  const [locations, setLocations] = useState([]);
  const [boats, setBoats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotAssignments, setSlotAssignments] = useState({});
  const [slotGuides, setSlotGuides] = useState({}); // { slotId: [guideId1, guideId2, ...] }
  // Phase 6.17 (roadmap): slotGuides above is the display map used by
  // SlotDetailView; slotGuideRecordIds tracks the backing
  // scheduleSlotGuides row id per slotKey (when one exists yet) so
  // handleUpdateGuides knows whether to update() or create() - same
  // "editing ? update : create" pattern as useEquipmentData.js's
  // handleSaveTank, since a slot has no id until a guide is first saved to it.
  const [slotGuideRecordIds, setSlotGuideRecordIds] = useState({});

  const currentLocationId = localStorage.getItem('dcms_current_location');

  // Month view calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Get first day of week for the month (Monday = 1, so we adjust)
  const firstDayOfWeek = monthStart.getDay();
  const daysBeforeMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start

  // Calculate 4 rolling weeks: 1 week before, current week, 2 weeks after (for week view)
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
      const [locationsData, boatsData, bookingsData, customersData, diveSitesData, staffData, slotGuidesData] = await Promise.all([
        dataService.getAll('locations'),
        dataService.getAll('boats'),
        dataService.getAll('bookings'),
        dataService.getAll('customers'),
        dataService.getAll('diveSites'),
        dataService.getAll('staff'),
        dataService.getAll('scheduleSlotGuides')
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

      // Phase 6.17 (roadmap): rebuild slotAssignments from the real
      // `booking.moleSlotTime` column (Mole/shore assignment) instead of the
      // old ephemeral `booking.slotAssignment` field, which never had a
      // backing column and never survived a reload. Boat-slot customer
      // assignment isn't derived here at all - SlotDetailView reads it
      // directly from `booking.boatId`/`booking.session`, a real column,
      // same as before this change.
      setSlotAssignments(prev => {
        const initialAssignments = {};
        allBookings.forEach(booking => {
          const moleSlotTime = booking.moleSlotTime || booking.mole_slot_time;
          const bookingDate = booking.bookingDate || booking.booking_date;
          if (moleSlotTime && bookingDate) {
            const dateStr = (bookingDate.split ? bookingDate.split('T')[0] : bookingDate);
            const slotId = `mole-${dateStr}-${moleSlotTime.replace(':', '-')}`;
            if (!initialAssignments[slotId]) {
              initialAssignments[slotId] = [];
            }
            if (!initialAssignments[slotId].includes(booking.id)) {
              initialAssignments[slotId].push(booking.id);
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

      // Phase 6.17: guide coverage per slot now comes from the real
      // scheduleSlotGuides table instead of never being persisted at all.
      // Filtered to the current location, same as boats/staff above.
      const locationSlotGuides = Array.isArray(slotGuidesData)
        ? slotGuidesData.filter(r => (r.locationId || r.location_id) === currentLocationId)
        : [];
      setSlotGuides(prev => {
        const initialGuides = {};
        locationSlotGuides.forEach(record => {
          initialGuides[record.slotKey || record.slot_key] = record.guideIds || record.guide_ids || [];
        });
        return { ...prev, ...initialGuides };
      });
      setSlotGuideRecordIds(prev => {
        const ids = {};
        locationSlotGuides.forEach(record => {
          ids[record.slotKey || record.slot_key] = record.id;
        });
        return { ...prev, ...ids };
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

  // Get dive site name for a booking
  const getDiveSiteName = (booking) => {
    const diveSiteId = booking.diveSiteId || booking.dive_site_id;
    if (diveSiteId) {
      const site = diveSites.find(s => s.id === diveSiteId);
      if (site) return site.name;
    }
    return null;
  };

  // Get boat name for a booking
  const getBoatNameForBooking = (booking) => {
    const boatId = booking.boatId || booking.boat_id;
    if (boatId) {
      const boat = boats.find(b => b.id === boatId);
      if (boat) return boat.name;
    }
    return null;
  };

  // Format trip entry for calendar display (like "9a (1) Shore, Jemelos")
  const formatTripEntry = (booking) => {
    const time = booking.bookingTime || booking.booking_time || booking.bookingDate || '09:00';
    let timeStr = '9a';
    if (typeof time === 'string') {
      if (time.includes('T')) {
        const timePart = time.split('T')[1];
        if (timePart) {
          const hours = parseInt(timePart.substring(0, 2));
          if (hours === 9) timeStr = '9a';
          else if (hours === 12) timeStr = '12p';
          else timeStr = `${hours}${hours >= 12 ? 'p' : 'a'}`;
        }
      } else if (time.includes(':')) {
        const hours = parseInt(time.substring(0, 2));
        if (hours === 9) timeStr = '9a';
        else if (hours === 12) timeStr = '12p';
        else timeStr = `${hours}${hours >= 12 ? 'p' : 'a'}`;
      }
    }
    const customerCount = 1; // Each booking is one customer
    const activityType = booking.activityType || booking.activity_type;
    const isShore = activityType === 'discovery' || activityType === 'discover' || activityType === 'try_dive' || activityType === 'orientation';
    const tripType = isShore ? 'Shore' : 'Boat';
    const diveSiteName = getDiveSiteName(booking);
    const boatName = !isShore ? getBoatNameForBooking(booking) : null;

    const location = diveSiteName || boatName || '';
    return `${timeStr} (${customerCount}) ${tripType}${location ? ', ' + location : ''}`;
  };

  const handlePreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date) => {
    // Don't do anything on day click - each rectangle is independent
  };

  const handleMonthDayClick = (date) => {
    // In month view, clicking a day opens the day's detail view
    setSelectedDate(date);
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
      // Update booking with slot assignment
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        console.error('[Schedule] Booking not found:', bookingId);
        return;
      }

      // Phase 6.17 (roadmap): moleSlotTime/session are real bookings columns
      // now (replacing the old ephemeral `slotAssignment` field - see
      // Phase 6.14's audit). Multiple customers can always be assigned to
      // the same slot - Discovery/Mole dives are always shore dives,
      // multiple customers allowed; boat slots also allow multiple
      // customers (personal-instructor customers count as 2 in capacity
      // calculations elsewhere).
      const backendUpdateData = {};

      if (slotType === 'mole') {
        // Slot ID format: mole-yyyy-MM-dd-HH-mm
        // So after split by '-': [0]=mole, [1]=yyyy, [2]=MM, [3]=dd, [4]=HH, [5]=mm
        const slotInfo = slotId.split('-');
        if (slotInfo.length >= 6) {
          backendUpdateData.moleSlotTime = `${slotInfo[4]}:${slotInfo[5]}`; // HH:mm
        } else {
          console.warn('[Schedule] Invalid Mole slot ID format, cannot persist slot time:', slotId);
        }
      } else if (slotType === 'boat') {
        backendUpdateData.boatId = boatId;
        backendUpdateData.session = sessionTime || 'morning';
      }

      if (Object.keys(backendUpdateData).length > 0) {
        await dataService.update('bookings', bookingId, backendUpdateData);
      }

      // Update local state optimistically (before reload for immediate UI feedback)
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

      // Update the local bookings state to reflect the change
      setBookings(prev => prev.map(b =>
        b.id === bookingId
          ? { ...b, ...backendUpdateData }
          : b
      ));

      // Reload bookings to get updated data and refresh slotAssignments
      await loadData();
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

      // Phase 6.17: both slot types now have real columns to clear.
      for (const bookingId of bookingIdsToRemove) {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) continue;
        if (slotType === 'boat') {
          await dataService.update('bookings', bookingId, { boatId: null, session: null });
        } else if (slotType === 'mole') {
          await dataService.update('bookings', bookingId, { moleSlotTime: null });
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
        await dataService.update('bookings', bookingId, { boatId: null, session: null });

        // Reload bookings
        await loadData();
      }
    } catch (error) {
      console.error('Error removing boat assignment:', error);
    }
  };

  // Phase 6.17 (roadmap): persists guide coverage for a slot via the real
  // scheduleSlotGuides table (previously never persisted at all - see
  // Phase 6.14's audit). `context` carries what's needed to build the
  // record when one doesn't exist yet for this slot: { slotType: 'mole'|
  // 'boat', date: Date, boatId?: string }. slotKey already uniquely
  // identifies the slot (it's the same string used as the React key/prop
  // throughout Schedule's views).
  const handleUpdateGuides = async (slotKey, guideIds, context = {}) => {
    const previousGuideIds = slotGuides[slotKey];
    try {
      // Update local state optimistically
      setSlotGuides(prev => ({
        ...prev,
        [slotKey]: guideIds
      }));

      if (!currentLocationId || !context.slotType || !context.date) {
        console.warn('[Schedule] Missing context for handleUpdateGuides, cannot persist:', slotKey, context);
        return;
      }

      const existingId = slotGuideRecordIds[slotKey];
      if (existingId) {
        await dataService.update('scheduleSlotGuides', existingId, { guideIds });
      } else {
        const created = await dataService.create('scheduleSlotGuides', {
          locationId: currentLocationId,
          date: format(context.date, 'yyyy-MM-dd'),
          slotType: context.slotType,
          slotKey,
          boatId: context.boatId || null,
          guideIds
        });
        if (created && created.id) {
          setSlotGuideRecordIds(prev => ({ ...prev, [slotKey]: created.id }));
        }
      }
    } catch (error) {
      console.error('Error updating guides:', error);
      // Revert on error
      setSlotGuides(prev => ({ ...prev, [slotKey]: previousGuideIds }));
    }
  };

  return {
    t,
    navigate,
    currentDate, setCurrentDate,
    viewMode, setViewMode,
    selectedSlot, setSelectedSlot,
    selectedDate, setSelectedDate,
    locations,
    boats,
    bookings,
    customers,
    diveSites,
    staff,
    loading,
    slotAssignments,
    slotGuides,
    daysInMonth,
    daysBeforeMonth,
    displayStart,
    displayEndDate,
    daysToDisplay,
    activeBoats,
    generateMoleSlots,
    getBookingsForDate,
    getDiscoveryBookings,
    getDiveBookings,
    getCustomerName,
    getDiveSiteName,
    getBoatNameForBooking,
    formatTripEntry,
    handlePreviousWeek,
    handleNextWeek,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleDayClick,
    handleMonthDayClick,
    handleMoleClick,
    handleBoatClick,
    handleCloseDialog,
    handleAssignCustomer,
    handleRemoveAssignment,
    handleRemoveBoatAssignment,
    handleUpdateGuides,
  };
}
