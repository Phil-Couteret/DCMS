import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Checkbox,
  FormControlLabel,
  Alert,
  IconButton,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format, subDays } from 'date-fns';
import dataService from '../services/dataService';

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

const BoatPrep = () => {
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
  
  const [activeTab, setActiveTab] = useState(0); // 0 = Preparation, 1 = Post-Dive Reports, 2 = Compliance Reports
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

  // Get customers who have bookings for the selected date and session
  const customersWithBookings = useMemo(() => {
    const customerIds = new Set(bookingsForDate.map(b => b.customerId));
    const customers = allCustomers.filter(c => customerIds.has(c.id));
    return customers;
  }, [bookingsForDate, allCustomers]);

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
    
    // For morning and afternoon sessions, check activity types
    // Regular diving activities ('diving', 'snorkeling', 'specialty') require boats
    // Discovery/try_dive activities can be done from shore
    
    // Normalize activityType (handle both camelCase and snake_case, and variations)
    const normalizeActivityType = (activityType) => {
      if (!activityType) return null;
      const normalized = String(activityType).toLowerCase().trim();
      // Handle variations: 'diving', 'discover', 'discovery', 'try_dive', 'try-dive', 'orientation', 'snorkeling', 'specialty'
      // Map 'discover' to 'discovery' to match enum
      if (normalized === 'discover' || normalized === 'discovery') {
        return 'discovery';
      }
      // Map 'try-dive' to 'try_dive'
      if (normalized === 'try-dive') {
        return 'try_dive';
      }
      return normalized;
    };
    
    // Check if ANY booking requires a boat (positive check)
    // Based on backend enum: diving, snorkeling, try_dive, discovery, specialty
    // Boat dives: 'diving', 'snorkeling', 'specialty', or null/undefined (default to boat)
    // Shore dives: 'discovery', 'try_dive' only
    const hasBoatDiveBooking = bookingsForDate.some(b => {
      const activityType = normalizeActivityType(b.activityType || b.activity_type);
      // If activityType is null/undefined, treat as regular diving (requires boat)
      // This is a safe default - if we can't determine the type, assume boat dive
      if (!activityType) {
        return true; // Requires boat if we can't determine
      }
      // Boat dive activities: 'diving', 'snorkeling', 'specialty'
      // Shore dive activities: 'discovery', 'try_dive'
      return activityType === 'diving' || activityType === 'snorkeling' || activityType === 'specialty';
    });
    
    // Use boat prep if ANY booking requires a boat (even if no boats are currently found)
    // This allows the user to see boat prep and potentially add boats if needed
    // Only use shore dive prep if ALL bookings are discovery/try_dive (no boat dives)
    return hasBoatDiveBooking;
  }, [hasBoats, bookingsForDate, session]);
  
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

  // Get available staff for a boat (filter out already assigned)
  // boatId can be null for shore dives
  const getAvailableStaffForBoat = (boatId, role) => {
    const allRoleStaff = getStaffByRole(role);
    return allRoleStaff.filter(staff => {
      // For shore dives (boatId === null), check if staff is assigned to any boat
      if (boatId === null) {
        // For shore dives, check if staff is assigned to any boat (they can't be in both)
        const assignedBoat = getStaffAssignedBoat(staff.id);
        // Also check if assigned to shore dive
        const isInShoreDive = (shoreDiveStaff.guides?.includes(staff.id) || 
                               shoreDiveStaff.trainees?.includes(staff.id));
        return !assignedBoat && !isInShoreDive;
      }
      // For boats, check if assigned to this boat or another
      const assignedBoat = getStaffAssignedBoat(staff.id);
      return !assignedBoat || assignedBoat === boatId; // Include if not assigned or assigned to this boat
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

  const savePreparation = () => {
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
          dataService.create('boatPreps', payload);
        }
      });
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
      dataService.create('boatPreps', payload);
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
      // If locationId is missing, allow it (for backwards compatibility with old preps)
      const locationMatch = prep.locationId === resolvedLocationId || !prep.locationId;
      const dateMatch = prepDate === selectedReportDate;
      // Show all prepared dives (have a diveSiteId), not just completed ones
      const hasDiveSite = !!prep.diveSiteId;
      
      return locationMatch && dateMatch && hasDiveSite;
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

  const savePostDiveReport = (prepId, markCompleted = false) => {
    const prep = postDivePreparations.find(p => p.id === prepId);
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
    dataService.update('boatPreps', prepId, updatedPrep);
    setEditingReports(prev => {
      const newState = { ...prev };
      delete newState[prepId];
      return newState;
    });
    setRefreshKey(prev => prev + 1); // Refresh to update the display
    alert(markCompleted ? 'Dive confirmed and marked as completed.' : 'Post-dive report saved successfully.');
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

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Dive Preparation" />
        <Tab label="Post-Dive Reports" />
        <Tab label="Compliance Reports" />
      </Tabs>

      {activeTab === 0 && (
        <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
              {shouldUseBoatPrep ? 'Boat Preparation' : 'Shore Dive Preparation'}
        </Typography>
            {shouldUseBoatPrep && (
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={autoAssignDivers}>
              Auto-Assign
            </Button>
            <Button variant="outlined" color="error" onClick={clearAllAssignments}>
              Clear All
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Plan Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Session"
                  select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="morning">Morning</MenuItem>
                  {hasBoats && <MenuItem value="10:15">10:15</MenuItem>}
                  <MenuItem value="afternoon">Afternoon</MenuItem>
                  <MenuItem value="night">Night</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {shouldUseBoatPrep ? 'Global Dive Site (optional - can be set per boat)' : 'Dive Site Selection'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {shouldUseBoatPrep 
                    ? 'Select dive sites individually for each boat below'
                    : 'Select dive site for this shore dive session below'
                  }
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Boats Grid or Shore Dive Group */}
        <Grid item xs={12}>
          {shouldUseBoatPrep ? (
            <>
              {boats.length > boatsToDisplay.length && !showAllBoats && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => setShowAllBoats(true)}
                    >
                      Show All {boats.length} Boats
                    </Button>
                  }
                >
                  Showing {boatsToDisplay.length} of {boats.length} boats (based on {customersWithBookings.length} divers)
                </Alert>
              )}
              {showAllBoats && boats.length > calculateBoatsNeeded && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => setShowAllBoats(false)}
                    >
                      Show Only Needed Boats
                    </Button>
                  }
                >
                  Showing all {boats.length} boats (only {calculateBoatsNeeded} needed for {customersWithBookings.length} divers)
                </Alert>
              )}
              <Grid container spacing={2}>
                {boatsToDisplay.map(boat => {
              const boatCustomers = getBoatCustomers(boat.id);
              const staff = getBoatStaff(boat.id);
              const totalCapacity = boat.capacity || 10;
              
              // Calculate staff count (1 captain if assigned + guides + trainees)
              const staffCount = (staff.captain ? 1 : 0) + (staff.guides?.length || 0) + (staff.trainees?.length || 0);
              
              // Available spots for divers = total capacity - staff
              const diverCapacity = totalCapacity - staffCount;
              const diversAssigned = boatCustomers.length;
              const remaining = diverCapacity - diversAssigned;
              const skillCounts = getSkillCounts(boatCustomers);
              const isOverCapacity = diversAssigned > diverCapacity;
              
              return (
                <Grid item xs={12} md={6} key={boat.id}>
                  <Paper 
                    sx={{ 
                      p: 2,
                      border: isOverCapacity ? '2px solid' : '1px solid',
                      borderColor: isOverCapacity ? 'error.main' : 'divider',
                      bgcolor: isOverCapacity ? 'error.light' : 'background.paper'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6">{boat.name}</Typography>
                      <Chip 
                        label={`${diversAssigned}/${diverCapacity} divers`}
                        color={isOverCapacity ? 'error' : diversAssigned === diverCapacity ? 'warning' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Total capacity: {totalCapacity} | Staff: {staffCount} | Available for divers: {diverCapacity}
                    </Typography>
                    
                    {isOverCapacity && (
                      <Alert severity="error" sx={{ mb: 1 }}>Over capacity! {diversAssigned - diverCapacity} too many divers</Alert>
                    )}
                    
                    {/* Staff Assignment - Step 1 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      1. Assign Staff
                    </Typography>
                    {(() => {
                      const staff = getBoatStaff(boat.id);
                      const errors = getStaffValidationErrors(boat.id);
                      const diveSiteId = getBoatDiveSite(boat.id);
                      const needsCaptain = requiresCaptain(diveSiteId, session, diveSites);
                      const needsGuide = requiresGuide(session);
                      // Map to staff_role enum values: boat_captain, instructor, divemaster, assistant, intern, etc.
                      const captains = getAvailableStaffForBoat(boat.id, 'boat_captain');
                      // Guides can be divemaster, instructor, or assistant
                      const guides = getAvailableStaffForBoat(boat.id, 'divemaster')
                        .concat(getAvailableStaffForBoat(boat.id, 'instructor'))
                        .concat(getAvailableStaffForBoat(boat.id, 'assistant'));
                      const trainees = getAvailableStaffForBoat(boat.id, 'intern');
                      
                      // Get currently assigned staff on other boats for display
                      const getAssignedBoatName = (staffId) => {
                        const assignedBoat = getStaffAssignedBoat(staffId);
                        if (assignedBoat && assignedBoat !== boat.id) {
                          const otherBoat = boats.find(b => b.id === assignedBoat);
                          return otherBoat?.name;
                        }
                        return null;
                      };
                      
                      return (
                        <Box sx={{ mb: 2 }}>
                          {needsCaptain && (
                            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                              <InputLabel>Captain *</InputLabel>
                              <Select
                                value={staff.captain || ''}
                                label="Captain *"
                                onChange={(e) => {
                                  const newCaptain = e.target.value;
                                  // If changing captain, clear from previous boat
                                  if (staff.captain && staff.captain !== newCaptain) {
                                    const prevBoat = getStaffAssignedBoat(staff.captain);
                                    if (prevBoat && prevBoat !== boat.id) {
                                      const prevStaff = getBoatStaff(prevBoat);
                                      setBoatStaff(prevBoat, { ...prevStaff, captain: null });
                                    }
                                  }
                                  setBoatStaff(boat.id, { ...staff, captain: newCaptain });
                                }}
                              >
                                <MenuItem value="">None</MenuItem>
                                {captains.map(c => (
                                  <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                    {getAssignedBoatName(c.id) && (
                                      <Chip label={`On ${getAssignedBoatName(c.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                    )}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                          {needsGuide && (
                            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                              <InputLabel>Guides *</InputLabel>
                              <Select
                                multiple
                                value={staff.guides || []}
                                label="Guides *"
                                onChange={(e) => {
                                  const newGuides = e.target.value;
                                  // Remove guides that are no longer selected
                                  (staff.guides || []).forEach(guideId => {
                                    if (!newGuides.includes(guideId)) {
                                      const prevBoat = getStaffAssignedBoat(guideId);
                                      if (prevBoat && prevBoat !== boat.id) {
                                        const prevStaff = getBoatStaff(prevBoat);
                                        setBoatStaff(prevBoat, {
                                          ...prevStaff,
                                          guides: (prevStaff.guides || []).filter(id => id !== guideId)
                                        });
                                      }
                                    }
                                  });
                                  setBoatStaff(boat.id, { ...staff, guides: newGuides });
                                }}
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map(id => {
                                      const guide = allStaff.find(s => s.id === id);
                                      return guide ? <Chip key={id} label={guide.name} size="small" /> : null;
                                    })}
                                  </Box>
                                )}
                              >
                                {guides.map(g => (
                                  <MenuItem key={g.id} value={g.id}>
                                    {g.name}
                                    {getAssignedBoatName(g.id) && (
                                      <Chip label={`On ${getAssignedBoatName(g.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                    )}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <InputLabel>Interns/Trainees</InputLabel>
                            <Select
                              multiple
                              value={staff.trainees || []}
                              label="Interns/Trainees"
                              onChange={(e) => {
                                const newTrainees = e.target.value;
                                // Remove trainees that are no longer selected
                                (staff.trainees || []).forEach(traineeId => {
                                  if (!newTrainees.includes(traineeId)) {
                                    const prevBoat = getStaffAssignedBoat(traineeId);
                                    if (prevBoat && prevBoat !== boat.id) {
                                      const prevStaff = getBoatStaff(prevBoat);
                                      setBoatStaff(prevBoat, {
                                        ...prevStaff,
                                        trainees: (prevStaff.trainees || []).filter(id => id !== traineeId)
                                      });
                                    }
                                  }
                                });
                                setBoatStaff(boat.id, { ...staff, trainees: newTrainees });
                              }}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map(id => {
                                    const trainee = allStaff.find(s => s.id === id);
                                    return trainee ? <Chip key={id} label={trainee.name} size="small" /> : null;
                                  })}
                                </Box>
                              )}
                            >
                              {trainees.map(t => (
                                <MenuItem key={t.id} value={t.id}>
                                  {t.name}
                                  {getAssignedBoatName(t.id) && (
                                    <Chip label={`On ${getAssignedBoatName(t.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                  )}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {errors.length > 0 && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {errors.map((err, idx) => (
                                <Box key={idx}>{err}</Box>
                              ))}
                            </Alert>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* Dive Site Assignment - Step 2 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      2. Assign Planned Dive Site
                    </Typography>
                    {(() => {
                      const boatSiteSuggestions = getBoatDiveSiteSuggestions(boat.id);
                      const selectedSiteId = getBoatDiveSite(boat.id);
                      const siteStatus = getBoatDiveSiteStatus(boat.id);
                      const selectedSite = allDiveSites.find(s => s.id === selectedSiteId);
                      
                      return (
                        <Box sx={{ mb: 2 }}>
                          {boatSiteSuggestions.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              Suggested sites for this boat's divers: {boatSiteSuggestions.map(s => s.name).join(', ')}
                          </Typography>
                          )}
                          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <InputLabel>Select Dive Site</InputLabel>
                                  <Select
                              value={selectedSiteId || ''}
                              label="Select Dive Site"
                                    onChange={(e) => {
                                      const newSiteId = e.target.value;
                                        setBoatDiveSite(boat.id, newSiteId);
                                        // Reset confirmation if site changes
                                if (siteStatus.confirmed || siteStatus.completed) {
                                        setBoatDiveSiteStatusValue(boat.id, { confirmed: false, completed: false });
                                      }
                                    }}
                                  >
                              <MenuItem value="">
                                <em>None selected</em>
                                    </MenuItem>
                                    {allDiveSites.map(site => (
                                      <MenuItem key={site.id} value={site.id}>
                                        {site.name}
                                  {site.difficultyLevel && (
                                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                      ({site.difficultyLevel})
                                    </Typography>
                                  )}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                          {selectedSiteId && (
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={1}>
                              <Typography variant="caption" color="primary">
                                Planned site: {selectedSite?.name || 'Unknown site'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (Confirmation will be done after the dive in Post-Dive Reports)
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* Divers Assignment - Step 3 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      3. Assign Divers (by skill level)
                    </Typography>
                    <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                      {skillCounts.beginner > 0 && (
                        <Chip label={`${skillCounts.beginner} Beginner`} size="small" color="info" />
                      )}
                      {skillCounts.intermediate > 0 && (
                        <Chip label={`${skillCounts.intermediate} Intermediate`} size="small" color="warning" />
                      )}
                      {skillCounts.advanced > 0 && (
                        <Chip label={`${skillCounts.advanced} Advanced`} size="small" color="success" />
                      )}
                    </Box>
                    <List dense sx={{ maxHeight: 300, overflow: 'auto', mb: 1 }}>
                      {boatCustomers.map(c => renderDiverItem(c, true, boat.id))}
                      {boatCustomers.length === 0 && (
                        <ListItem>
                          <ListItemText primary="No divers assigned" secondary={`${remaining} spots available`} />
                        </ListItem>
                      )}
                    </List>
                    
                    {remaining > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {remaining} spot{remaining !== 1 ? 's' : ''} available
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
              </Grid>
            </>
          ) : (
            /* Shore Dive Preparation (No Boats) */
            <Paper sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Shore dive location - No boats required. All dives are from the shore.
              </Alert>
              
              {/* Staff Assignment for Shore Dive */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                1. Assign Staff
              </Typography>
              {(() => {
                const needsGuide = requiresGuide(session);
                // Guides can be divemaster, instructor, or assistant
                const guides = getAvailableStaffForBoat(null, 'divemaster')
                  .concat(getAvailableStaffForBoat(null, 'instructor'))
                  .concat(getAvailableStaffForBoat(null, 'assistant'));
                const trainees = getAvailableStaffForBoat(null, 'intern');
                const errors = [];
                
                if (needsGuide && shoreDiveStaff.guides.length === 0) {
                  errors.push('At least one guide required for morning/afternoon dives');
                }
                
                return (
                  <Box sx={{ mb: 3 }}>
                    {needsGuide && (
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Guides *</InputLabel>
                        <Select
                          multiple
                          value={shoreDiveStaff.guides || []}
                          label="Guides *"
                          onChange={(e) => setShoreDiveStaff({ ...shoreDiveStaff, guides: e.target.value })}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map(id => {
                                const guide = guides.find(g => g.id === id);
                                return guide ? <Chip key={id} label={guide.name} size="small" /> : null;
                              })}
                            </Box>
                          )}
                        >
                          {guides.map(g => (
                            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Interns/Trainees</InputLabel>
                      <Select
                        multiple
                        value={shoreDiveStaff.trainees || []}
                        label="Interns/Trainees"
                        onChange={(e) => setShoreDiveStaff({ ...shoreDiveStaff, trainees: e.target.value })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map(id => {
                              const trainee = trainees.find(t => t.id === id);
                              return trainee ? <Chip key={id} label={trainee.name} size="small" /> : null;
                            })}
                          </Box>
                        )}
                      >
                        {trainees.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {errors.length > 0 && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {errors.map((err, idx) => (
                          <Box key={idx}>{err}</Box>
                        ))}
                      </Alert>
                    )}
                  </Box>
                );
              })()}
              
              {/* Dive Site Assignment */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                2. Assign Dive Site
              </Typography>
              <Box sx={{ mb: 3 }}>
                {shoreDiveSiteSuggestions.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Suggested sites for assigned divers: {shoreDiveSiteSuggestions.map(s => s.name).join(', ')}
                </Typography>
                )}
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Select Dive Site</InputLabel>
                  <Select
                    value={shoreDiveSiteId || ''}
                    label="Select Dive Site"
                    onChange={(e) => setShoreDiveSiteId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>None selected</em>
                    </MenuItem>
                    {diveSites
                      .filter(s => s.locationId === locationId)
                      .map(site => (
                        <MenuItem key={site.id} value={site.id}>
                          {site.name}
                          {site.difficultyLevel && (
                            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                              ({site.difficultyLevel})
                            </Typography>
                          )}
                        </MenuItem>
                  ))}
                  </Select>
                </FormControl>
                {shoreDiveSiteId && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                    Selected: {diveSites.find(s => s.id === shoreDiveSiteId)?.name || 'Unknown site'}
                  </Typography>
                )}
              </Box>
              
              {/* Divers Assignment */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                3. Assign Divers (by skill level)
              </Typography>
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {shoreDiveSkillCounts.beginner > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.beginner} Beginner`} size="small" color="info" />
                )}
                {shoreDiveSkillCounts.intermediate > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.intermediate} Intermediate`} size="small" color="warning" />
                )}
                {shoreDiveSkillCounts.advanced > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.advanced} Advanced`} size="small" color="success" />
                )}
              </Box>
              <List dense sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {shoreDiveCustomers.map(c => {
                  const skill = getDiverSkillLevel(c);
                  const own = c.preferences?.ownEquipment;
                  const sizes = c.preferences || {};
                  const tankSize = sizes.tankSize || '12L';
                  const equipmentText = own ? 'Own equipment' : `Rental (BCD ${sizes.bcdSize || '-'}, Fins ${sizes.finsSize || '-'}, Boots ${sizes.bootsSize || '-'}, Wetsuit ${sizes.wetsuitSize || '-'})`;
                  const rest = `${skill} · Tank: ${tankSize} · ${equipmentText}`;
                  return (
                    <ListItem 
                      key={c.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 0.5,
                        bgcolor: 'background.paper'
                      }}
                      secondaryAction={
                        <IconButton
                          size="small"
                          onClick={() => setShoreDiveAssignments(prev => prev.filter(id => id !== c.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={
                          <Box component="span">
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {c.firstName} {c.lastName}
                            </Box>
                            <Box component="span"> — {rest}</Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
                {shoreDiveCustomers.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No divers assigned yet" />
                  </ListItem>
                )}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Unassigned Divers */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1">
                  Unassigned Divers ({unassignedCustomers.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing divers with bookings for {date} - {session === '10:15' ? '10:15' : session.charAt(0).toUpperCase() + session.slice(1)} session
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search divers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ width: 300 }}
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  {boatsToDisplay.map(boat => (
                    <Button
                      key={boat.id}
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        const boatCustomers = getBoatCustomers(boat.id);
                        const boatStaff = getBoatStaff(boat.id);
                        const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                        const diverCapacity = boat.capacity - staffCount;
                        const unassigned = unassignedCustomers.filter(c => {
                          return boatCustomers.length < diverCapacity;
                        });
                        if (unassigned.length > 0) {
                          assignDiverToBoat(unassigned[0].id, boat.id);
                        }
                      }}
                      disabled={(() => {
                        const boatCustomers = getBoatCustomers(boat.id);
                        const boatStaff = getBoatStaff(boat.id);
                        const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                        const diverCapacity = boat.capacity - staffCount;
                        return unassignedCustomers.length === 0 || boatCustomers.length >= diverCapacity;
                      })()}
                    >
                      Add to {boat.name}
                    </Button>
                  ))}
                  {!showAllBoats && boats.length > boatsToDisplay.length && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      onClick={() => setShowAllBoats(true)}
                    >
                      Show All Boats ({boats.length})
                    </Button>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {unassignedCustomers.map(customer => (
                    <Box key={customer.id} sx={{ mb: 1 }}>
                      {renderDiverItem(customer)}
                      <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                        {hasBoats ? (
                          boatsToDisplay.map(boat => {
                            const boatCustomers = getBoatCustomers(boat.id);
                            const boatStaff = getBoatStaff(boat.id);
                            const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                            const diverCapacity = boat.capacity - staffCount;
                            const isFull = boatCustomers.length >= diverCapacity;
                            const spotsLeft = diverCapacity - boatCustomers.length;
                            return (
                              <Button
                                key={boat.id}
                                size="small"
                                variant="outlined"
                                onClick={() => assignDiverToBoat(customer.id, boat.id)}
                                disabled={isFull}
                              >
                                {boat.name} {isFull ? '(Full)' : `(${spotsLeft} left)`}
                              </Button>
                            );
                          })
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShoreDiveAssignments(prev => [...prev, customer.id])}
                          >
                            Add to Shore Dive Group
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {unassignedCustomers.length === 0 && (
                    <ListItem>
                      <ListItemText primary="All divers assigned" />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={allocateRental} 
                    onChange={(e) => setAllocateRental(e.target.checked)} 
                  />
                } 
                label="Auto-allocate rental equipment on save" 
              />
              <Box display="flex" gap={2}>
                <Button variant="contained" onClick={handleAllocate}>
                  Allocate Equipment Now
                </Button>
                <Button variant="contained" color="primary" onClick={savePreparation}>
                  {shouldUseBoatPrep ? 'Save All Boat Preparations' : 'Save Shore Dive Preparation'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
        </>
      )}

      {activeTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              Post-Dive Reports
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
    </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Confirm and complete dives after boats return. Update the actual dive site if it differs from the planned site, and add notes for official marine authority documentation.
          </Alert>

          {postDivePreparations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No prepared dives found for {reportDate}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Prepared dives will appear here after they are saved in the Dive Preparation section.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {postDivePreparations.map((prep) => {
                const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
                const plannedSite = allDiveSites.find(s => s.id === prep.diveSiteId);
                const currentActualSiteId = editingReports[prep.id]?.actualDiveSiteId !== undefined 
                  ? editingReports[prep.id].actualDiveSiteId 
                  : (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId);
                const actualSite = allDiveSites.find(s => s.id === currentActualSiteId);
                const currentNotes = editingReports[prep.id]?.notes !== undefined 
                  ? editingReports[prep.id].notes 
                  : (prep.postDiveReport?.notes || '');
                const isCompleted = prep.diveSiteStatus?.completed === true;
                const isConfirmed = prep.diveSiteStatus?.confirmed === true;

                return (
                  <Grid item xs={12} md={6} key={prep.id}>
                    <Paper sx={{ p: 3, border: '1px solid', borderColor: isCompleted ? 'success.main' : 'divider' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">
                          {boat ? boat.name : 'Shore Dive'} - {prep.session}
                        </Typography>
                        {isCompleted ? (
                          <Chip label="Completed" color="success" size="small" />
                        ) : (
                          <Chip label="Pending Confirmation" color="warning" size="small" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Date: {prep.date} | Divers: {prep.diverIds?.length || 0}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Planned Dive Site: <strong>{plannedSite?.name || 'Unknown'}</strong>
                      </Typography>
                      {!isConfirmed && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          This dive needs to be confirmed after the boat returns.
                        </Alert>
                      )}

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Actual Dive Site (Official Report)</InputLabel>
                        <Select
                          value={currentActualSiteId || ''}
                          label="Actual Dive Site (Official Report)"
                          onChange={(e) => updatePostDiveReport(prep.id, 'actualDiveSiteId', e.target.value)}
                        >
                          {allDiveSites.map(site => (
                            <MenuItem key={site.id} value={site.id}>
                              {site.name}
                              {site.difficultyLevel && (
                                <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                  ({site.difficultyLevel})
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {plannedSite && currentActualSiteId && prep.diveSiteId !== currentActualSiteId && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <strong>Note:</strong> Planned site was <strong>{plannedSite.name}</strong>, but actual site is <strong>{actualSite?.name || 'Unknown'}</strong>
                        </Alert>
                      )}

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Entry Time"
                            type="time"
                            fullWidth
                            value={editingReports[prep.id]?.timestamps?.entryTime || prep.postDiveReport?.entryTime || ''}
                            onChange={(e) => updatePostDiveTimestamp(prep.id, 'entryTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Exit Time"
                            type="time"
                            fullWidth
                            value={editingReports[prep.id]?.timestamps?.exitTime || prep.postDiveReport?.exitTime || ''}
                            onChange={(e) => updatePostDiveTimestamp(prep.id, 'exitTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                      </Grid>

                      <TextField
                        label="Post-Dive Notes (Optional)"
                        fullWidth
                        multiline
                        rows={3}
                        value={currentNotes}
                        onChange={(e) => updatePostDiveReport(prep.id, 'notes', e.target.value)}
                        placeholder="Add any additional notes about the dive (conditions, changes, etc.) for official documentation..."
                        size="small"
                        sx={{ mb: 2 }}
                      />

                      <Box display="flex" gap={2}>
                        <Button 
                          variant={isCompleted ? "outlined" : "contained"}
                          color={isCompleted ? "success" : "primary"}
                          onClick={() => savePostDiveReport(prep.id, !isCompleted)}
                          fullWidth
                        >
                          {isCompleted ? 'Already Completed' : 'Confirm & Complete Dive'}
                        </Button>
                        {!isCompleted && (
                          <Button 
                            variant="outlined"
                            color="primary"
                            onClick={() => savePostDiveReport(prep.id, false)}
                            fullWidth
                          >
                            Save (Don't Complete)
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              Compliance Reports (Spanish Regulations)
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Report Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              {(() => {
                const completedPrepsForReport = postDivePreparations.filter(prep => prep.diveSiteStatus?.completed === true);
                if (completedPrepsForReport.length > 0) {
                  return (
                    <Box display="flex" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => exportComplianceReport(completedPrepsForReport)}
                      >
                        Download CSV
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => exportComplianceReportPDF(completedPrepsForReport)}
                      >
                        Download PDF
                      </Button>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            This report contains all data required for Spanish regulatory compliance, including gender breakdown and certifications.
            Only completed dives are included in compliance reports.
          </Alert>

          {(() => {
            const completedPrepsForReport = postDivePreparations.filter(prep => prep.diveSiteStatus?.completed === true);
            
            if (completedPrepsForReport.length === 0) {
              return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No completed dives found for {reportDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Complete dives in the Post-Dive Reports tab to generate compliance reports.
                  </Typography>
                </Paper>
              );
            }

            // Calculate gender breakdown for divers and guides
            const calculateGenderBreakdown = (prep) => {
              const divers = (prep.diverIds || []).map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
              const guides = (prep.guideIds || []).map(id => allStaff.find(s => s.id === id)).filter(Boolean);
              
              const diversByGender = {
                male: divers.filter(d => d.gender === 'male').length,
                female: divers.filter(d => d.gender === 'female').length,
                unspecified: divers.filter(d => !d.gender || (d.gender !== 'male' && d.gender !== 'female')).length
              };

              // Guides gender breakdown (if staff have gender field, otherwise will show 0)
              const guidesByGender = {
                male: 0,
                female: 0,
                unspecified: guides.length
              };

              return { divers, guides, diversByGender, guidesByGender };
            };

            return (
              <Grid container spacing={3}>
                {completedPrepsForReport.map((prep) => {
                  const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
                  const plannedSite = allDiveSites.find(s => s.id === prep.diveSiteId);
                  const actualSite = allDiveSites.find(s => s.id === (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId));
                  const { divers, guides, diversByGender, guidesByGender } = calculateGenderBreakdown(prep);
                  const captain = prep.captainId ? allStaff.find(s => s.id === prep.captainId) : null;

                  // Get highest certification level for each diver
                  const getHighestCertification = (customer) => {
                    if (!customer?.certifications || customer.certifications.length === 0) return 'No certification';
                    // Sort by level priority (simplified - in production, use proper level hierarchy)
                    const sorted = [...customer.certifications].sort((a, b) => {
                      const levels = { 'instructor': 10, 'dm': 9, 'rescue': 8, 'aow': 7, 'ow': 6 };
                      return (levels[b.level?.toLowerCase()] || 0) - (levels[a.level?.toLowerCase()] || 0);
                    });
                    return `${sorted[0].agency || ''} ${sorted[0].level || ''}`.trim();
                  };

                  return (
                    <Grid item xs={12} key={prep.id}>
                      <Paper sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6">
                            {boat ? boat.name : 'Shore Dive'} - {prep.session} - {prep.date}
                          </Typography>
                          <Chip label="Completed" color="success" />
                        </Box>

                        <Grid container spacing={2}>
                          {/* Dive Information */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Dive Site Information
                            </Typography>
                            <Typography variant="body2"><strong>Planned:</strong> {plannedSite?.name || 'Unknown'}</Typography>
                            <Typography variant="body2"><strong>Actual:</strong> {actualSite?.name || plannedSite?.name || 'Unknown'}</Typography>
                            {prep.postDiveReport?.entryTime && (
                              <Typography variant="body2"><strong>Entry Time:</strong> {prep.postDiveReport.entryTime}</Typography>
                            )}
                            {prep.postDiveReport?.exitTime && (
                              <Typography variant="body2"><strong>Exit Time:</strong> {prep.postDiveReport.exitTime}</Typography>
                            )}
                          </Grid>

                          {/* Staff Information */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Staff
                            </Typography>
                            {captain && (
                              <Typography variant="body2"><strong>Captain:</strong> {captain.name || captain.firstName + ' ' + captain.lastName}</Typography>
                            )}
                            {guides.length > 0 && (
                              <>
                                <Typography variant="body2"><strong>Guides ({guides.length}):</strong></Typography>
                                {guides.map(g => (
                                  <Typography key={g.id} variant="body2" sx={{ ml: 2 }}>
                                    • {g.name || g.firstName + ' ' + g.lastName} - {g.role || 'Guide'}
                                  </Typography>
                                ))}
                                <Typography variant="caption" color="text.secondary">
                                  Gender breakdown: {guidesByGender.male}M / {guidesByGender.female}F / {guidesByGender.unspecified}U
                                </Typography>
                              </>
                            )}
                          </Grid>

                          {/* Divers Information */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Divers ({divers.length} total)
                            </Typography>
                            <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>Name</strong></TableCell>
                                      <TableCell><strong>Gender</strong></TableCell>
                                      <TableCell><strong>Certification</strong></TableCell>
                                      <TableCell><strong>Nationality</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {divers.map(diver => (
                                      <TableRow key={diver.id}>
                                        <TableCell>{diver.firstName} {diver.lastName}</TableCell>
                                        <TableCell>{diver.gender ? (diver.gender.charAt(0).toUpperCase() + diver.gender.slice(1)) : 'Not specified'}</TableCell>
                                        <TableCell>{getHighestCertification(diver)}</TableCell>
                                        <TableCell>{diver.nationality || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Gender breakdown: {diversByGender.male} Male / {diversByGender.female} Female / {diversByGender.unspecified} Unspecified
                            </Typography>
                          </Grid>

                          {/* Summary for Regulatory Compliance */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Regulatory Compliance Summary
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Date</Typography>
                                  <Typography variant="body2"><strong>{prep.date}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Session</Typography>
                                  <Typography variant="body2"><strong>{prep.session}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Total Divers</Typography>
                                  <Typography variant="body2"><strong>{divers.length}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Total Guides</Typography>
                                  <Typography variant="body2"><strong>{guides.length}</strong></Typography>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {prep.postDiveReport?.notes && (
                            <Grid item xs={12}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Additional Notes
                              </Typography>
                              <Typography variant="body2">{prep.postDiveReport.notes}</Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default BoatPrep;
