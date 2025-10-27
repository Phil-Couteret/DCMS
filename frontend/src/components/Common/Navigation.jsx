import React from 'react';
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
  Divider 
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as BookingsIcon,
  People as CustomersIcon,
  ScubaDiving as EquipmentIcon,
  Settings as SettingsIcon,
  Add as AddIcon
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Bookings', icon: <BookingsIcon />, path: '/bookings' },
  { text: 'New Booking', icon: <AddIcon />, path: '/bookings/new' },
  { text: 'Customers', icon: <CustomersIcon />, path: '/customers' },
  { text: 'Equipment', icon: <EquipmentIcon />, path: '/equipment' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
];

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            DCMS - Deep Blue Diving
          </Typography>
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
                selected={location.pathname === item.path}
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

