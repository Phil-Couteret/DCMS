import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  TextField,
  Grid,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  DirectionsCar as CarIcon,
  DesktopWindows as MonitorIcon,
  GetApp as CSVIcon,
  Image as ImageIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import dataService from '../services/dataService';

const TripDetails = () => {
  const navigate = useNavigate();
  const { date, type, boatId, session } = useParams();
  const [searchParams] = useSearchParams();
  
  // Get params from URL or search params
  const tripDate = date || searchParams.get('date');
  const tripType = type || searchParams.get('type') || 'boat'; // 'mole' or 'boat'
  const tripBoatId = boatId || searchParams.get('boatId');
  const tripSession = session || searchParams.get('session') || 'morning';

  const [activeMode, setActiveMode] = useState(0); // 0 = Diving, 1 = Equipment, 2 = Transfer, 3 = Forms
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [boats, setBoats] = useState([]);
  const [diveSites, setDiveSites] = useState([]);
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDiverForm, setNewDiverForm] = useState({ firstName: '', lastName: '' });
  const [selectedBookings, setSelectedBookings] = useState({}); // { bookingId: { activity, equipment, notes, diet, assignment } }

  const currentLocationId = localStorage.getItem('dcms_current_location');

  useEffect(() => {
    loadData();
  }, [tripDate, tripType, tripBoatId, tripSession]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsData, customersData, boatsData, diveSitesData, staffData, locationsData] = await Promise.all([
        dataService.getAll('bookings'),
        dataService.getAll('customers'),
        dataService.getAll('boats'),
        dataService.getAll('diveSites'),
        dataService.getAll('staff'),
        dataService.getAll('locations')
      ]);

      const allBookings = Array.isArray(bookingsData) ? bookingsData : [];
      setBookings(allBookings);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setBoats(Array.isArray(boatsData) ? boatsData : []);
      setDiveSites(Array.isArray(diveSitesData) ? diveSitesData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
      setLocations(Array.isArray(locationsData) ? locationsData : []);

      // Initialize selected bookings from existing bookings (calculate tripBookings here)
      const dateStr = tripDate?.includes('T') ? tripDate.split('T')[0] : tripDate;
      if (dateStr) {
        const currentLocationId = localStorage.getItem('dcms_current_location');
        const relevantBookings = allBookings.filter(booking => {
          const bookingDate = booking.bookingDate || booking.booking_date;
          const bookingDateStr = bookingDate ? (bookingDate.split('T')[0] || bookingDate) : null;
          const bookingLocationId = booking.locationId || booking.location_id;
          const locationMatch = !currentLocationId || bookingLocationId === currentLocationId;
          const dateMatch = bookingDateStr === dateStr;
          
          if (!dateMatch || !locationMatch) return false;

          if (tripType === 'mole') {
            const activityType = booking.activityType || booking.activity_type;
            return activityType === 'discovery' || activityType === 'discover' || 
                   activityType === 'try_dive' || activityType === 'orientation' || 
                   activityType === 'try_scuba';
          } else if (tripType === 'boat') {
            const activityType = booking.activityType || booking.activity_type;
            const isDiving = activityType === 'diving' || activityType === 'snorkeling' || activityType === 'specialty';
            if (!isDiving) return false;
            if (tripBoatId) {
              const bookingBoatId = booking.boatId || booking.boat_id;
              return bookingBoatId === tripBoatId;
            }
            return true;
          }
          return false;
        });

        const initialSelected = {};
        relevantBookings.forEach(booking => {
          initialSelected[booking.id] = {
            activity: booking.activityType || booking.activity_type || '',
            equipment: booking.equipmentNeeded || '',
            notes: booking.notes || '',
            diet: booking.dietaryRequirements || booking.dietary_requirements || '',
            assignment: booking.boatId || booking.boat_id || 'unassigned'
          };
        });
        setSelectedBookings(initialSelected);
      }
    } catch (error) {
      console.error('Error loading trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get bookings for this trip
  const tripBookings = useMemo(() => {
    if (!tripDate) return [];
    const dateStr = tripDate.includes('T') ? tripDate.split('T')[0] : tripDate;
    
    return bookings.filter(booking => {
      const bookingDate = booking.bookingDate || booking.booking_date;
      const bookingDateStr = bookingDate ? (bookingDate.split('T')[0] || bookingDate) : null;
      const bookingLocationId = booking.locationId || booking.location_id;
      const locationMatch = !currentLocationId || bookingLocationId === currentLocationId;
      const dateMatch = bookingDateStr === dateStr;
      
      if (!dateMatch || !locationMatch) return false;

      if (tripType === 'mole') {
        const activityType = booking.activityType || booking.activity_type;
        return activityType === 'discovery' || activityType === 'discover' || 
               activityType === 'try_dive' || activityType === 'orientation' || 
               activityType === 'try_scuba';
      } else if (tripType === 'boat') {
        const activityType = booking.activityType || booking.activity_type;
        const isDiving = activityType === 'diving' || activityType === 'snorkeling' || activityType === 'specialty';
        if (!isDiving) return false;
        if (tripBoatId) {
          const bookingBoatId = booking.boatId || booking.boat_id;
          return bookingBoatId === tripBoatId;
        }
        return true;
      }
      return false;
    });
  }, [bookings, tripDate, tripType, tripBoatId, currentLocationId]);

  const activeBoat = useMemo(() => {
    if (tripType !== 'boat' || !tripBoatId) return null;
    return boats.find(b => b.id === tripBoatId);
  }, [boats, tripType, tripBoatId]);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 'Unknown';
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || customer.email || 'Unknown';
  };

  const getCustomer = (customerId) => {
    return customers.find(c => c.id === customerId);
  };

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return customers.filter(c => {
      const firstName = (c.firstName || c.first_name || '').toLowerCase();
      const lastName = (c.lastName || c.last_name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return firstName.includes(query) || lastName.includes(query) || email.includes(query);
    }).slice(0, 10); // Limit to 10 results
  }, [customers, searchQuery]);

  const handleAddDiver = async (customerId) => {
    // This would typically create a new booking for this customer
    // For now, we'll just show a message
    console.log('Add diver:', customerId);
    // TODO: Implement booking creation
  };

  const handleCreateNewDiver = async () => {
    try {
      const newCustomer = await dataService.create('customers', {
        firstName: newDiverForm.firstName,
        lastName: newDiverForm.lastName,
        customerType: 'tourist'
      });
      await loadData();
      setNewDiverForm({ firstName: '', lastName: '' });
      // Optionally add to trip
      await handleAddDiver(newCustomer.id);
    } catch (error) {
      console.error('Error creating new diver:', error);
      alert('Error creating new diver. Please try again.');
    }
  };

  const handleRemoveDiver = async (bookingId) => {
    // Remove booking from trip (unassign)
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await dataService.update('bookings', bookingId, {
          boatId: null,
          slotAssignment: null
        });
        await loadData();
      }
    } catch (error) {
      console.error('Error removing diver:', error);
      alert('Error removing diver. Please try again.');
    }
  };

  const handleUpdateBookingField = async (bookingId, field, value) => {
    try {
      const updateData = {};
      if (field === 'activity') {
        updateData.activityType = value;
      } else if (field === 'equipment') {
        updateData.equipmentNeeded = value;
      } else if (field === 'notes') {
        updateData.notes = value;
      } else if (field === 'diet') {
        updateData.dietaryRequirements = value;
      } else if (field === 'assignment') {
        if (value === 'unassigned') {
          updateData.boatId = null;
        } else {
          updateData.boatId = value;
        }
      }

      await dataService.update('bookings', bookingId, updateData);
      setSelectedBookings(prev => ({
        ...prev,
        [bookingId]: {
          ...prev[bookingId],
          [field]: value
        }
      }));
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading trip details...</Typography>
      </Box>
    );
  }

  const tripDateObj = tripDate ? new Date(tripDate) : new Date();
  const tripDateFormatted = format(tripDateObj, 'dd MMM yyyy HH:mm');
  const customerCount = tripBookings.length;
  const staffCount = 0; // TODO: Calculate from staff assignments
  const diveCount = tripBookings.reduce((sum, b) => sum + (b.numberOfDives || b.number_of_dives || 1), 0);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Dive Trip Details</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip label={tripType === 'mole' ? 'Shore' : 'Boat'} color="info" />
            {tripType === 'boat' && activeBoat && (
              <Chip label={activeBoat.name} color="success" />
            )}
            <Chip icon={<CalendarIcon />} label={tripDateFormatted} color="success" />
            <Chip icon={<PersonIcon />} label={`${customerCount} Customers`} color="info" />
            <Chip icon={<PersonIcon />} label={`${staffCount} Staff`} color="success" />
            <Chip label={`${diveCount} dives`} color="success" />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton><CalendarIcon /></IconButton>
          <IconButton><CarIcon /></IconButton>
          <IconButton><MonitorIcon /></IconButton>
          <IconButton><CSVIcon /></IconButton>
          <IconButton><ImageIcon /></IconButton>
          <IconButton><ShareIcon /></IconButton>
          <Button variant="contained" startIcon={<EditIcon />}>Edit</Button>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/schedule')}>
            Back to list
          </Button>
        </Box>
      </Box>

      {/* Mode Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeMode} onChange={(e, newValue) => setActiveMode(newValue)}>
          <Tab label="Diving Mode" />
          <Tab label="Equipment Mode" />
          <Tab label="Transfer Mode" />
          <Tab label="Forms Mode" />
        </Tabs>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            {tripBookings.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No bookings for this trip
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {tripBookings.map((booking) => {
                  const customer = getCustomer(booking.customerId || booking.customer_id);
                  const bookingData = selectedBookings[booking.id] || {};
                  
                  return (
                    <Paper key={booking.id} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(customer?.firstName || customer?.first_name || '?')[0].toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" color="primary">
                            {getCustomerName(booking.customerId || booking.customer_id)}
                          </Typography>
                          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 1 }}>
                            <InputLabel>Assignment</InputLabel>
                            <Select
                              value={bookingData.assignment || 'unassigned'}
                              label="Assignment"
                              onChange={(e) => handleUpdateBookingField(booking.id, 'assignment', e.target.value)}
                            >
                              <MenuItem value="unassigned">Unassigned</MenuItem>
                              {boats.filter(b => {
                                const boatLocationId = b.locationId || b.location_id;
                                return boatLocationId === currentLocationId && (b.isActive !== false);
                              }).map(boat => (
                                <MenuItem key={boat.id} value={boat.id}>{boat.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Activity"
                                value={bookingData.activity || ''}
                                onChange={(e) => handleUpdateBookingField(booking.id, 'activity', e.target.value)}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Equipment"
                                value={bookingData.equipment || ''}
                                onChange={(e) => handleUpdateBookingField(booking.id, 'equipment', e.target.value)}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Notes"
                                value={bookingData.notes || ''}
                                onChange={(e) => handleUpdateBookingField(booking.id, 'notes', e.target.value)}
                                multiline
                                rows={2}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                fullWidth
                                size="small"
                                label="Diet"
                                value={bookingData.diet || ''}
                                onChange={(e) => handleUpdateBookingField(booking.id, 'diet', e.target.value)}
                                multiline
                                rows={2}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                        <IconButton 
                          color="error" 
                          onClick={() => handleRemoveDiver(booking.id)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sidebar - Add Diver */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Add Diver</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search divers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              sx={{ mb: 2 }}
            />
            {filteredCustomers.length > 0 && (
              <Box sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                {filteredCustomers.map(customer => (
                  <Button
                    key={customer.id}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    onClick={() => handleAddDiver(customer.id)}
                  >
                    {getCustomerName(customer.id)}
                  </Button>
                ))}
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Diver doesn't exist? Add new
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="First Name"
              value={newDiverForm.firstName}
              onChange={(e) => setNewDiverForm({ ...newDiverForm, firstName: e.target.value })}
              sx={{ mb: 1 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Surname"
              value={newDiverForm.lastName}
              onChange={(e) => setNewDiverForm({ ...newDiverForm, lastName: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNewDiver}
              disabled={!newDiverForm.firstName || !newDiverForm.lastName}
            >
              Create New Diver
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TripDetails;

