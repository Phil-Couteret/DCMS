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
  InputLabel
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

const getRecentDiveSiteIdsForCustomers = (customerIds, days = 3) => {
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
  const bookings = dataService.getAll('bookings');
  const recent = bookings.filter(b => b.bookingDate >= since && customerIds.includes(b.customerId));
  return new Set(recent.map(b => b.diveSiteId).filter(Boolean));
};

const suggestDiveSites = (locationId, allCustomers) => {
  const allSites = dataService.getAll('diveSites').filter(s => s.locationId === locationId);
  if (allCustomers.length === 0) return allSites.slice(0, 5);
  const cap = allowedDifficultyForGroup(allCustomers);
  const disallow = getRecentDiveSiteIdsForCustomers(allCustomers.map(c => c.id), 3);
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

const isShoreDive = (diveSiteId, session) => {
  if (!diveSiteId) return false;
  const diveSites = dataService.getAll('diveSites');
  const site = diveSites.find(s => s.id === diveSiteId);
  // Mole is a shore dive, and night dives are always at Mole (shore dive)
  return session === 'night' || (site && site.name.toLowerCase().includes('mole'));
};

const requiresCaptain = (diveSiteId, session) => {
  return !isShoreDive(diveSiteId, session);
};

const requiresGuide = (session) => {
  // Morning and afternoon require guides, night (Mole shore dive) and 10:15 don't
  return session === 'morning' || session === 'afternoon';
};

const BoatPrep = () => {
  const locationId = localStorage.getItem('dcms_current_location');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [session, setSession] = useState('morning');
  const boats = useMemo(() => (dataService.getAll('boats') || []).filter(b => b.locationId === locationId && b.isActive), [locationId]);
  const hasBoats = boats.length > 0;
  
  // Reset session to morning if 10:15 is selected but location doesn't support it (Las Playitas)
  useEffect(() => {
    if (session === '10:15' && !hasBoats) {
      setSession('morning');
    }
  }, [hasBoats, session]);
  const allCustomers = useMemo(() => dataService.getAll('customers') || [], []);
  const allStaff = useMemo(() => (dataService.getAll('users') || []).filter(u => u.isActive), []);
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
    return suggestDiveSites(locationId, shoreDiveCustomers);
  }, [locationId, shoreDiveCustomers]);
  
  // Get customers who have bookings for the selected date and session
  const customersWithBookings = useMemo(() => {
    const bookings = dataService.getAll('bookings') || [];
    const bookingsForDate = bookings.filter(b => {
      // Check date matches
      if (b.bookingDate !== date) return false;
      // Check location matches
      if (b.locationId !== locationId) return false;
      // Check status is confirmed or paid
      if (b.status !== 'confirmed' && b.paymentStatus !== 'paid') return false;
      // Check session matches
      if (b.diveSessions && typeof b.diveSessions === 'object') {
        // Handle 10:15 as a special session (might be stored as 'tenFifteen' or '10:15')
        if (session === '10:15') {
          return b.diveSessions.tenFifteen === true || b.diveSessions['10:15'] === true;
        }
        return b.diveSessions[session] === true;
      }
      return false;
    });
    
    const customerIds = new Set(bookingsForDate.map(b => b.customerId));
    return allCustomers.filter(c => customerIds.has(c.id));
  }, [date, session, locationId, allCustomers]);
  
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
    if (hasBoats) {
      return new Set(Object.values(boatAssignments).flat());
    } else {
      return new Set(shoreDiveAssignments);
    }
  }, [boatAssignments, shoreDiveAssignments, hasBoats]);
  
  const unassignedCustomers = useMemo(() => {
    return filteredCustomers.filter(c => !assignedIds.has(c.id));
  }, [filteredCustomers, assignedIds]);
  
  // Get all assigned customers across all boats (or shore dive group) for dive site suggestions
  const allAssignedCustomers = useMemo(() => {
    if (hasBoats) {
      const assigned = Object.values(boatAssignments).flat().map(id => 
        allCustomers.find(c => c.id === id)
      ).filter(Boolean);
      return assigned;
    } else {
      return shoreDiveCustomers;
    }
  }, [boatAssignments, shoreDiveCustomers, hasBoats, allCustomers]);
  
  // Per-boat dive site assignments: { boatId: diveSiteId }
  const [boatDiveSites, setBoatDiveSites] = useState({});
  const [allocateRental, setAllocateRental] = useState(true);
  
  // Get dive site suggestions for a specific boat based on its divers
  const getBoatDiveSiteSuggestions = (boatId) => {
    const boatCustomers = getBoatCustomers(boatId);
    return suggestDiveSites(locationId, boatCustomers);
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

  const assignDiverToBoat = (customerId, boatId) => {
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
    const needsCaptain = requiresCaptain(diveSiteId, session);
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
    if (hasBoats) {
      // Validate all boats have required staff
      const validationErrors = [];
      Object.keys(boatAssignments).forEach(boatId => {
        const errors = getStaffValidationErrors(boatId);
        if (errors.length > 0) {
          const boat = boats.find(b => b.id === boatId);
          errors.forEach(err => validationErrors.push(`${boat?.name || 'Boat'}: ${err}`));
        }
      });
      
      if (validationErrors.length > 0) {
        alert('Please fix the following issues:\n\n' + validationErrors.join('\n'));
        return;
      }
      
      Object.keys(boatAssignments).forEach(boatId => {
        const diverIds = boatAssignments[boatId] || [];
        if (diverIds.length > 0) {
          const staff = getBoatStaff(boatId);
          const diveSiteId = getBoatDiveSite(boatId);
          const payload = {
            date,
            session,
            boatId,
            diverIds,
            diveSiteId: diveSiteId,
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
        diveSiteId: shoreDiveSiteId,
        staff: {
          captain: null, // No captain for shore dives
          guides: shoreDiveStaff.guides,
          trainees: shoreDiveStaff.trainees
        },
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
          {hasBoats ? 'Boat Preparation' : 'Shore Dive Preparation'}
        </Typography>
        {hasBoats && (
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
                  {hasBoats ? 'Global Dive Site (optional - can be set per boat)' : 'Dive Site Selection'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {hasBoats 
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
          {hasBoats ? (
            <Grid container spacing={2}>
              {boats.map(boat => {
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
                      const needsCaptain = requiresCaptain(diveSiteId, session);
                      const needsGuide = requiresGuide(session);
                      const captains = getAvailableStaffForBoat(boat.id, 'boat_pilot');
                      const guides = getAvailableStaffForBoat(boat.id, 'guide');
                      const trainees = getAvailableStaffForBoat(boat.id, 'intern').concat(getAvailableStaffForBoat(boat.id, 'trainer'));
                      
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
                      2. Assign Dive Site
                    </Typography>
                    {(() => {
                      const boatSiteSuggestions = getBoatDiveSiteSuggestions(boat.id);
                      const selectedSiteId = getBoatDiveSite(boat.id);
                      
                      return (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Suggested sites for this boat's divers:
                          </Typography>
                          <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                            {boatSiteSuggestions.map(s => (
                              <Chip
                                key={s.id}
                                label={s.name}
                                onClick={() => setBoatDiveSite(boat.id, s.id)}
                                color={selectedSiteId === s.id ? 'primary' : 'default'}
                                variant={selectedSiteId === s.id ? 'filled' : 'outlined'}
                                size="small"
                              />
                            ))}
                          </Box>
                          {selectedSiteId && (
                            <Typography variant="caption" color="primary">
                              Selected: {boatSiteSuggestions.find(s => s.id === selectedSiteId)?.name || 'Unknown site'}
                            </Typography>
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
                const guides = getAvailableStaffForBoat(null, 'guide');
                const trainees = getAvailableStaffForBoat(null, 'intern').concat(getAvailableStaffForBoat(null, 'trainer'));
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Suggested sites for assigned divers:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  {shoreDiveSiteSuggestions.map(s => (
                    <Chip
                      key={s.id}
                      label={s.name}
                      onClick={() => setShoreDiveSiteId(s.id)}
                      color={shoreDiveSiteId === s.id ? 'primary' : 'default'}
                      variant={shoreDiveSiteId === s.id ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
                {shoreDiveSiteId && (
                  <Typography variant="caption" color="primary">
                    Selected: {shoreDiveSiteSuggestions.find(s => s.id === shoreDiveSiteId)?.name || 'Unknown site'}
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
                <Box display="flex" gap={1} mb={2}>
                  {boats.map(boat => (
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
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {unassignedCustomers.map(customer => (
                    <Box key={customer.id} sx={{ mb: 1 }}>
                      {renderDiverItem(customer)}
                      <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                        {hasBoats ? (
                          boats.map(boat => {
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
                  {hasBoats ? 'Save All Boat Preparations' : 'Save Shore Dive Preparation'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BoatPrep;
