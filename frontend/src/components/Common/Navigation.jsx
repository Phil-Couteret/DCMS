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
  MenuItem
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
  Receipt as StaysIcon
} from '@mui/icons-material';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth, USER_ROLES } from '../../utils/authContext';

const drawerWidth = 240;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, canAccess } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);

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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            DCMS - Deep Blue Diving
          </Typography>
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
