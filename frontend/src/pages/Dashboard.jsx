import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Button
} from '@mui/material';
import { 
  Event as EventIcon,
  Euro as EuroIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBookings: 0,
    todaysBookings: 0,
    totalRevenue: 0,
    todaysRevenue: 0,
    pendingBookings: 0,
    confirmedBookings: 0
  });
  
  const [todaysBookings, setTodaysBookings] = useState([]);

  useEffect(() => {
    const loadStats = () => {
      const statistics = dataService.getStatistics();
      setStats(statistics);
      
      const bookings = dataService.getTodaysBookings();
      setTodaysBookings(bookings);
    };
    
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Today's Bookings" 
            value={stats.todaysBookings}
            icon={<EventIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Today's Revenue" 
            value={`€${stats.todaysRevenue.toFixed(2)}`}
            icon={<EuroIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Bookings" 
            value={stats.totalBookings}
            icon={<TrendingUpIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Revenue" 
            value={`€${stats.totalRevenue.toFixed(2)}`}
            icon={<EuroIcon />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Today's Bookings
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/bookings/new')}
                startIcon={<EventIcon />}
              >
                New Booking
              </Button>
            </Box>
            
            {todaysBookings.length === 0 ? (
              <Typography color="text.secondary">
                No bookings for today
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {todaysBookings.map((booking) => (
                  <Box 
                    key={booking.id}
                    sx={{ 
                      p: 2, 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body1">
                      Booking #{booking.id.substring(0, 8)} - {booking.activityType}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {booking.status} | Price: €{booking.totalPrice?.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

