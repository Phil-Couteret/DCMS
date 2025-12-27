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
  Tab,
  FormControl,
  Select
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as BookingsIcon,
  People as CustomersIcon,
  ScubaDiving as DivingEquipmentIcon,
  Inventory as MaterialsIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Receipt as StaysIcon,
  AttachMoney as PricesIcon,
  DirectionsBoat as BoatPrepIcon,
  LockReset as LockResetIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../../utils/languageContext';
import { useAuth, USER_ROLES } from '../../utils/authContext';
import dataService from '../../services/dataService';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';

const drawerWidth = 240;

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, canAccess } = useAuth();
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [boats, setBoats] = useState([]);

  // Build menu items by scope
  const userHasGlobalAccess = !currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0);
  const scope = userHasGlobalAccess
    ? (localStorage.getItem('dcms_dashboard_scope') === 'global' || location.pathname === '/' ? 'global' : 'location')
    : 'location';
  const globalMenu = [
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard' },
    { text: t('nav.settings'), icon: <SettingsIcon />, path: '/settings', permission: 'settings' },
    { text: 'Data Breaches', icon: <SecurityIcon />, path: '/breaches', permission: 'settings' },
    { text: 'Partners', icon: <BusinessIcon />, path: '/partners', permission: 'settings' },
    { text: 'Partner Invoices', icon: <ReceiptIcon />, path: '/partner-invoices', permission: 'settings' }
  ];
  // Get current location's boats to determine menu text
  const currentLocationId = selectedLocationId || localStorage.getItem('dcms_current_location');
  const boatsForLocation = React.useMemo(() => {
    if (!currentLocationId || !Array.isArray(boats)) return [];
    return boats.filter(b => {
      const boatLocationId = b.locationId || b.location_id;
      const boatIsActive = b.isActive !== undefined ? b.isActive : b.is_active;
      return boatLocationId === currentLocationId && boatIsActive;
    });
  }, [currentLocationId, boats]);
  const hasBoats = boatsForLocation.length > 0;
  
  // Get the equipment icon (diving equipment for all locations)
  const EquipmentIcon = DivingEquipmentIcon;
  
  // Build location menu items - organized by workflow
  const locationMenu = [
    // Customer Service (Admin team)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.newBooking'), icon: <AddIcon />, path: '/bookings/new', permission: 'bookings', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.stays') || 'Customer Stays', icon: <StaysIcon />, path: '/stays', permission: 'stays', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.ADMIN] },
    
    // Equipment & Operations (Owners, Trainers)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: 'Dive', icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    
    // Dive Operations (Guides)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.GUIDE] },
    { text: 'Dive', icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.GUIDE] },
    
    // Assist Mode (Trainees/Interns)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.INTERN] },
    { text: 'Dive', icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.INTERN] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.INTERN] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.INTERN] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.INTERN] }
  ];

  // Filter menu items based on role and permissions
  const allMenuItems = scope === 'global' ? globalMenu : locationMenu;
  const menuItems = allMenuItems.filter(item => {
    if (!currentUser) return false;
    
    // Check permission - this now uses the permission-based system
    return canAccess(item.permission);
  });
  
  // Remove duplicates (same path) - keep first occurrence, prioritizing by role order
  const uniqueMenuItems = menuItems.filter((item, index, self) => 
    index === self.findIndex(t => t.path === item.path)
  );

  // Load locations and initialize selected location
  React.useEffect(() => {
    const loadLocations = async () => {
      try {
        const allLocations = await dataService.getAll('locations') || [];
        if (!Array.isArray(allLocations)) return;
        
        // Determine accessible locations based on user rights
        // Filter out bike rental locations (removed for now)
        let accessible = allLocations.filter(loc => loc.type !== 'bike_rental');
        if (currentUser && Array.isArray(currentUser.locationAccess)) {
          // Treat empty array as global access (all locations)
          if (currentUser.locationAccess.length > 0) {
            accessible = accessible.filter(loc => currentUser.locationAccess.includes(loc.id));
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
        console.error('[Navigation] Error loading locations:', e);
      }
    };
    
    loadLocations();
  }, [currentUser]);

  // Load boats
  React.useEffect(() => {
    const loadBoats = async () => {
      try {
        const allBoats = await dataService.getAll('boats') || [];
        if (Array.isArray(allBoats)) {
          setBoats(allBoats);
        }
      } catch (e) {
        console.error('[Navigation] Error loading boats:', e);
      }
    };
    
    loadBoats();
  }, []);

  const selectLocation = (newLocationId) => {
    if (!newLocationId) return;
    setSelectedLocationId(newLocationId);
    localStorage.setItem('dcms_current_location', newLocationId);
    localStorage.setItem('dcms_dashboard_scope', 'location');
    if (location.pathname === '/') {
      navigate('/bookings');
    }
    try {
      window.dispatchEvent(new CustomEvent('dcms_location_changed', { detail: { locationId: newLocationId } }));
    } catch (_) {
      // ignore
    }
  };

  const handleLocationChange = (_e, newLocationId) => {
    // This will fire when the tab value changes; fallback to onClick below for same-value clicks
    selectLocation(newLocationId);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangePassword = () => {
    setShowPasswordDialog(true);
    handleUserMenuClose();
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
          {/* Dashboard shortcut before location tabs */}
          {/* Global + Location Tabs unified */}
          {currentUser && locations.length > 0 && (
            <Tabs
              value={(location.pathname === '/' && (!currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0))) ? '__global__' : selectedLocationId}
              onChange={(_e, val) => {
                if (val === '__global__') {
                  localStorage.setItem('dcms_dashboard_scope', 'global');
                  navigate('/');
                } else {
                  handleLocationChange(null, val);
                }
              }}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{ flexGrow: 1, minHeight: 48 }}
            >
              {(!currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0)) && (
                <Tab key="__global__" value="__global__" label={t('nav.global') || t('nav.dashboard')} sx={{ minHeight: 48 }} />
              )}
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
                  currentUser.role === USER_ROLES.SUPERADMIN ? 'error' :
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
                <MenuItem onClick={handleChangePassword}>
                  <ListItemIcon>
                    <LockResetIcon fontSize="small" />
                  </ListItemIcon>
                  Change Password
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
            {uniqueMenuItems.map((item) => (
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

      <ChangePasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />
    </>
  );
};

export default Navigation;
