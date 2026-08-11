// All shared state, data loading, and business logic for the Boat
// Preparation workflow (boat/staff/diver assignment, shore dives, dive
// site suggestions, post-dive reports, compliance export). Extracted from
// the former monolithic BoatPrep.jsx (Phase 5.2) - its 3 tabs (Preparation,
// Post-Dive Reports, Compliance Reports) all read and write this same
// shared state, so unlike Settings.jsx's independent tabs, this couldn't
// be split into fully self-contained per-tab components without
// duplicating ~1,450 lines of tightly-coupled logic three times. Instead,
// this single hook centralizes it, and each tab component (see
// components/BoatPrep/*.jsx) consumes the same call's return value.
//
// This is a pure "Extract Hook" refactor: every line of logic below is
// unchanged from the original component body, just moved into its own
// function.
import React, { useMemo, useState, useEffect } from 'react';
import { Box, IconButton, ListItem, ListItemText } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import dataService from '../services/dataService';
import { useTranslation } from '../utils/languageContext';

const getDiverSkillLevel = (customer) => {
  const level = (customer.centerSkillLevel || 'beginner').toLowerCase();
  return ['beginner', 'intermediate', 'advanced'].includes(level) ? level : 'beginner';
};

const allowedDifficultyForGroup = (customers) => {
  const hasBeginner = customers.some(c => getDiverSkillLevel(c) === 'beginner');
  return hasBeginner ? 'beginner' : 'advanced';
};

const getRecentDiveSiteIdsForCustomers = (customerIds, allBookings, days = 3) => {
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
  if (!Array.isArray(allBookings)) return new Set();
  const recent = allBookings.filter(b => b.bookingDate >= since && customerIds.includes(b.customerId));
  return new Set(recent.map(b => b.diveSiteId).filter(Boolean));
};

const suggestDiveSites = (locationId, allCustomers, allDiveSites, allBookings) => {
  if (!Array.isArray(allDiveSites)) return [];
  const allSites = allDiveSites.filter(s => s.locationId === locationId);
  if (allCustomers.length === 0) return allSites.slice(0, 5);
  const cap = allowedDifficultyForGroup(allCustomers);
  const disallow = getRecentDiveSiteIdsForCustomers(allCustomers.map(c => c.id), allBookings, 3);
  const filtered = allSites.filter(site => {
    const difficulty = (site.difficultyLevel || site.difficulty || 'beginner').toLowerCase();
    const difficultyOk = cap === 'beginner' ? difficulty === 'beginner' : true;
    const notRepeated = !disallow.has(site.id);
    return difficultyOk && notRepeated;
  });
  return filtered.slice(0, 5);
};

const getSkillCounts = (customers) => {
  const counts = { beginner: 0, intermediate: 0, advanced: 0 };
  customers.forEach(c => {
    const skill = getDiverSkillLevel(c);
    counts[skill] = (counts[skill] || 0) + 1;
  });
  return counts;
};

const isShoreDive = (diveSiteId, session, allDiveSites) => {
  if (!diveSiteId) return false;
  if (!Array.isArray(allDiveSites)) return session === 'night';
  const site = allDiveSites.find(s => s.id === diveSiteId);
  // Mole is a shore dive, and night dives are always at Mole (shore dive)
  return session === 'night' || (site && site.name.toLowerCase().includes('mole'));
};

const requiresCaptain = (diveSiteId, session, allDiveSites) => {
  return !isShoreDive(diveSiteId, session, allDiveSites);
};

const requiresGuide = (session) => {
  // Morning and afternoon require guides, night (Mole shore dive) and 10:15 don't
  return session === 'morning' || session === 'afternoon';
};


