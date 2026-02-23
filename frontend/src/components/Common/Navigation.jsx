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
  CalendarMonth as ScheduleIcon,
  LockReset as LockResetIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  AccountBalance as FinancialIcon,
  DirectionsBike as BikeIcon,
  Domain as DomainIcon
} from '@mui/icons-material';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../../utils/languageContext';
import { useAuth, USER_ROLES } from '../../utils/authContext';
import dataService from '../../services/dataService';
import ChangePasswordDialog from '../Auth/ChangePasswordDialog';
import { hasDivingFeatures } from '../../utils/locationTypes';
import { getTenantSlug } from '../../utils/tenantContext';

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
  const [orgName, setOrgName] = useState('');

  // Build menu items by scope
  const userHasGlobalAccess = !currentUser?.locationAccess || (Array.isArray(currentUser?.locationAccess) && currentUser.locationAccess.length === 0);
  // Dashboard is location-specific when a location is selected, global only when explicitly set to global
  // Superadmin defaults to global scope; when no locations, always use global
  const scope = userHasGlobalAccess
    ? (locations.length > 0 && localStorage.getItem('dcms_dashboard_scope') === 'location' ? 'location' : 'global')
    : 'location';
  const globalMenu = [
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard' },
    { text: t('nav.settings'), icon: <SettingsIcon />, path: '/settings', permission: 'settings' },
    { text: t('nav.breaches'), icon: <SecurityIcon />, path: '/breaches', permission: 'settings' },
    { text: t('nav.partners'), icon: <BusinessIcon />, path: '/partners', permission: 'settings' },
    { text: t('nav.partnerInvoices'), icon: <ReceiptIcon />, path: '/partner-invoices', permission: 'settings' },
    { text: t('nav.financial'), icon: <FinancialIcon />, path: '/financial', permission: 'settings' }
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
  
  // Get current location; use feature flags for diving vs non-diving (e.g. bike rental)
  const currentLocation = locations.find(l => l.id === currentLocationId);
  const hasDiving = !currentLocation || hasDivingFeatures(currentLocation, null);
  
  // Equipment icon: diving when no location or has diving features, else bike
  const EquipmentIcon = hasDiving ? DivingEquipmentIcon : BikeIcon;
  
  // Build location menu items - organized by workflow
  const locationMenu = [
    // Customer Service (Admin team)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.newBooking'), icon: <AddIcon />, path: '/bookings/new', permission: 'bookings', roles: [USER_ROLES.ADMIN] },
        { text: t('nav.stays') || 'Current Customers', icon: <StaysIcon />, path: '/stays', permission: 'stays', roles: [USER_ROLES.ADMIN] },
        { text: t('nav.financial'), icon: <FinancialIcon />, path: '/financial', permission: 'settings', roles: [USER_ROLES.ADMIN] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.ADMIN] },
    
    // Equipment & Operations (Owners, Trainers)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.schedule'), icon: <ScheduleIcon />, path: '/schedule', permission: 'boatPrep', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.dive'), icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.BOAT_PILOT, USER_ROLES.TRAINER] },
    
    // Dive Operations (Guides)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.schedule'), icon: <ScheduleIcon />, path: '/schedule', permission: 'boatPrep', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.dive'), icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.GUIDE] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.GUIDE] },
    
    // Assist Mode (Trainees/Interns)
    { text: t('nav.dashboard'), icon: <DashboardIcon />, path: '/', permission: 'dashboard', roles: [USER_ROLES.INTERN] },
    { text: t('nav.schedule'), icon: <ScheduleIcon />, path: '/schedule', permission: 'boatPrep', roles: [USER_ROLES.INTERN] },
    { text: t('nav.dive'), icon: <BoatPrepIcon />, path: '/boat-prep', permission: 'boatPrep', roles: [USER_ROLES.INTERN] },
    { text: t('nav.equipment'), icon: <EquipmentIcon />, path: '/equipment', permission: 'equipment', roles: [USER_ROLES.INTERN] },
    { text: t('nav.customers'), icon: <CustomersIcon />, path: '/customers', permission: 'customers', roles: [USER_ROLES.INTERN] },
    { text: t('nav.bookings'), icon: <BookingsIcon />, path: '/bookings', permission: 'bookings', roles: [USER_ROLES.INTERN] }
  ];

  // Diving-specific paths hidden when location has no diving features (e.g. bike rental)
  const divingOnlyPaths = ['/schedule', '/boat-prep', '/stays'];
  
  // Filter menu items based on role and permissions
  const allMenuItems = scope === 'global' ? globalMenu : locationMenu;
  const menuItems = allMenuItems.filter(item => {
    if (!currentUser) return false;
    
    if (currentLocation && !hasDivingFeatures(currentLocation, null) && divingOnlyPaths.includes(item.path)) {
      return false;
    }
    
    // Check permission - this now uses the permission-based system
    return canAccess(item.permission);
  });
  
  // Remove duplicates (same path) - keep first occurrence, prioritizing by role order
  let uniqueMenuItems = menuItems.filter((item, index, self) => 
    index === self.findIndex(t => t.path === item.path)
  );

  // Superadmin: Tenant Management (create/configure tenants). Operational settings are per-tenant.
  if (currentUser?.role === USER_ROLES.SUPERADMIN) {
    const superadminItems = [
      { text: 'Tenant Management', icon: <DomainIcon />, path: '/settings', permission: 'settings' },
    ];
    superadminItems.forEach(item => {
      if (!uniqueMenuItems.some(m => m.path === item.path)) {
        uniqueMenuItems = [...uniqueMenuItems, item];
      }
    });
  }

  // Load locations and initialize selected location
  React.useEffect(() => {
    const loadLocations = async () => {
      try {
        const allLocations = await dataService.getAll('locations') || [];
        if (!Array.isArray(allLocations)) return;
        
        // Determine accessible locations based on user rights
        let accessible = allLocations;
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

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const all = await dataService.getAll('settings') || [];
        const s = Array.isArray(all) && all.length > 0 ? all[0] : null;
        setOrgName(s?.organisation?.name || '');
      } catch (e) {
        console.warn('[Navigation] Error loading settings:', e);
      }
    };
    loadSettings();
  }, []);

  const selectLocation = (newLocationId) => {
    if (!newLocationId) return;
    setSelectedLocationId(newLocationId);
    localStorage.setItem('dcms_current_location', newLocationId);
    localStorage.setItem('dcms_dashboard_scope', 'location');
    // Navigate to dashboard when location changes
    navigate('/');
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
            DCMS - {currentUser?.role === USER_ROLES.SUPERADMIN && !getTenantSlug() ? 'Platform Admin' : (orgName || 'Dive Center')}
          </Typography>
          {/* Dashboard shortcut before location tabs - show Global tab for superadmin even when no locations */}
          {currentUser && (locations.length > 0 || (currentUser.role === USER_ROLES.SUPERADMIN && userHasGlobalAccess)) && (
            <Tabs
              value={localStorage.getItem('dcms_dashboard_scope') === 'location' && selectedLocationId ? selectedLocationId : '__global__'}
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
              {userHasGlobalAccess && (
                <Tab key="__global__" value="__global__" label={t('nav.global') || 'Global'} sx={{ minHeight: 48 }} />
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
                {currentUser.role === USER_ROLES.SUPERADMIN && (
                  <MenuItem onClick={() => { navigate('/settings'); handleUserMenuClose(); }}>
                    <ListItemIcon>
                      <DomainIcon fontSize="small" />
                    </ListItemIcon>
                    Tenant Management
                  </MenuItem>
                )}
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
          {/* Logo/Icon section - Diving icon when location has diving features, else bike */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
            {hasDiving ? (
              <DivingEquipmentIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            ) : (
              <BikeIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            )}
          </Box>
          <List>
            {uniqueMenuItems.map((item) => (
              <ListItem 
                button 
                key={`${item.text}-${item.state?.tab || ''}`}
                selected={
                  (location.pathname === item.path && (!item.state?.tab || location.state?.tab === item.state.tab))
                  || (item.path === '/bookings' && (location.pathname.startsWith('/bookings/new') || (location.pathname.startsWith('/bookings/') && location.pathname !== '/bookings')))
                }
                onClick={() => navigate(item.path, item.state ? { state: item.state } : {})}
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
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              DCMS v1.6.6
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
