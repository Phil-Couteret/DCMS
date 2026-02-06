import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Event as EventIcon,
  Euro as EuroIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  BarChart as BarChartIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import RevenueChart from '../components/Dashboard/RevenueChart';
import BookingTrendsChart from '../components/Dashboard/BookingTrendsChart';
import RevenueByActivityChart from '../components/Dashboard/RevenueByActivityChart';
import BookingCalendar from '../components/Dashboard/BookingCalendar';
import TopCustomersList from '../components/Dashboard/TopCustomersList';
import {
  getRevenueData,
  getBookingTrends,
  getRevenueByActivity,
  getTopCustomers
} from '../utils/chartData';
import { useAuth } from '../utils/authContext';
import { useTranslation } from '../utils/languageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, currentUser } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalBookings: 0,
    todaysBookings: 0,
    totalRevenue: 0,
    todaysRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0
  });
  
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // bookings for current scope
  const [allBookingsGlobal, setAllBookingsGlobal] = useState([]); // all bookings across all locations
  const [customers, setCustomers] = useState([]);
  const [daysToShow, setDaysToShow] = useState(3);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [revenuePeriod, setRevenuePeriod] = useState(7); // 7, 14, 30 days
  const [trendsPeriod, setTrendsPeriod] = useState(14); // 7, 14, 30 days
  const [locations, setLocations] = useState([]);
  const [tabScope, setTabScope] = useState('all'); // 'all' or locationId
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  useEffect(() => {
    // Load locations and initial selection
    const loadLocations = async () => {
      try {
        const locs = await dataService.getAll('locations') || [];
        if (!Array.isArray(locs)) return;
        
        setLocations(locs);
        const stored = localStorage.getItem('dcms_current_location');
        setSelectedLocationId(stored || (locs[0]?.id || null));
        // Determine access: global admins can view all; local managers forced to their location
        const hasGlobalAccess = !currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0);
        const scopeFlag = localStorage.getItem('dcms_dashboard_scope');
        const wantGlobal = scopeFlag === 'global';
        if (hasGlobalAccess && wantGlobal) {
          setTabScope('all');
        } else {
          setTabScope(stored || locs[0]?.id || 'all');
        }
      } catch (error) {
        console.error('[Dashboard] Error loading locations:', error);
      }
    };
    
    loadLocations();
    
    const onLocChange = (e) => {
      const detail = e && e.detail;
      const newLoc = (typeof detail === 'string' ? detail : (detail && detail.locationId)) || localStorage.getItem('dcms_current_location');
      setSelectedLocationId(newLoc || null);
      const hasGlobalAccess = !currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0);
      const scope = localStorage.getItem('dcms_dashboard_scope');
      if (hasGlobalAccess && scope === 'global') {
        setTabScope('all');
      } else {
        setTabScope(newLoc || 'all');
      }
    };
    const onBookingCreated = () => {
      // loadStats will be defined in the next useEffect
      // This event listener will trigger a reload
      window.location.reload();
    };
    window.addEventListener('dcms_location_changed', onLocChange);
    window.addEventListener('storage', onLocChange);
    window.addEventListener('dcms_booking_created', onBookingCreated);
    return () => {
      window.removeEventListener('dcms_location_changed', onLocChange);
      window.removeEventListener('storage', onLocChange);
      window.removeEventListener('dcms_booking_created', onBookingCreated);
    };
  }, [currentUser]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Base datasets - all async in API mode
        const statistics = await dataService.getStatistics();
        const allBookingsData = await dataService.getAll('bookings') || [];
        const allCustomers = await dataService.getAll('customers') || [];

        // Ensure we have arrays
        if (!Array.isArray(allBookingsData) || !Array.isArray(allCustomers)) {
          console.warn('[Dashboard] Invalid data format:', { allBookingsData, allCustomers });
          return;
        }

        // Determine filtering based on tab scope
        let locationFilteredBookings = allBookingsData;
        if (tabScope !== 'all' && tabScope) {
          locationFilteredBookings = allBookingsData.filter(b => {
            const locationId = b.locationId || b.location_id;
            return locationId === tabScope;
          });
        }

        // Upcoming bookings with days filter
        const cutoff = new Date();
        const end = new Date();
        end.setDate(end.getDate() + daysToShow);
        const upcoming = locationFilteredBookings.filter(b => {
          const bookingDate = b.bookingDate || b.booking_date;
          const d = new Date(bookingDate);
          return d >= cutoff && d <= end;
        }).sort((a,b)=> {
          const dateA = new Date(a.bookingDate || a.booking_date);
          const dateB = new Date(b.bookingDate || b.booking_date);
          return dateA - dateB;
        });

        // Compute stats from filtered bookings
        const todayStr = new Date().toISOString().slice(0,10);
        const todays = locationFilteredBookings.filter(b => {
          const bookingDate = b.bookingDate || b.booking_date;
          return bookingDate === todayStr;
        });
        const todaysRevenue = todays.reduce((sum, b) => sum + parseFloat(b.totalPrice || b.total_price || 0), 0);
        const totalRevenue = locationFilteredBookings.reduce((sum, b) => sum + parseFloat(b.totalPrice || b.total_price || 0), 0);
        const pending = locationFilteredBookings.filter(b => (b.status || 'pending') === 'pending').length;
        const confirmed = locationFilteredBookings.filter(b => (b.status || 'pending') === 'confirmed').length;

        setStats({
          totalBookings: locationFilteredBookings.length,
          todaysBookings: todays.length,
          totalRevenue,
          todaysRevenue,
          pendingBookings: pending,
          confirmedBookings: confirmed
        });

        setAllBookings(locationFilteredBookings);
        setAllBookingsGlobal(allBookingsData);
        setUpcomingBookings(upcoming);
        setCustomers(allCustomers);
      } catch (error) {
        console.error('[Dashboard] Error loading stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(() => loadStats(), 5000);
    return () => clearInterval(interval);
  }, [daysToShow, tabScope, selectedLocationId]);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
  };

  const groupBookingsByDate = (bookings) => {
    return bookings.reduce((acc, booking) => {
      const date = booking.bookingDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(booking);
      return acc;
    }, {});
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" color={color}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  // Calculate chart data
  const revenueData = getRevenueData(allBookings, revenuePeriod);
  const bookingTrendsData = getBookingTrends(allBookings, trendsPeriod);
  const revenueByActivity = getRevenueByActivity(allBookings);
  const topCustomers = getTopCustomers(allBookings, customers, 5);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('dashboard.title')}
      </Typography>
      {/* Scope is controlled by top AppBar: Dashboard (global) vs selected location */}
      {tabScope === 'all' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>{t('dashboard.perLocationOverview')}</Typography>
          <Grid container spacing={2}>
            {locations.map((loc) => {
              const locBookings = allBookingsGlobal.filter(b => b.locationId === loc.id);
              const locTodayStr = new Date().toISOString().slice(0,10);
              const locTodays = locBookings.filter(b => b.bookingDate === locTodayStr);
              const locRevenue = locBookings.reduce((s,b)=> s + (b.totalPrice || 0), 0);
              const locTodaysRevenue = locTodays.reduce((s,b)=> s + (b.totalPrice || 0), 0);
              return (
                <Grid item xs={12} md={6} key={loc.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>{loc.name}</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <StatCard title={t('dashboard.totalBookings')} value={locBookings.length} icon={<TrendingUpIcon />} color={'info'} />
                        </Grid>
                        <Grid item xs={6}>
                          <StatCard title={t('dashboard.totalRevenue')} value={`€${locRevenue.toFixed(2)}`} icon={<EuroIcon />} color={'warning'} />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('dashboard.todayBookings')} 
            value={stats.todaysBookings}
            icon={<EventIcon />}
            color="primary"
          />
        </Grid>
        {isAdmin() && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.todayRevenue')} 
              value={`€${stats.todaysRevenue.toFixed(2)}`}
              icon={<EuroIcon />}
              color="success"
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('dashboard.totalBookings')} 
            value={stats.totalBookings}
            icon={<TrendingUpIcon />}
            color="info"
          />
        </Grid>
        {isAdmin() && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard 
              title={t('dashboard.totalRevenue')} 
              value={`€${stats.totalRevenue.toFixed(2)}`}
              icon={<EuroIcon />}
              color="warning"
            />
          </Grid>
        )}

        {/* Revenue Chart - Admin only */}
        {isAdmin() && (
          <Grid item xs={12} md={8}>
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'background.paper' }}>
                  <Select
                    value={revenuePeriod}
                    onChange={(e) => setRevenuePeriod(e.target.value)}
                  >
                    <MenuItem value={7}>{t('dashboard.last7Days')}</MenuItem>
                    <MenuItem value={14}>{t('dashboard.last14Days')}</MenuItem>
                    <MenuItem value={30}>{t('dashboard.last30Days')}</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <RevenueChart data={revenueData} title={t('dashboard.revenueTrendDays').replace('{n}', revenuePeriod)} />
            </Box>
          </Grid>
        )}

        {/* Revenue by Activity - Admin only */}
        {isAdmin() && (
          <Grid item xs={12} md={4}>
            <RevenueByActivityChart data={revenueByActivity} />
          </Grid>
        )}

        {/* Booking Trends */}
        <Grid item xs={12} md={isAdmin() ? 8 : 12}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120, bgcolor: 'background.paper' }}>
                <Select
                  value={trendsPeriod}
                  onChange={(e) => setTrendsPeriod(e.target.value)}
                >
                  <MenuItem value={7}>{t('dashboard.last7Days')}</MenuItem>
                  <MenuItem value={14}>{t('dashboard.last14Days')}</MenuItem>
                  <MenuItem value={30}>{t('dashboard.last30Days')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <BookingTrendsChart data={bookingTrendsData} title={t('dashboard.bookingTrendsDays').replace('{n}', trendsPeriod)} />
          </Box>
        </Grid>

        {/* Top Customers - Admin only (contains financial info) */}
        {isAdmin() && (
          <Grid item xs={12} md={4}>
            <TopCustomersList customers={topCustomers} />
          </Grid>
        )}
        
        {/* Upcoming Bookings Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6">
                  {t('dashboard.upcomingBookings')} ({t('dashboard.nextDays').replace('{n}', daysToShow)})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.showingBookingsFrom')} {new Date(Date.now() + daysToShow * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant={viewMode === 'list' ? 'contained' : 'outlined'}
                  startIcon={<BarChartIcon />}
                  onClick={() => setViewMode('list')}
                  size="small"
                >
                  {t('dashboard.list')}
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'contained' : 'outlined'}
                  startIcon={<CalendarIcon />}
                  onClick={() => setViewMode('calendar')}
                  size="small"
                >
                  {t('dashboard.calendar')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDaysToShow(prev => Math.max(1, prev - 1))}
                  disabled={daysToShow <= 1}
                >
                  -
                </Button>
                <Typography variant="body2">{daysToShow} {t('dashboard.days')}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setDaysToShow(prev => Math.min(7, prev + 1))}
                  disabled={daysToShow >= 7}
                >
                  +
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => navigate('/bookings/new')}
                  startIcon={<EventIcon />}
                >
                  {t('dashboard.newBooking')}
                </Button>
              </Box>
            </Box>
            
            {viewMode === 'calendar' ? (
              <BookingCalendar
                bookings={upcomingBookings}
                customers={customers}
                onBookingClick={(booking) => navigate(`/bookings/${booking.id}`)}
              />
            ) : (
              <>
                {upcomingBookings.length === 0 ? (
                  <Typography color="text.secondary">
                    {t('dashboard.noUpcomingBookings').replace('{n}', daysToShow)}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Object.entries(groupBookingsByDate(upcomingBookings)).map(([date, bookings]) => (
                      <Box key={date}>
                        <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
                          {bookings.map((booking) => {
                            return (
                              <Accordion key={booking.id}>
                                <AccordionSummary
                                  expandIcon={<ExpandMoreIcon />}
                                  sx={{
                                    '&:hover': {
                                      backgroundColor: 'action.hover'
                                    }
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Typography variant="body1" fontWeight="medium">
                                        {getCustomerName(booking.customerId)}
                                      </Typography>
                                      <Chip 
                                        label={booking.status} 
                                        size="small" 
                                        color={
                                          booking.status === 'confirmed' ? 'success' :
                                          booking.status === 'pending' ? 'warning' :
                                          booking.status === 'completed' ? 'info' :
                                          booking.status === 'cancelled' ? 'error' : 'default'
                                        }
                                      />
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        {booking.activityType}
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color="primary">
                                        €{booking.totalPrice?.toFixed(2) || '0.00'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.bookingId')}:</strong> {booking.id.substring(0, 8)}...
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.date')}:</strong> {booking.bookingDate}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.activity')}:</strong> {booking.activityType}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.diveSessions')}:</strong> {
                                          booking.diveSessions ? 
                                            (booking.diveSessions.morning ? t('bookings.details.morning') : '') + 
                                            (booking.diveSessions.morning && booking.diveSessions.afternoon ? ', ' : '') +
                                            (booking.diveSessions.afternoon ? t('bookings.details.afternoon') : '') :
                                            (booking.numberOfDives || 1) + ' dives'
                                        }
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('common.status')}:</strong> {booking.status}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.paymentMethod')}:</strong> {booking.paymentMethod || 'N/A'}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        <strong>{t('bookings.details.paymentStatus')}:</strong> {booking.paymentStatus || 'pending'}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                      <Typography variant="h6" gutterBottom>
                                        €{booking.totalPrice?.toFixed(2) || '0.00'}
                                      </Typography>
                                      {booking.ownEquipment && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          <strong>{t('bookings.details.ownEquipment')}:</strong> {t('common.yes')}
                                        </Typography>
                                      )}
                                      {booking.rentedEquipment && Object.values(booking.rentedEquipment).some(v => v) && (
                                        <Box>
                                          <Typography variant="body2" color="text.secondary" gutterBottom>
                                            <strong>{t('bookings.details.rentedEquipment')}:</strong>
                                          </Typography>
                                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1 }}>
                                            {Object.entries(booking.rentedEquipment).map(([eq, rented]) => 
                                              rented && (
                                                <Chip 
                                                  key={eq} 
                                                  label={eq} 
                                                  size="small" 
                                                  variant="outlined" 
                                                />
                                              )
                                            )}
                                          </Box>
                                        </Box>
                                      )}
                                      {booking.specialRequirements && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                                          <strong>{t('bookings.details.specialRequirements')}:</strong> {booking.specialRequirements}
                                        </Typography>
                                      )}
                                      {booking.notes && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 1 }}>
                                          <strong>{t('bookings.details.notes')}:</strong> {booking.notes}
                                        </Typography>
                                      )}
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => navigate(`/bookings/${booking.id}`)}
                                      >
                                        {t('dashboard.editBooking')}
                                      </Button>
                                    </Grid>
                                  </Grid>
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