export default function useBoatPrepData() {
  const { t } = useTranslation();
  const storedLocationId = localStorage.getItem('dcms_current_location');
  // State for locations - load asynchronously
  const [locations, setLocations] = useState([]);
  
  // Load locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locs = await dataService.getAll('locations');
        if (Array.isArray(locs)) {
          setLocations(locs);
        } else {
          setLocations([]);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocations([]);
      }
    };
    loadLocations();
  }, []);
  
  // Get the current location object (works with both UUID and short names)
  const currentLocation = useMemo(() => {
    if (!storedLocationId || !Array.isArray(locations) || locations.length === 0) return null;
    // Try to find by ID first
    let location = locations.find(l => l.id === storedLocationId);
    if (location) return location;
    // Try to find by name (case-insensitive partial match)
    const searchTerm = storedLocationId.toLowerCase();
    location = locations.find(l => {
      const name = (l.name || '').toLowerCase();
      return name.includes(searchTerm) || name.startsWith(searchTerm) || l.code === storedLocationId;
    });
    return location || null;
  }, [storedLocationId, locations]);
  
  // Use the location ID from the found location, or fall back to storedLocationId
  const locationId = useMemo(() => {
    return currentLocation?.id || storedLocationId;
  }, [currentLocation, storedLocationId]);
  
  // Resolve location ID to UUID for matching (boats and bookings use UUIDs)
  const resolvedLocationId = useMemo(() => {
    if (!storedLocationId) return null;
    // If already a UUID, use it
    if (storedLocationId.includes('-')) return storedLocationId;
    // If short name like 'caleta', find location with UUID by name
    if (!Array.isArray(locations) || locations.length === 0) {
      // Fallback: hardcoded UUID mapping for known locations
      const searchTerm = storedLocationId.toLowerCase();
      if (searchTerm === 'caleta') return '550e8400-e29b-41d4-a716-446655440001';
      if (searchTerm === 'playitas') return '550e8400-e29b-41d4-a716-446655440002';
      return storedLocationId;
    }
    const searchTerm = storedLocationId.toLowerCase();
    const locWithUUID = locations.find(l => {
      if (!l.id || !l.id.includes('-')) return false;
      const name = (l.name || '').toLowerCase();
      return name.includes(searchTerm) || name.startsWith(searchTerm);
    });
    if (locWithUUID?.id) return locWithUUID.id;
    // Fallback: hardcoded UUID mapping for known locations
    if (searchTerm === 'caleta') return '550e8400-e29b-41d4-a716-446655440001';
    if (searchTerm === 'playitas') return '550e8400-e29b-41d4-a716-446655440002';
    return storedLocationId;
  }, [storedLocationId, locations]);
  
  const [activeTab, setActiveTab] = useState(0); // 0 = Preparation, 1 = Post-Dive Reports
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd')); // Date for post-dive reports
  const [session, setSession] = useState('morning');
  
  // State for async data loading
  const [allBoats, setAllBoats] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [boatPreps, setBoatPreps] = useState([]);
  
  // Load all data asynchronously
  useEffect(() => {
    const loadData = async () => {
      try {
        const [boatsData, customersData, staffData, bookingsData, sitesData, prepsData] = await Promise.all([
          dataService.getAll('boats'),
          dataService.getAll('customers'),
          dataService.getAll('staff'),
          dataService.getAll('bookings'),
          dataService.getAll('diveSites'),
          dataService.getAll('boatPreps')
        ]);
        
        setAllBoats(Array.isArray(boatsData) ? boatsData : []);
        setAllCustomers(Array.isArray(customersData) ? customersData : []);
        setAllStaff(Array.isArray(staffData) ? staffData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setDiveSites(Array.isArray(sitesData) ? sitesData : []);
        setBoatPreps(Array.isArray(prepsData) ? prepsData : []);
      } catch (error) {
        console.error('Error loading data:', error);
        setAllBoats([]);
        setAllCustomers([]);
        setAllStaff([]);
        setBookings([]);
        setDiveSites([]);
        setBoatPreps([]);
      }
    };
    loadData();
  }, []);
  
  // Filter boats by location (this is what the code expects as 'boats')
  // Handle both camelCase and snake_case field names
  const boats = useMemo(() => {
    if (!resolvedLocationId) return [];
    const filtered = allBoats.filter(b => {
      const boatLocationId = b.locationId || b.location_id;
      const isActive = b.isActive !== false; // Default to true if not set
      return boatLocationId === resolvedLocationId && isActive;
    });
    return filtered;
  }, [allBoats, resolvedLocationId]);
  const hasBoats = boats.length > 0;
  
  // Reset session to morning if 10:15 is selected but location doesn't support it (Las Playitas)
  useEffect(() => {
    if (session === '10:15' && !hasBoats) {
      setSession('morning');
    }
  }, [hasBoats, session]);
  
  // State to force refresh when bookings/customers change
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Reload data when refreshKey changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customersData, bookingsData, prepsData] = await Promise.all([
          dataService.getAll('customers'),
          dataService.getAll('bookings'),
          dataService.getAll('boatPreps')
        ]);
        setAllCustomers(Array.isArray(customersData) ? customersData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setBoatPreps(Array.isArray(prepsData) ? prepsData : []);
      } catch (error) {
        console.error('Error reloading data:', error);
      }
    };
    if (refreshKey > 0) {
      loadData();
    }
  }, [refreshKey]);
  
  // Listen for booking updates to refresh the display
  useEffect(() => {
    const handleDataUpdate = () => {
      // Force re-render by updating refreshKey
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('dcms_booking_created', handleDataUpdate);
    window.addEventListener('dcms_booking_updated', handleDataUpdate);
    window.addEventListener('dcms_bookings_synced', handleDataUpdate);
    window.addEventListener('dcms_customer_created', handleDataUpdate);
    window.addEventListener('dcms_customer_updated', handleDataUpdate);
    window.addEventListener('dcms_customers_synced', handleDataUpdate);
    // Listen for storage changes (localStorage updates from other tabs/components)
    window.addEventListener('storage', handleDataUpdate);
    
    return () => {
      window.removeEventListener('dcms_booking_created', handleDataUpdate);
      window.removeEventListener('dcms_booking_updated', handleDataUpdate);
      window.removeEventListener('dcms_bookings_synced', handleDataUpdate);
      window.removeEventListener('dcms_customer_created', handleDataUpdate);
      window.removeEventListener('dcms_customer_updated', handleDataUpdate);
      window.removeEventListener('dcms_customers_synced', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, []);
  const activeStaff = useMemo(() => allStaff.filter(u => u.isActive), [allStaff]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Boat assignments: { boatId: [customerId, ...] }
  const [boatAssignments, setBoatAssignments] = useState({});
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Staff assignments: { boatId: { captain: userId, guides: [userId], trainees: [userId] } }
  const [staffAssignments, setStaffAssignments] = useState({});
  
  // For shore dives, use a single "group" instead of boats
  const shoreDiveGroupId = 'shore-dive-group';
  const [shoreDiveAssignments, setShoreDiveAssignments] = useState([]);
  const [shoreDiveStaff, setShoreDiveStaff] = useState({ guides: [], trainees: [] });
  const [shoreDiveSiteId, setShoreDiveSiteId] = useState('');
  
  // Get shore dive customers and skill counts
  const shoreDiveCustomers = useMemo(() => {
    return shoreDiveAssignments.map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
  }, [shoreDiveAssignments, allCustomers]);
  
  const shoreDiveSkillCounts = useMemo(() => getSkillCounts(shoreDiveCustomers), [shoreDiveCustomers]);
  
  // Get shore dive site suggestions
  const shoreDiveSiteSuggestions = useMemo(() => {
    return suggestDiveSites(resolvedLocationId, shoreDiveCustomers, diveSites, bookings);
  }, [resolvedLocationId, shoreDiveCustomers, diveSites, bookings]);
  
  // Get bookings for the selected date and session
  const bookingsForDate = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    
    // Use resolved location ID (bookings use UUIDs)
    const filtered = bookings.filter(b => {
      // Check date matches (handle different date formats)
      const bookingDate = b.bookingDate ? (b.bookingDate.split('T')[0] || b.bookingDate) : null;
      const selectedDate = date ? (date.split('T')[0] || date) : null;
      const dateMatch = bookingDate === selectedDate;
      
      // Check location matches (bookings might use UUIDs or short names like 'caleta')
      // Normalize booking locationId for comparison
      let bookingLocationId = b.locationId || b.location_id; // Handle both camelCase and snake_case
      
      // If bookingLocationId is missing, skip this booking (shouldn't match any location)
      if (!bookingLocationId) {
        return false;
      }
      
      // If it's not a UUID, try to resolve it (shouldn't happen with API bookings, but handle for backward compatibility)
      if (!bookingLocationId.includes('-')) {
        // Short name like 'caleta', need to resolve to UUID
        const searchTerm = bookingLocationId.toLowerCase();
        // Use exact matches first (preferred method)
        if (searchTerm === 'caleta') {
          bookingLocationId = '550e8400-e29b-41d4-a716-446655440001';
        } else if (searchTerm === 'playitas') {
          bookingLocationId = '550e8400-e29b-41d4-a716-446655440002';
        } else if (Array.isArray(locations) && locations.length > 0) {
          // Try to find by exact code match first (most reliable)
          const locByCode = locations.find(l => {
            if (!l.id || !l.id.includes('-')) return false;
            return (l.code || '').toLowerCase() === searchTerm;
          });
          if (locByCode?.id) {
            bookingLocationId = locByCode.id;
          } else {
            // Fallback: match by name (use exact match or startsWith to avoid false matches)
            const locWithUUID = locations.find(l => {
              if (!l.id || !l.id.includes('-')) return false;
              const name = (l.name || '').toLowerCase();
              return name === searchTerm || name.startsWith(searchTerm + ' '); // Use exact match or starts with to avoid partial matches
            });
            if (locWithUUID?.id) {
              bookingLocationId = locWithUUID.id;
            }
          }
        }
      }
      
      // Strict comparison: booking must match the exact resolved location ID
      const locationMatch = bookingLocationId === resolvedLocationId;
      
      // Check status is confirmed or paid (accept confirmed bookings regardless of payment status)
      // Also accept bookings that are paid even if not explicitly confirmed
      const statusOk = b.status === 'confirmed' || b.paymentStatus === 'paid' || b.status === 'paid';
      
      // Check session matches
      let sessionMatch = false;
      
      // For diving activities, diveSessions might be stored in equipmentNeeded
      // (when created from public website) or as a separate diveSessions field
      let diveSessionsObj = b.diveSessions;
      
      // If diveSessions doesn't exist but equipmentNeeded is an object (not array), 
      // it might contain the dive sessions data
      if (!diveSessionsObj && b.activityType === 'diving' && b.equipmentNeeded && typeof b.equipmentNeeded === 'object' && !Array.isArray(b.equipmentNeeded)) {
        // Check if equipmentNeeded contains dive session keys
        if ('morning' in b.equipmentNeeded || 'afternoon' in b.equipmentNeeded || 'night' in b.equipmentNeeded || 'tenFifteen' in b.equipmentNeeded || '10:15' in b.equipmentNeeded) {
          diveSessionsObj = b.equipmentNeeded;
        }
      }
      
      // Handle case where diveSessions is stored as a JSON string
      if (typeof diveSessionsObj === 'string') {
        try {
          diveSessionsObj = JSON.parse(diveSessionsObj);
        } catch (e) {
          diveSessionsObj = null;
        }
      }
      
      if (diveSessionsObj && typeof diveSessionsObj === 'object') {
        // Handle 10:15 as a special session (might be stored as 'tenFifteen' or '10:15')
        if (session === '10:15') {
          sessionMatch = diveSessionsObj.tenFifteen === true || diveSessionsObj['10:15'] === true;
        } else {
          // Check if the session key exists and is true
          // Also handle case where diveSessions[session] might be truthy but not exactly true
          const sessionValue = diveSessionsObj[session];
          sessionMatch = sessionValue === true || sessionValue === 1 || sessionValue === 'true';
        }
      } else if (!diveSessionsObj && b.numberOfDives && b.activityType === 'diving') {
        // Fallback: if diveSessions doesn't exist but numberOfDives does for diving activity, 
        // treat as morning session for backward compatibility
        sessionMatch = session === 'morning';
      } else if (b.activityType !== 'diving') {
        // For non-diving activities, always match (they don't have sessions)
        sessionMatch = true;
      }
      
      const passes = dateMatch && locationMatch && statusOk && sessionMatch;
      
      return passes;
    });
    
    
    return filtered;
  }, [date, session, resolvedLocationId, locations, bookings]);

  // Helper function to normalize activity type
  const normalizeActivityType = (activityType) => {
    if (!activityType) return null;
    const normalized = String(activityType).toLowerCase().trim();
    if (normalized === 'discover' || normalized === 'discovery') return 'discovery';
    if (normalized === 'try-dive') return 'try_dive';
    return normalized;
  };

  // Filter bookings for boat prep (exclude discovery/try_dive which are shore dives)
  const boatPrepBookings = useMemo(() => {
    return bookingsForDate.filter(b => {
      const activityType = normalizeActivityType(b.activityType || b.activity_type);
      // Only include boat dive activities: 'diving', 'snorkeling', 'specialty'
      // Exclude shore dive activities: 'discovery', 'try_dive'
      return activityType === 'diving' || activityType === 'snorkeling' || activityType === 'specialty';
    });
  }, [bookingsForDate]);

  // Determine if we should use boat or shore dive prep based on activity types and sessions
  // Discovery and orientation are always shore dives, even at locations with boats
  // Morning and afternoon sessions require boats (unless all bookings are discovery/orientation)
  const shouldUseBoatPrep = useMemo(() => {
    // Night sessions are always shore dives (at Mole)
    if (session === 'night') {
      return false;
    }
    
    // If no bookings found, default based on whether location has boats
    if (bookingsForDate.length === 0) {
      // If location has boats, default to boat prep
      // If no boats, default to shore dive prep
      return hasBoats;
    }
    
    // Use boat prep if there are any boat dive bookings
    return boatPrepBookings.length > 0;
  }, [hasBoats, boatPrepBookings.length, session]);

  // Get customers who have bookings for the selected date and session
  // When using boat prep, exclude discovery/try_dive bookings (they're shore dives)
  const customersWithBookings = useMemo(() => {
    // Use filtered bookings for boat prep, all bookings for shore dive prep
    const filteredBookings = shouldUseBoatPrep ? boatPrepBookings : bookingsForDate;
    const customerIds = new Set(filteredBookings.map(b => b.customerId || b.customer_id));
    const customers = allCustomers.filter(c => customerIds.has(c.id));
    return customers;
  }, [bookingsForDate, boatPrepBookings, allCustomers, shouldUseBoatPrep]);

  // Initialize boat assignments from Schedule (bookings with boatId set)
  // NOTE: This must come after bookingsForDate and shouldUseBoatPrep are declared
  useEffect(() => {
    if (!shouldUseBoatPrep || !bookingsForDate.length) {
      setBoatAssignments({});
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);

    // Group bookings by boatId
    const assignments = {};
    bookingsForDate.forEach(booking => {
      const bookingBoatId = booking.boatId || booking.boat_id;
      const customerId = booking.customerId || booking.customer_id;
      
      if (bookingBoatId && customerId) {
        if (!assignments[bookingBoatId]) {
          assignments[bookingBoatId] = [];
        }
        if (!assignments[bookingBoatId].includes(customerId)) {
          assignments[bookingBoatId].push(customerId);
        }
      }
    });

    setBoatAssignments(assignments);
    // Set flag to false after state update completes
    setTimeout(() => setIsInitializing(false), 0);
  }, [bookingsForDate, shouldUseBoatPrep, date, session]);

  // Update bookings when boatAssignments change (to persist overrides from Boat Prep)
  // Skip updates during initialization to avoid unnecessary API calls
  // NOTE: This must come after bookingsForDate and shouldUseBoatPrep are declared
  useEffect(() => {
    if (isInitializing || !shouldUseBoatPrep || !bookingsForDate.length || !boatAssignments) return;

    // Track if we need to update any bookings
    const updates = [];

    // Build a map of current assignments: customerId -> boatId
    const currentAssignments = {};
    Object.keys(boatAssignments).forEach(boatId => {
      (boatAssignments[boatId] || []).forEach(customerId => {
        currentAssignments[customerId] = boatId;
      });
    });

    // Check each booking and update if boatId changed
    bookingsForDate.forEach(booking => {
      const bookingBoatId = booking.boatId || booking.boat_id;
      const customerId = booking.customerId || booking.customer_id;
      const expectedBoatId = currentAssignments[customerId] || null;

      // If the booking's boatId doesn't match the current assignment, update it
      if (bookingBoatId !== expectedBoatId) {
        updates.push({
          bookingId: booking.id,
          boatId: expectedBoatId
        });
      }
    });

    // Apply updates (debounce to avoid too many API calls)
    if (updates.length > 0) {
      const timeoutId = setTimeout(async () => {
        try {
          // Phase 6.17 (roadmap): `session` is now a real bookings column
          // too (Schedule.jsx reads it to tell apart multiple same-day boat
          // trips) - keep it in sync with whichever BoatPrep session this
          // assignment was made under, same as `boatId`.
          await Promise.all(updates.map(({ bookingId, boatId }) =>
            dataService.update('bookings', bookingId, { boatId, session: boatId ? session : null })
          ));
        } catch (error) {
          console.error('[BoatPrep] Error updating bookings with boat assignments:', error);
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [boatAssignments, bookingsForDate, shouldUseBoatPrep, isInitializing]);
  
  // Filter customers by search, but only show those with bookings
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithBookings;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [customersWithBookings, searchQuery]);
  
  // Get unassigned divers
  const assignedIds = useMemo(() => {
    if (shouldUseBoatPrep) {
      return new Set(Object.values(boatAssignments).flat());
    } else {
      return new Set(shoreDiveAssignments);
    }
  }, [boatAssignments, shoreDiveAssignments, shouldUseBoatPrep]);
  
  const unassignedCustomers = useMemo(() => {
    return filteredCustomers.filter(c => !assignedIds.has(c.id));
  }, [filteredCustomers, assignedIds]);
  
  // Get all assigned customers across all boats (or shore dive group) for dive site suggestions
  const allAssignedCustomers = useMemo(() => {
    if (shouldUseBoatPrep) {
      const assigned = Object.values(boatAssignments).flat().map(id => 
        allCustomers.find(c => c.id === id)
      ).filter(Boolean);
      return assigned;
    } else {
      return shoreDiveCustomers;
    }
  }, [boatAssignments, shoreDiveCustomers, shouldUseBoatPrep, allCustomers]);
  
  // Per-boat dive site assignments: { boatId: diveSiteId }
  const [boatDiveSites, setBoatDiveSites] = useState({});
  // Per-boat dive site validation status: { boatId: { confirmed: boolean, completed: boolean } }
  const [boatDiveSiteStatus, setBoatDiveSiteStatus] = useState({});
  // Per-boat actual dive site (post-dive report): { boatId: actualDiveSiteId }
  const [boatActualDiveSites, setBoatActualDiveSites] = useState({});
  // Post-dive report notes: { boatId: notes }
  const [boatPostDiveNotes, setBoatPostDiveNotesState] = useState({});
  const [allocateRental, setAllocateRental] = useState(true);
  const [showAllBoats, setShowAllBoats] = useState(false);
  
  // Get dive site suggestions for a specific boat based on its divers
  const getBoatDiveSiteSuggestions = (boatId) => {
    const boatCustomers = getBoatCustomers(boatId);
    return suggestDiveSites(resolvedLocationId, boatCustomers, diveSites, bookings);
  };
  
  const setBoatDiveSite = (boatId, diveSiteId) => {
    setBoatDiveSites(prev => ({
      ...prev,
      [boatId]: diveSiteId
    }));
  };
  
  const getBoatDiveSite = (boatId) => {
    return boatDiveSites[boatId] || '';
  };

  const getBoatDiveSiteStatus = (boatId) => {
    return boatDiveSiteStatus[boatId] || { confirmed: false, completed: false };
  };

  const setBoatDiveSiteStatusValue = (boatId, status) => {
    setBoatDiveSiteStatus(prev => {
      const newStatus = {
      ...prev,
      [boatId]: { ...prev[boatId], ...status }
      };
      
      // When marking as completed, initialize actual dive site to planned dive site if not already set
      if (status.completed) {
        setBoatActualDiveSites(prevActual => {
          if (!prevActual[boatId]) {
            const plannedSiteId = boatDiveSites[boatId] || '';
            if (plannedSiteId) {
              return {
                ...prevActual,
                [boatId]: plannedSiteId
              };
            }
          }
          return prevActual;
        });
      }
      
      return newStatus;
    });
  };

  const setBoatActualDiveSite = (boatId, actualDiveSiteId) => {
    setBoatActualDiveSites(prev => ({
      ...prev,
      [boatId]: actualDiveSiteId
    }));
  };

  const getBoatActualDiveSite = (boatId) => {
    return boatActualDiveSites[boatId] || getBoatDiveSite(boatId) || '';
  };

  const setBoatPostDiveNotes = (boatId, notes) => {
    setBoatPostDiveNotesState(prev => ({
      ...prev,
      [boatId]: notes
    }));
  };

  const getBoatPostDiveNotes = (boatId) => {
    return boatPostDiveNotes[boatId] || '';
  };

  // Calculate how many boats are needed based on total divers
  const calculateBoatsNeeded = useMemo(() => {
    const totalDivers = customersWithBookings.length;
    if (totalDivers === 0) return 0;
    
    // Calculate total capacity needed (accounting for staff)
    // We'll use average staff per boat: 1 captain + 1 guide = 2 staff
    // So available capacity per boat = boat.capacity - 2
    const avgStaffPerBoat = 2;
    const avgDiverCapacityPerBoat = boats.length > 0 
      ? Math.max(1, boats[0].capacity - avgStaffPerBoat) 
      : 8; // Default if no boats
    
    // Calculate minimum boats needed
    const boatsNeeded = Math.ceil(totalDivers / avgDiverCapacityPerBoat);
    
    // Also consider already assigned divers - we need at least enough boats for current assignments
    const assignedDiversCount = Object.values(boatAssignments).flat().length;
    const boatsWithAssignments = Object.keys(boatAssignments).filter(
      boatId => (boatAssignments[boatId] || []).length > 0
    ).length;
    
    // Return max of calculated need and boats with assignments (but at least 1 if there are divers)
    return Math.max(
      boatsNeeded,
      boatsWithAssignments || (assignedDiversCount > 0 ? 1 : 0),
      assignedDiversCount > 0 ? 1 : 0
    );
  }, [customersWithBookings.length, boats, boatAssignments]);

  // Get only the boats we need to display
  const boatsToDisplay = useMemo(() => {
    // If user wants to see all boats, show them all
    if (showAllBoats) {
      return boats;
    }
    
    const boatsNeeded = calculateBoatsNeeded;
    const boatsWithDivers = boats.filter(boat => {
      const assigned = boatAssignments[boat.id] || [];
      return assigned.length > 0;
    });
    
    // If we have boats with divers assigned, show those + any additional needed
    // Otherwise, show just the minimum needed
    if (boatsWithDivers.length > 0) {
      // Show boats with divers + empty boats up to the needed count
      const displayedIds = new Set(boatsWithDivers.map(b => b.id));
      let count = boatsWithDivers.length;
      
      for (const boat of boats) {
        if (count >= boatsNeeded) break;
        if (!displayedIds.has(boat.id)) {
          displayedIds.add(boat.id);
          count++;
        }
      }
      
      return boats.filter(b => displayedIds.has(b.id));
    } else {
      // No divers assigned yet - show minimum needed (at least 1)
      return boats.slice(0, Math.max(1, boatsNeeded));
    }
  }, [boats, calculateBoatsNeeded, boatAssignments, showAllBoats]);

  const assignDiverToBoat = (customerId, boatId) => {
    // If assigning to a boat and we're not showing all boats, check if we need to show it
    if (boatId && !showAllBoats) {
      // Check if this boat would be in the displayed set
      // If not, automatically show all boats
      const boatExists = boats.find(b => b.id === boatId);
      if (boatExists) {
        // Calculate if this boat would be displayed
        const boatsWithDivers = boats.filter(boat => {
          const assigned = boatAssignments[boat.id] || [];
          return assigned.length > 0;
        });
        const boatsNeeded = calculateBoatsNeeded;
        
        // If boat has divers or we need more boats, it will be shown
        // Otherwise, if we're assigning to a boat that wouldn't be shown, show all
        const wouldBeShown = boatsWithDivers.some(b => b.id === boatId) || 
                             boats.slice(0, Math.max(1, boatsNeeded)).some(b => b.id === boatId);
        
        if (!wouldBeShown) {
          setShowAllBoats(true);
        }
      }
    }
    
    setBoatAssignments(prev => {
      const newAssignments = { ...prev };
      // Remove from any existing boat
      Object.keys(newAssignments).forEach(bId => {
        newAssignments[bId] = newAssignments[bId].filter(id => id !== customerId);
      });
      // Add to new boat
      if (boatId) {
        if (!newAssignments[boatId]) newAssignments[boatId] = [];
        if (!newAssignments[boatId].includes(customerId)) {
          newAssignments[boatId].push(customerId);
        }
      }
      return newAssignments;
    });
  };

  const removeDiverFromBoat = (customerId, boatId) => {
    setBoatAssignments(prev => ({
      ...prev,
      [boatId]: (prev[boatId] || []).filter(id => id !== customerId)
    }));
  };

  const autoAssignDivers = () => {
    const assignments = {};
    // Use customersWithBookings instead of unassignedCustomers to respect booking filter
    const availableCustomers = customersWithBookings.filter(c => !assignedIds.has(c.id));
    const unassigned = [...availableCustomers];
    
    if (unassigned.length === 0) return;
    
    // Calculate available capacity for each boat (accounting for staff)
    const getAvailableCapacity = (boatId) => {
      const boat = boats.find(b => b.id === boatId);
      if (!boat) return 0;
      const boatStaff = staffAssignments[boatId] || { captain: null, guides: [], trainees: [] };
      const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
      return boat.capacity - staffCount;
    };
    
    // Initialize assignments
    boats.forEach(boat => {
      assignments[boat.id] = [];
    });
    
    // Check if all divers can fit on a single boat
    const totalDivers = unassigned.length;
    let singleBoatFound = false;
    
    for (const boat of boats) {
      const availableCapacity = getAvailableCapacity(boat.id);
      if (availableCapacity >= totalDivers) {
        // All divers can fit on this boat - assign them all here
        assignments[boat.id] = unassigned.map(d => d.id);
        singleBoatFound = true;
        break;
      }
    }
    
    // If they don't all fit on one boat, distribute by skill level
    if (!singleBoatFound) {
      // Group divers by skill level
      const bySkill = {
        beginner: [],
        intermediate: [],
        advanced: []
      };
      
      unassigned.forEach(diver => {
        const skill = getDiverSkillLevel(diver);
        bySkill[skill].push(diver);
      });
      
      // Assign each skill group to boats, trying to keep same skill together
      ['beginner', 'intermediate', 'advanced'].forEach(skill => {
        bySkill[skill].forEach(diver => {
          // Find a boat with space and ideally same skill level divers
          let assigned = false;
          
          // First try: find boat with same skill level divers
          for (let i = 0; i < boats.length; i++) {
            const boat = boats[i];
            const boatCustomers = (assignments[boat.id] || []).map(id => 
              allCustomers.find(c => c.id === id)
            ).filter(Boolean);
            const availableCapacity = getAvailableCapacity(boat.id);
            
            if (boatCustomers.length < availableCapacity) {
              const boatSkills = boatCustomers.map(c => getDiverSkillLevel(c));
              const hasSameSkill = boatSkills.length === 0 || boatSkills.every(s => s === skill);
              
              if (hasSameSkill) {
                assignments[boat.id].push(diver.id);
                assigned = true;
                break;
              }
            }
          }
          
          // Second try: find any boat with space
          if (!assigned) {
            for (let i = 0; i < boats.length; i++) {
              const boat = boats[i];
              const boatCustomers = (assignments[boat.id] || []).map(id => 
                allCustomers.find(c => c.id === id)
              ).filter(Boolean);
              const availableCapacity = getAvailableCapacity(boat.id);
              if (boatCustomers.length < availableCapacity) {
                assignments[boat.id].push(diver.id);
                assigned = true;
                break;
              }
            }
          }
        });
      });
    }
    
    // Merge with existing assignments
    setBoatAssignments(prev => {
      const merged = { ...prev };
      Object.keys(assignments).forEach(boatId => {
        if (!merged[boatId]) merged[boatId] = [];
        assignments[boatId].forEach(diverId => {
          if (!merged[boatId].includes(diverId)) {
            merged[boatId].push(diverId);
          }
        });
      });
      return merged;
    });
  };

  const clearAllAssignments = () => {
    if (window.confirm('Clear all boat assignments?')) {
      setBoatAssignments({});
    }
  };

  const getBoatCustomers = (boatId) => {
    const ids = boatAssignments[boatId] || [];
    return ids.map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
  };

  const getBoatStaff = (boatId) => {
    return staffAssignments[boatId] || { captain: null, guides: [], trainees: [] };
  };

  const setBoatStaff = (boatId, staff) => {
    setStaffAssignments(prev => ({
      ...prev,
      [boatId]: staff
    }));
  };

  const getStaffByRole = (role) => {
    return allStaff.filter(s => s.role === role);
  };

  // Get which boat a staff member is assigned to (if any)
  const getStaffAssignedBoat = (staffId) => {
    for (const [boatId, staff] of Object.entries(staffAssignments)) {
      if (staff.captain === staffId) return boatId;
      if (staff.guides?.includes(staffId)) return boatId;
      if (staff.trainees?.includes(staffId)) return boatId;
    }
    return null;
  };

  // Staff works at a location if locationIds is empty (all) or includes the location
  const staffWorksAtLocation = (staff, locationId) => {
    if (!locationId) return true;
    const ids = staff.locationIds || staff.location_ids;
    if (ids && Array.isArray(ids)) {
      if (ids.length === 0) return true; // Empty = all locations
      return ids.includes(locationId);
    }
    // Backward compat: staff with only locationId works at that location only
    const singleId = staff.locationId || staff.location_id;
    return !singleId || singleId === locationId;
  };

  // Get available staff for a boat (filter out already assigned, filter by location)
  // boatId can be null for shore dives
  const getAvailableStaffForBoat = (boatId, role) => {
    const allRoleStaff = getStaffByRole(role);
    const locationId = boatId === null ? resolvedLocationId : boats.find(b => b.id === boatId)?.locationId;
    return allRoleStaff.filter(staff => {
      if (!staffWorksAtLocation(staff, locationId)) return false;
      if (boatId === null) {
        const assignedBoat = getStaffAssignedBoat(staff.id);
        const isInShoreDive = (shoreDiveStaff.guides?.includes(staff.id) ||
                               shoreDiveStaff.trainees?.includes(staff.id));
        return !assignedBoat && !isInShoreDive;
      }
      const assignedBoat = getStaffAssignedBoat(staff.id);
      return !assignedBoat || assignedBoat === boatId;
    });
  };

  const getStaffValidationErrors = (boatId) => {
    const errors = [];
    const staff = getBoatStaff(boatId);
    const diveSiteId = getBoatDiveSite(boatId);
    const needsCaptain = requiresCaptain(diveSiteId, session, diveSites);
    const needsGuide = requiresGuide(session);
    
    if (needsCaptain && !staff.captain) {
      errors.push('Captain required for boat dives');
    }
    
    if (needsGuide && staff.guides.length === 0) {
      errors.push('At least one guide required for morning/afternoon dives');
    }
    
    // Check for staff assigned to multiple boats
    if (staff.captain) {
      const assignedBoat = getStaffAssignedBoat(staff.captain);
      if (assignedBoat && assignedBoat !== boatId) {
        const boat = boats.find(b => b.id === assignedBoat);
        errors.push(`Captain already assigned to ${boat?.name || 'another boat'}`);
      }
    }
    
    staff.guides?.forEach(guideId => {
      const assignedBoat = getStaffAssignedBoat(guideId);
      if (assignedBoat && assignedBoat !== boatId) {
        const boat = boats.find(b => b.id === assignedBoat);
        const guide = allStaff.find(s => s.id === guideId);
        errors.push(`${guide?.name || 'Guide'} already assigned to ${boat?.name || 'another boat'}`);
      }
    });
    
    staff.trainees?.forEach(traineeId => {
      const assignedBoat = getStaffAssignedBoat(traineeId);
      if (assignedBoat && assignedBoat !== boatId) {
        const boat = boats.find(b => b.id === assignedBoat);
        const trainee = allStaff.find(s => s.id === traineeId);
        errors.push(`${trainee?.name || 'Trainee'} already assigned to ${boat?.name || 'another boat'}`);
      }
    });
    
    return errors;
  };

  const handleAllocate = () => {
    const updates = [];
    
    allAssignedCustomers.forEach(c => {
      const wantsRental = !c.preferences?.ownEquipment;
      const tankSize = c.preferences?.tankSize || '12L';
      
      // Refetch available equipment for each diver to get current availability
      const available = dataService.getAvailableEquipment('diving');
      
      // Allocate tank for all divers (required for all dives, regardless of ownEquipment)
      const tanks = available.filter(e => e.type?.toLowerCase() === 'tank');
      const tankMatch = tanks.find(e => {
        const eqSize = (e.size || '').toUpperCase();
        const reqSize = tankSize.toUpperCase();
        return eqSize === reqSize || eqSize.includes(reqSize) || reqSize.includes(eqSize);
      }) || tanks[0]; // Fallback to any available tank if exact match not found
      
      if (tankMatch) {
        dataService.update('equipment', tankMatch.id, { isAvailable: false });
        updates.push(tankMatch);
      }
      
      // Allocate other equipment only if diver needs rental and auto-allocate is enabled
      if (!allocateRental || !wantsRental) return;
      
      const sizeMap = {
        BCD: c.preferences?.bcdSize,
        Fins: c.preferences?.finsSize,
        Boots: c.preferences?.bootsSize,
        Wetsuit: c.preferences?.wetsuitSize
      };
      ['BCD', 'Regulator', 'Mask', 'Fins', 'Boots', 'Wetsuit', 'Computer', 'Torch'].forEach(type => {
        const byType = available.filter(e => e.type?.toLowerCase() === type.toLowerCase());
        const exact = byType.find(e => (e.size || '').toUpperCase() === (sizeMap[type] || '').toUpperCase());
        const match = exact || byType[0];
        if (match) {
          dataService.update('equipment', match.id, { isAvailable: false });
          updates.push(match);
        }
      });
    });
    
    const tankCount = updates.filter(e => e.type?.toLowerCase() === 'tank').length;
    const otherCount = updates.length - tankCount;
    if (tankCount > 0 && otherCount > 0) {
      alert(`Allocated ${tankCount} tank(s) and ${otherCount} other equipment item(s) for ${allAssignedCustomers.length} divers`);
    } else if (tankCount > 0) {
      alert(`Allocated ${tankCount} tank(s) for ${allAssignedCustomers.length} divers`);
    } else {
      alert(`No equipment available to allocate`);
    }
  };

  const savePreparation = async () => {
    if (shouldUseBoatPrep) {
      // Validate only boats with assigned divers have required staff
      // Empty boats don't need staff validation
      const validationErrors = [];
      Object.keys(boatAssignments).forEach(boatId => {
        const diverIds = boatAssignments[boatId] || [];
        // Only validate boats that have divers assigned
        if (diverIds.length > 0) {
        const errors = getStaffValidationErrors(boatId);
        if (errors.length > 0) {
          const boat = boats.find(b => b.id === boatId);
          errors.forEach(err => validationErrors.push(`${boat?.name || 'Boat'}: ${err}`));
          }
        }
      });
      
      if (validationErrors.length > 0) {
        alert('Please fix the following issues:\n\n' + validationErrors.join('\n'));
        return;
      }
      
      // Validate dive sites are selected (but not confirmed - confirmation happens in post-dive)
      const diveSiteValidationErrors = [];
      Object.keys(boatAssignments).forEach(boatId => {
        const diverIds = boatAssignments[boatId] || [];
        if (diverIds.length > 0) {
          const diveSiteId = getBoatDiveSite(boatId);
          
          if (!diveSiteId) {
            const boat = boats.find(b => b.id === boatId);
            diveSiteValidationErrors.push(`${boat?.name || 'Boat'}: Dive site not selected`);
          }
        }
      });
      
      if (diveSiteValidationErrors.length > 0) {
        alert('Please select dive sites for all boats with assigned divers:\n\n' + diveSiteValidationErrors.join('\n'));
          return;
      }
      
      // Collect all payloads first
      const prepPayloads = [];
      Object.keys(boatAssignments).forEach(boatId => {
        const diverIds = boatAssignments[boatId] || [];
        if (diverIds.length > 0) {
          const staff = getBoatStaff(boatId);
          const diveSiteId = getBoatDiveSite(boatId);
          const actualDiveSiteId = getBoatActualDiveSite(boatId);
          const siteStatus = getBoatDiveSiteStatus(boatId);
          const postDiveNotes = getBoatPostDiveNotes(boatId);
          const payload = {
            date,
            session,
            boatId,
            diverIds,
            locationId: resolvedLocationId, // Save resolved UUID locationId with the prep
            diveSiteId: diveSiteId, // Planned dive site
            actualDiveSiteId: actualDiveSiteId || diveSiteId, // Actual dive site (from post-dive report)
            diveSiteStatus: {
              confirmed: siteStatus.confirmed,
              completed: siteStatus.completed,
              confirmedAt: siteStatus.confirmed ? new Date().toISOString() : null,
              completedAt: siteStatus.completed ? new Date().toISOString() : null
            },
            postDiveReport: siteStatus.completed ? {
              actualDiveSiteId: actualDiveSiteId || diveSiteId,
              notes: postDiveNotes,
              reportDate: new Date().toISOString()
            } : null,
            staff: {
              captain: staff.captain,
              guides: staff.guides,
              trainees: staff.trainees
            },
            createdAt: new Date().toISOString()
          };
          prepPayloads.push(payload);
        }
      });
      
      // Save all preps in parallel
      await Promise.all(prepPayloads.map(payload => dataService.create('boatPreps', payload)));
      
      // Reload boat preps after saving
      const updatedPreps = await dataService.getAll('boatPreps');
      const prepsArray = Array.isArray(updatedPreps) ? updatedPreps : [];
      setBoatPreps(prepsArray);
      
      // Set reportDate to match the saved date so it shows in post-dive immediately
      setReportDate(date);
      
      alert('Boat preparation saved for all boats.');
    } else {
      // Shore dive preparation
      const errors = [];
      const needsGuide = requiresGuide(session);
      if (needsGuide && shoreDiveStaff.guides.length === 0) {
        errors.push('At least one guide required for morning/afternoon dives');
      }
      if (shoreDiveAssignments.length === 0) {
        errors.push('No divers assigned');
      }
      
      if (errors.length > 0) {
        alert('Please fix the following issues:\n\n' + errors.join('\n'));
        return;
      }
      
      const payload = {
        date,
        session,
        boatId: null, // No boat for shore dives
        diverIds: shoreDiveAssignments,
        locationId: resolvedLocationId, // Save resolved UUID locationId with the prep
        diveSiteId: shoreDiveSiteId,
        actualDiveSiteId: shoreDiveSiteId, // For shore dives, actual = planned (can be updated later if needed)
        staff: {
          captain: null, // No captain for shore dives
          guides: shoreDiveStaff.guides,
          trainees: shoreDiveStaff.trainees
        },
        locationId: resolvedLocationId, // Store resolved UUID locationId for filtering
        createdAt: new Date().toISOString()
      };
      await dataService.create('boatPreps', payload);
      
      // Reload boat preps after saving
      const updatedPreps = await dataService.getAll('boatPreps');
      const prepsArray = Array.isArray(updatedPreps) ? updatedPreps : [];
      setBoatPreps(prepsArray);
      
      // Set reportDate to match the saved date so it shows in post-dive immediately
      setReportDate(date);
      
      alert('Shore dive preparation saved.');
    }
  };

  const renderDiverItem = (customer, showRemove = false, boatId = null) => {
    const skill = getDiverSkillLevel(customer);
    const own = customer.preferences?.ownEquipment;
    const sizes = customer.preferences || {};
    const tankSize = sizes.tankSize || '12L';
    const equipmentText = own ? 'Own equipment' : `Rental (BCD ${sizes.bcdSize || '-'}, Fins ${sizes.finsSize || '-'}, Boots ${sizes.bootsSize || '-'}, Wetsuit ${sizes.wetsuitSize || '-'})`;
    const rest = `${skill} · Tank: ${tankSize} · ${equipmentText}`;
    
    return (
      <ListItem 
        key={customer.id}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 0.5,
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <ListItemText 
          primary={
            <Box component="span">
              <Box component="span" sx={{ fontWeight: 600 }}>
                {customer.firstName} {customer.lastName}
              </Box>
              <Box component="span"> — {rest}</Box>
            </Box>
          }
        />
        {showRemove && boatId && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              removeDiverFromBoat(customer.id, boatId);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </ListItem>
    );
  };

  const allDiveSites = useMemo(() => 
    diveSites.filter(s => s.locationId === resolvedLocationId), 
    [diveSites, resolvedLocationId]
  );

  // Get prepared dives for post-dive reports (includes both completed and not-yet-completed)
  const postDivePreparations = useMemo(() => {
    const allPreps = boatPreps;
    
    const filtered = allPreps.filter(prep => {
      const prepDate = prep.date?.split('T')[0] || prep.date;
      const selectedReportDate = reportDate?.split('T')[0] || reportDate;
      // Handle both camelCase and snake_case for locationId
      const prepLocationId = prep.locationId || prep.location_id;
      // If locationId is missing, allow it (for backwards compatibility with old preps)
      const locationMatch = prepLocationId === resolvedLocationId || !prepLocationId;
      const dateMatch = prepDate === selectedReportDate;
      // Show all prepared dives (have a diveSiteId), not just completed ones
      // Handle both camelCase and snake_case
      const hasDiveSite = !!(prep.diveSiteId || prep.dive_site_id);
      
      const passes = locationMatch && dateMatch && hasDiveSite;
      
      return passes;
    });
    
    return filtered;
  }, [reportDate, resolvedLocationId, boatPreps]);

  // State for editing post-dive reports
  const [editingReports, setEditingReports] = useState({});

  const updatePostDiveReport = (prepId, field, value) => {
    setEditingReports(prev => ({
      ...prev,
      [prepId]: {
        ...prev[prepId],
        [field]: value
      }
    }));
  };

  const updatePostDiveTimestamp = (prepId, type, value) => {
    setEditingReports(prev => ({
      ...prev,
      [prepId]: {
        ...prev[prepId],
        timestamps: {
          ...prev[prepId]?.timestamps,
          [type]: value
        }
      }
    }));
  };

  const deleteBoatPrep = async (prepId) => {
    if (!window.confirm('Are you sure you want to delete this boat preparation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await dataService.remove('boatPreps', prepId);
      // Reload boat preps after deletion
      const updatedPreps = await dataService.getAll('boatPreps');
      setBoatPreps(Array.isArray(updatedPreps) ? updatedPreps : []);
      alert('Boat preparation deleted successfully.');
    } catch (error) {
      console.error('Error deleting boat prep:', error);
      alert('Error deleting boat preparation. Please try again.');
    }
  };

  const savePostDiveReport = async (prepId, markCompleted = false) => {
    const prep = postDivePreparations.find(p => p.id === prepId);
    if (!prep) {
      alert('Error: Could not find preparation to update.');
      return;
    }
    
    const edits = editingReports[prepId] || {};
    const updatedPrep = {
      ...prep,
      actualDiveSiteId: edits.actualDiveSiteId !== undefined ? edits.actualDiveSiteId : (prep.actualDiveSiteId || prep.diveSiteId),
      diveSiteStatus: {
        ...prep.diveSiteStatus,
        confirmed: true, // Confirm when saving post-dive report
        completed: markCompleted || prep.diveSiteStatus?.completed || false,
        confirmedAt: prep.diveSiteStatus?.confirmedAt || new Date().toISOString(),
        completedAt: markCompleted ? new Date().toISOString() : (prep.diveSiteStatus?.completedAt || null)
      },
      postDiveReport: {
        actualDiveSiteId: edits.actualDiveSiteId !== undefined ? edits.actualDiveSiteId : (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId),
        notes: edits.notes !== undefined ? edits.notes : (prep.postDiveReport?.notes || ''),
        entryTime: edits.timestamps?.entryTime || prep.postDiveReport?.entryTime || null,
        exitTime: edits.timestamps?.exitTime || prep.postDiveReport?.exitTime || null,
        reportDate: new Date().toISOString()
      }
    };
    
    try {
      await dataService.update('boatPreps', prepId, updatedPrep);
      
      // Reload boat preps after updating
      const updatedPreps = await dataService.getAll('boatPreps');
      setBoatPreps(Array.isArray(updatedPreps) ? updatedPreps : []);
      
      setEditingReports(prev => {
        const newState = { ...prev };
        delete newState[prepId];
        return newState;
      });
      
      alert(markCompleted ? 'Dive confirmed and marked as completed.' : 'Post-dive report saved successfully.');
    } catch (error) {
      console.error('Error saving post-dive report:', error);
      alert('Error saving post-dive report. Please try again.');
    }
  };

  const exportComplianceReport = (completedPreps) => {
    // Prepare CSV data
    let csvContent = 'Date,Session,Boat/Dive Type,Dive Site,Entry Time,Exit Time,Total Divers,Male Divers,Female Divers,Unspecified Gender,Total Guides,Captain,Notes\n';
    
    completedPreps.forEach(prep => {
      const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
      const actualSite = allDiveSites.find(s => s.id === (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId));
      const divers = (prep.diverIds || []).map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
      const guides = (prep.guideIds || []).map(id => allStaff.find(s => s.id === id)).filter(Boolean);
      const captain = prep.captainId ? allStaff.find(s => s.id === prep.captainId) : null;
      
      const diversByGender = {
        male: divers.filter(d => d.gender === 'male').length,
        female: divers.filter(d => d.gender === 'female').length,
        unspecified: divers.filter(d => !d.gender || (d.gender !== 'male' && d.gender !== 'female')).length
      };

      const boatName = boat ? boat.name : 'Shore Dive';
      const diveSite = actualSite?.name || 'Unknown';
      const entryTime = prep.postDiveReport?.entryTime || '';
      const exitTime = prep.postDiveReport?.exitTime || '';
      const captainName = captain ? (captain.name || captain.firstName + ' ' + captain.lastName) : '';
      const notes = (prep.postDiveReport?.notes || '').replace(/"/g, '""'); // Escape quotes
      
      csvContent += `"${prep.date}","${prep.session}","${boatName}","${diveSite}","${entryTime}","${exitTime}",${divers.length},${diversByGender.male},${diversByGender.female},${diversByGender.unspecified},${guides.length},"${captainName}","${notes}"\n`;
    });

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compliance_report_${reportDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportComplianceReportPDF = (completedPreps) => {
    // Create a formatted HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Compliance Report - ${reportDate || 'All'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
          h2 { color: #424242; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1976d2; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { background-color: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .dive-details { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Dive Compliance Report - Spanish Regulations</h1>
        <div class="summary">
          <p><strong>Report Date:</strong> ${reportDate || 'All Dates'}</p>
          <p><strong>Total Completed Dives:</strong> ${completedPreps.length}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
    `;

    completedPreps.forEach((prep, index) => {
      const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
      const actualSite = allDiveSites.find(s => s.id === (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId));
      const divers = (prep.diverIds || []).map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
      const guides = (prep.guideIds || []).map(id => allStaff.find(s => s.id === id)).filter(Boolean);
      const captain = prep.captainId ? allStaff.find(s => s.id === prep.captainId) : null;
      
      const diversByGender = {
        male: divers.filter(d => d.gender === 'male').length,
        female: divers.filter(d => d.gender === 'female').length,
        unspecified: divers.filter(d => !d.gender || (d.gender !== 'male' && d.gender !== 'female')).length
      };

      const boatName = boat ? boat.name : 'Shore Dive';
      const diveSite = actualSite?.name || 'Unknown';
      const entryTime = prep.postDiveReport?.entryTime || 'N/A';
      const exitTime = prep.postDiveReport?.exitTime || 'N/A';
      const captainName = captain ? (captain.name || captain.firstName + ' ' + captain.lastName) : 'N/A';
      const notes = prep.postDiveReport?.notes || 'None';

      htmlContent += `
        <div class="dive-details">
          <h2>Dive ${index + 1}: ${boatName} - ${prep.session}</h2>
          <table>
            <tr><th>Date</th><td>${prep.date}</td></tr>
            <tr><th>Session</th><td>${prep.session}</td></tr>
            <tr><th>Boat/Dive Type</th><td>${boatName}</td></tr>
            <tr><th>Dive Site</th><td>${diveSite}</td></tr>
            <tr><th>Entry Time</th><td>${entryTime}</td></tr>
            <tr><th>Exit Time</th><td>${exitTime}</td></tr>
            <tr><th>Total Divers</th><td>${divers.length}</td></tr>
            <tr><th>Male Divers</th><td>${diversByGender.male}</td></tr>
            <tr><th>Female Divers</th><td>${diversByGender.female}</td></tr>
            <tr><th>Unspecified Gender</th><td>${diversByGender.unspecified}</td></tr>
            <tr><th>Total Guides</th><td>${guides.length}</td></tr>
            <tr><th>Captain</th><td>${captainName}</td></tr>
            <tr><th>Notes</th><td>${notes}</td></tr>
          </table>
          
          ${divers.length > 0 ? `
            <h3>Divers List</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Certification</th>
                  <th>Nationality</th>
                </tr>
              </thead>
              <tbody>
                ${divers.map(diver => {
                  const highestCert = diver?.certifications && diver.certifications.length > 0
                    ? `${diver.certifications[0].agency || ''} ${diver.certifications[0].level || ''}`.trim()
                    : 'No certification';
                  return `
                    <tr>
                      <td>${diver.firstName} ${diver.lastName}</td>
                      <td>${diver.gender ? (diver.gender.charAt(0).toUpperCase() + diver.gender.slice(1)) : 'Not specified'}</td>
                      <td>${highestCert}</td>
                      <td>${diver.nationality || '-'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${guides.length > 0 ? `
            <h3>Guides</h3>
            <ul>
              ${guides.map(g => `<li>${g.name || g.firstName + ' ' + g.lastName} - ${g.role || 'Guide'}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    });

    htmlContent += `
        <div class="footer">
          <p>This report is generated for compliance with Spanish diving regulations (RD 933/2021 and Marine Reserve reporting requirements).</p>
          <p>Generated by DCMS - Dive Center Management System</p>
        </div>
      </body>
      </html>
    `;

    // Create a blob and open in new window for printing/saving as PDF
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    // Wait for window to load, then trigger print dialog
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  };

  // Check if compliance reports are enabled for current location
  const isComplianceReportsEnabled = useMemo(() => {
    if (!currentLocation || !currentLocation.settings) return false;
    return currentLocation.settings.complianceReportsMandatory === true;
  }, [currentLocation]);

  // Reset activeTab if compliance reports gets disabled while on tab 2
  useEffect(() => {
    if (!isComplianceReportsEnabled && activeTab === 2) {
      setActiveTab(0);
    }
  }, [isComplianceReportsEnabled, activeTab]);

return {
    getDiverSkillLevel, allowedDifficultyForGroup, getRecentDiveSiteIdsForCustomers, suggestDiveSites, getSkillCounts, isShoreDive,
    requiresCaptain, requiresGuide, activeStaff, activeTab, allAssignedCustomers, allBoats,
    allCustomers, allDiveSites, allStaff, allocateRental, assignDiverToBoat, assignedIds,
    autoAssignDivers, boatActualDiveSites, boatAssignments, boatDiveSiteStatus, boatDiveSites, boatPostDiveNotes,
    boatPrepBookings, boatPreps, boats, boatsToDisplay, bookings, bookingsForDate,
    calculateBoatsNeeded, clearAllAssignments, currentLocation, customersWithBookings, date, deleteBoatPrep,
    diveSites, editingReports, exportComplianceReport, exportComplianceReportPDF, filteredCustomers, getAvailableStaffForBoat,
    getBoatActualDiveSite, getBoatCustomers, getBoatDiveSite, getBoatDiveSiteStatus, getBoatDiveSiteSuggestions, getBoatPostDiveNotes,
    getBoatStaff, getStaffAssignedBoat, getStaffByRole, getStaffValidationErrors, handleAllocate, hasBoats,
    isComplianceReportsEnabled, isInitializing, locationId, locations, normalizeActivityType, postDivePreparations,
    refreshKey, removeDiverFromBoat, renderDiverItem, reportDate, resolvedLocationId, savePostDiveReport,
    savePreparation, searchQuery, session, setActiveTab, setAllBoats, setAllCustomers,
    setAllStaff, setAllocateRental, setBoatActualDiveSite, setBoatActualDiveSites, setBoatAssignments, setBoatDiveSite,
    setBoatDiveSiteStatus, setBoatDiveSiteStatusValue, setBoatDiveSites, setBoatPostDiveNotes, setBoatPostDiveNotesState, setBoatPreps,
    setBoatStaff, setBookings, setDate, setDiveSites, setEditingReports, setIsInitializing,
    setLocations, setRefreshKey, setReportDate, setSearchQuery, setSession, setShoreDiveAssignments,
    setShoreDiveSiteId, setShoreDiveStaff, setShowAllBoats, setStaffAssignments, shoreDiveAssignments, shoreDiveCustomers,
    shoreDiveGroupId, shoreDiveSiteId, shoreDiveSiteSuggestions, shoreDiveSkillCounts, shoreDiveStaff, shouldUseBoatPrep,
    showAllBoats, staffAssignments, staffWorksAtLocation, storedLocationId, t, unassignedCustomers,
    updatePostDiveReport, updatePostDiveTimestamp,
  };
}
