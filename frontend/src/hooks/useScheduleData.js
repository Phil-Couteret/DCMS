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

      // Note: Multiple customers can always be assigned to the same slot
      // - Discovery dives (Mole slots): Always shore dives, multiple customers allowed
      // - Boat slots: Multiple customers allowed, personal instructor customers count as 2 in capacity calculations

      // `updateData.slotAssignment` above is local-only bookkeeping - there is
      // no `slot_assignment` column on `bookings` (never has been; the
      // Schedule page's actual slot/guide grouping is driven entirely by the
      // separate `slotAssignments`/`slotGuides` state, rebuilt each load from
      // whatever `booking.slotAssignment` the frontend itself last attached
      // in memory). Sending it to the API used to be silently dropped by the
      // backend's explicit per-field update mapping; since `forbidNonWhitelisted`
      // was turned on it makes the *entire* PUT request 400, which was also
      // silently swallowing the one real field here (`boatId`) that DOES
      // persist. Build a backend-only payload with just the real DTO fields.
      const backendUpdateData = {};
      if (updateData.boatId !== undefined) {
        backendUpdateData.boatId = updateData.boatId;
      }
      if (Object.keys(backendUpdateData).length > 0) {
        await dataService.update('bookings', bookingId, backendUpdateData);
      }

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

      // Update the local bookings state to reflect the change
      setBookings(prev => prev.map(b =>
        b.id === bookingId
          ? { ...b, slotAssignment: updateData.slotAssignment }
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

      // Update each booking. `slotAssignment` is local-only bookkeeping (see
      // handleAssignCustomer) - there is no such column on `bookings`, so
      // only the real `boatId` field (boat slots only) is sent to the API.
      for (const bookingId of bookingIdsToRemove) {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking && slotType === 'boat') {
          await dataService.update('bookings', bookingId, { boatId: null });
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
        // `slotAssignment` is local-only bookkeeping, no such column exists
        // on `bookings` - only `boatId` is a real, persistable field.
        await dataService.update('bookings', bookingId, { boatId: null });

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

      // Guide assignments have no backing column on `bookings` at all (no
      // API call was ever actually persisting this - `slotAssignment` isn't
      // a real field, see handleAssignCustomer) - the `setSlotGuides` call
      // above is the entire mechanism for this, same as before. Reload just
      // to stay in sync with any other changes since the last load.
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
