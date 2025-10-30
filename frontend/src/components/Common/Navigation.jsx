import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Box,
  Divider,
  Chip,
  Menu,
  MenuItem,
  Tabs,
  Tab
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as BookingsIcon,
  People as CustomersIcon,
  ScubaDiving as EquipmentIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Receipt as StaysIcon,
  AttachMoney as PricesIcon
} from '@mui/icons-material';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth, USER_ROLES } from '../../utils/authContext';
import dataService from '../../services/dataService';

const drawerWidth = 240;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, canAccess } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Define menu items with required permissions
  const allMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', permission: 'dashboard' },
    { text: 'Bookings', icon: <BookingsIcon />, path: '/bookings', permission: 'bookings' },
    { text: 'New Booking', icon: <AddIcon />, path: '/bookings/new', permission: 'bookings' },
    { text: 'Customer Stays', icon: <StaysIcon />, path: '/stays', permission: 'bookings' },
    { text: 'Customers', icon: <CustomersIcon />, path: '/customers', permission: 'customers' },
    { text: 'Equipment', icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', permission: 'settings' }
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => 
    currentUser && canAccess(item.permission)
  );

  // Load locations and initialize selected location
  React.useEffect(() => {
    try {
      const allLocations = dataService.getAll('locations') || [];
      // Determine accessible locations based on user rights
      let accessible = allLocations;
      if (currentUser && Array.isArray(currentUser.locationAccess)) {
        // Treat empty array as global access (all locations)
        if (currentUser.locationAccess.length > 0) {
          accessible = allLocations.filter(loc => currentUser.locationAccess.includes(loc.id));
        }
      }
      setLocations(accessible);

      // Initialize selected location from localStorage or default to first accessible
      const stored = localStorage.getItem('dcms_current_location');
      const existsInAccessible = accessible.find(l => l.id === stored);
      const initial = existsInAccessible ? existsInAccessible.id : (accessible[0]?.id || null);
      setSelectedLocationId(initial);
      if (initial) {
        localStorage.setItem('dcms_current_location', initial);
      }
    } catch (e) {
      // noop
    }
  }, [currentUser]);

  const handleLocationChange = (_e, newLocationId) => {
    setSelectedLocationId(newLocationId);
    if (newLocationId) {
      localStorage.setItem('dcms_current_location', newLocationId);
    }
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    window.location.href = '/'; // Force reload to show login screen
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ mr: 3 }}>
            DCMS - Deep Blue Diving
          </Typography>
          {/* Location Tabs (visible when user is logged in) */}
          {currentUser && locations.length > 0 && (
            <Tabs
              value={selectedLocationId}
              onChange={handleLocationChange}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{ flexGrow: 1, minHeight: 48 }}
           >
              {locations.map(loc => (
                <Tab key={loc.id} value={loc.id} label={loc.name} sx={{ minHeight: 48 }} />
              ))}
            </Tabs>
          )}
          <LanguageSwitcher />
          {currentUser && (
            <>
              <Chip
                icon={<PersonIcon />}
                label={currentUser.name}
                color={
                  currentUser.role === USER_ROLES.ADMIN ? 'primary' :
                  currentUser.role === USER_ROLES.BOAT_PILOT ? 'info' :
                  currentUser.role === USER_ROLES.GUIDE ? 'secondary' :
                  currentUser.role === USER_ROLES.TRAINER ? 'success' :
                  currentUser.role === USER_ROLES.INTERN ? 'warning' :
                  'default'
                }
                onClick={handleUserMenuOpen}
                sx={{ ml: 2, cursor: 'pointer' }}
              />
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">
                    {currentUser.name} ({currentUser.role})
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text}
                selected={location.pathname === item.path || (item.path === '/bookings' && (location.pathname.startsWith('/bookings/new') || (location.pathname.startsWith('/bookings/') && location.pathname !== '/bookings')))}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              PWA Prototype v0.1
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Navigation;
