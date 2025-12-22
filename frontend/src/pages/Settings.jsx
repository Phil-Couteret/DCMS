import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  ListItemText,
  InputAdornment,
  FormLabel,
  FormGroup
} from '@mui/material';
import { 
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as VerifiedUserIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  DirectionsBoat as BoatIcon,
  PersonPin as GuideIcon,
  School as TrainerIcon,
  Work as InternIcon,
  AttachMoney as PricesIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import dataService from '../services/dataService';
import { useAuth, USER_ROLES, AVAILABLE_PERMISSIONS, ALL_PERMISSIONS } from '../utils/authContext';
import Prices from '../components/Settings/Prices';
import { useTranslation } from '../utils/languageContext';

const Settings = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    certificationUrls: {
      SSI: 'https://www.divessi.com/en/verify-certification',
      PADI: 'https://www.padi.com/verify',
      CMAS: 'https://www.cmas.org/certification-verification',
      VDST: 'https://www.vdst.de/zertifikatspruefung'
    }
  });
  const [settingsId, setSettingsId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // User Management state
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLES.ADMIN, // Default role (kept for backward compatibility)
    permissions: [], // Array of permission keys
    isActive: true,
    locationAccess: [] // Array of location IDs
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Dive Sites Management state
  const [diveSites, setDiveSites] = useState([]);
  const [diveSiteDialogOpen, setDiveSiteDialogOpen] = useState(false);
  const [editingDiveSite, setEditingDiveSite] = useState(null);
  const [diveSiteFormData, setDiveSiteFormData] = useState({
    name: '',
    locationId: '',
    type: 'diving',
    depthRange: { min: 0, max: 0 },
    difficultyLevel: 'beginner',
    current: '',
    waves: '',
    travelTime: '',
    description: '',
    isActive: true
  });
  
  // Boats Management state
  const [boats, setBoats] = useState([]);
  const [boatDialogOpen, setBoatDialogOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState(null);
  const [boatFormData, setBoatFormData] = useState({
    name: '',
    locationId: '',
    capacity: 10,
    equipmentOnboard: [],
    isActive: true
  });
  
  const EQUIPMENT_OPTIONS = [
    'oxygen',
    'first_aid',
    'radio',
    'mobile_phone',
    'gps',
    'life_jackets',
    'flares',
    'dive_ladder',
    'anchor',
    'compass'
  ];

  useEffect(() => {
    loadSettings();
    if (isAdmin()) {
      loadUsers();
      loadLocations();
      loadDiveSites();
      loadBoats();
    }
  }, [isAdmin]);
  
  const loadDiveSites = () => {
    try {
      const allDiveSites = dataService.getAll('diveSites') || [];
      setDiveSites(allDiveSites);
    } catch (error) {
      console.error('Error loading dive sites:', error);
      setDiveSites([]);
    }
  };
  
  const loadBoats = () => {
    try {
      const allBoats = dataService.getAll('boats') || [];
      setBoats(allBoats);
    } catch (error) {
      console.error('Error loading boats:', error);
      setBoats([]);
    }
  };


  const loadSettings = () => {
    try {
      const savedSettings = dataService.getAll('settings');
      if (savedSettings.length > 0) {
        setSettings(savedSettings[0]);
        setSettingsId(savedSettings[0].id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleUrlChange = (agency, url) => {
    setSettings(prev => ({
      ...prev,
      certificationUrls: {
        ...prev.certificationUrls,
        [agency]: url
      }
    }));
  };

  const handleSave = () => {
    try {
      if (settingsId) {
        // Update existing settings
        dataService.update('settings', settingsId, settings);
      } else {
        // Create new settings if none exist
        const newSettings = dataService.create('settings', settings);
        setSettingsId(newSettings.id);
      }
      setSnackbar({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message: 'Error saving settings',
        severity: 'error'
      });
    }
  };

  const handleTestUrl = (agency, url) => {
    if (url) {
      const popup = window.open(
        url,
        'certification-verification',
        'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setSnackbar({
          open: true,
          message: 'Popup blocked. Please allow popups for this site.',
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: `${agency} verification URL opened successfully`,
          severity: 'success'
        });
      }
    } else {
      setSnackbar({
        open: true,
        message: 'Please enter a URL first',
        severity: 'warning'
      });
    }
  };

  // User Management functions
  const loadUsers = () => {
    try {
      const allUsers = dataService.getAll('users');
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadLocations = () => {
    try {
      const allLocations = dataService.getAll('locations');
      setLocations(allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: USER_ROLES.ADMIN,
      permissions: [],
      isActive: true,
      locationAccess: []
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    const locationAccess = (user.locationAccess || []).length === 0 ? ['__ALL__'] : user.locationAccess;
    setUserFormData({
      username: user.username,
      name: user.name,
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role || USER_ROLES.ADMIN,
      permissions: user.permissions || [],
      isActive: user.isActive,
      locationAccess: locationAccess
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    try {
      // Validate password fields
      if (!editingUser) {
        // New user: password is required
        if (!userFormData.password || userFormData.password.trim() === '') {
          setSnackbar({
            open: true,
            message: 'Password is required for new users',
            severity: 'error'
          });
          return;
        }
      }
      
      // If password is provided (for new or existing user), validate it
      if (userFormData.password && userFormData.password.trim() !== '') {
        if (userFormData.password.length < 6) {
          setSnackbar({
            open: true,
            message: 'Password must be at least 6 characters long',
            severity: 'error'
          });
          return;
        }
        
        if (userFormData.password !== userFormData.confirmPassword) {
          setSnackbar({
            open: true,
            message: 'Passwords do not match',
            severity: 'error'
          });
          return;
        }
      }

      // Convert "__ALL__" selection to empty array for global access
      const locationAccess = userFormData.locationAccess.includes('__ALL__') 
        ? [] 
        : userFormData.locationAccess;
      
      // Prepare user data (exclude confirmPassword)
      const { confirmPassword, ...userDataWithoutConfirm } = userFormData;
      
      const userData = {
        ...userDataWithoutConfirm,
        locationAccess: locationAccess
      };

      // Only include password if it was provided
      if (userFormData.password && userFormData.password.trim() !== '') {
        userData.password = userFormData.password;
      } else if (editingUser) {
        // For existing users, if password is not provided, keep the existing one
        const existingUser = users.find(u => u.id === editingUser.id);
        if (existingUser && existingUser.password) {
          userData.password = existingUser.password;
        }
      }

      if (editingUser) {
        // Update existing user
        dataService.update('users', editingUser.id, {
          ...userData,
          updatedAt: new Date().toISOString()
        });
        setSnackbar({
          open: true,
          message: 'User updated successfully!',
          severity: 'success'
        });
      } else {
        // Create new user
        dataService.create('users', {
          ...userData,
          createdAt: new Date().toISOString()
        });
        setSnackbar({
          open: true,
          message: 'User created successfully!',
          severity: 'success'
        });
      }
      setUserDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setSnackbar({
        open: true,
        message: 'Error saving user',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        // Prevent deleting the last admin or superadmin
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete) {
          if (userToDelete.role === USER_ROLES.SUPERADMIN) {
            const superadminCount = users.filter(u => u.role === USER_ROLES.SUPERADMIN).length;
            if (superadminCount <= 1) {
              setSnackbar({
                open: true,
                message: 'Cannot delete the last superadmin user',
                severity: 'error'
              });
              return;
            }
          } else if (userToDelete.role === USER_ROLES.ADMIN) {
            const adminCount = users.filter(u => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPERADMIN).length;
            if (adminCount <= 1) {
              setSnackbar({
                open: true,
                message: 'Cannot delete the last admin user',
                severity: 'error'
              });
              return;
            }
          }
        }

        dataService.remove('users', userId);
        setSnackbar({
          open: true,
          message: 'User deleted successfully!',
          severity: 'success'
        });
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setSnackbar({
          open: true,
          message: 'Error deleting user',
          severity: 'error'
        });
      }
    }
  };

  // Helper functions for role display
  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return <VerifiedUserIcon />;
      case USER_ROLES.ADMIN:
        return <AdminIcon />;
      case USER_ROLES.BOAT_PILOT:
        return <BoatIcon />;
      case USER_ROLES.GUIDE:
        return <GuideIcon />;
      case USER_ROLES.TRAINER:
        return <TrainerIcon />;
      case USER_ROLES.INTERN:
        return <InternIcon />;
      default:
        return null;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return 'error'; // Red/prominent color for superadmin
      case USER_ROLES.ADMIN:
        return 'primary';
      case USER_ROLES.BOAT_PILOT:
        return 'info';
      case USER_ROLES.GUIDE:
        return 'secondary';
      case USER_ROLES.TRAINER:
        return 'success';
      case USER_ROLES.INTERN:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return 'Superadmin';
      case USER_ROLES.ADMIN:
        return 'Admin';
      case USER_ROLES.BOAT_PILOT:
        return 'Boat Pilot';
      case USER_ROLES.GUIDE:
        return 'Guide';
      case USER_ROLES.TRAINER:
        return 'Trainer';
      case USER_ROLES.INTERN:
        return 'Intern';
      default:
        return 'User';
    }
  };

  return (
    <>
      {/* User Dialog - moved outside main container */}
      <Dialog 
        open={userDialogOpen} 
        onClose={() => setUserDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        keepMounted
        sx={{ zIndex: 1300 }}
        PaperProps={{ sx: { zIndex: 1300 } }}
      >
        <DialogTitle>
          {editingUser ? (t('settings.users.editTitle') || 'Edit User') : (t('settings.users.addTitle') || 'Add New User')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('settings.users.username') || 'Username'}
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('settings.users.fullName') || 'Full Name'}
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={'Email'}
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                type={showPassword ? 'text' : 'password'}
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                required={!editingUser}
                helperText={editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            {(!editingUser || userFormData.password) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={userFormData.confirmPassword}
                  onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                  required={!editingUser || userFormData.password !== ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            )}
            {/* Only show role for superadmin (cannot be changed) */}
            {userFormData.role === USER_ROLES.SUPERADMIN && (
              <Grid item xs={12}>
                <Alert severity="info">
                  This is a Superadmin account with full access to all features.
                </Alert>
              </Grid>
            )}
            
            {/* Permissions Selection - Only for non-superadmin users */}
            {userFormData.role !== USER_ROLES.SUPERADMIN && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                  {t('settings.users.permissions') || 'Permissions'}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Select the features this user can access. You can grant access from "almost everything" to "only boat preparation" and all options in between.
                </Typography>
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Grid container spacing={2}>
                    {ALL_PERMISSIONS.map((permission) => (
                      <Grid item xs={12} sm={6} md={4} key={permission}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={userFormData.permissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserFormData({
                                    ...userFormData,
                                    permissions: [...userFormData.permissions, permission]
                                  });
                                } else {
                                  setUserFormData({
                                    ...userFormData,
                                    permissions: userFormData.permissions.filter(p => p !== permission)
                                  });
                                }
                              }}
                            />
                          }
                          label={AVAILABLE_PERMISSIONS[permission]}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  {userFormData.permissions.length === 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      No permissions selected. This user will not be able to access any features.
                    </Alert>
                  )}
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>{t('settings.users.locationAccess') || 'Location Access'}</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={userFormData.locationAccess.includes('__ALL__')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserFormData({ ...userFormData, locationAccess: ['__ALL__'] });
                      } else {
                        setUserFormData({ ...userFormData, locationAccess: [] });
                      }
                    }}
                  />
                }
                label={t('settings.users.allLocations') || 'All Locations (Global Access)'}
              />
              {!userFormData.locationAccess.includes('__ALL__') && locations.map((location) => (
                <FormControlLabel
                  key={location.id}
                  control={
                    <Checkbox
                      checked={userFormData.locationAccess.includes(location.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserFormData({ 
                            ...userFormData, 
                            locationAccess: [...userFormData.locationAccess, location.id] 
                          });
                        } else {
                          setUserFormData({ 
                            ...userFormData, 
                            locationAccess: userFormData.locationAccess.filter(id => id !== location.id) 
                          });
                        }
                      }}
                    />
                  }
                  label={location.name}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {userFormData.locationAccess.length === 0 
                  ? (t('settings.users.locationHint') || 'Select locations or choose "All Locations" for global access')
                  : userFormData.locationAccess.includes('__ALL__')
                    ? (t('settings.users.globalAccess') || 'Global access to all current and future locations')
                    : `${t('settings.users.accessTo') || 'Access to'} ${userFormData.locationAccess.length} ${t('settings.users.locations') || 'locations'}`
                }
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                  />
                }
                label={t('settings.users.active') || 'Active'}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleSaveUser} 
            variant="contained" 
            disabled={!userFormData.username || !userFormData.name || (!editingUser && !userFormData.password)}
          >
            {editingUser ? (t('common.update') || 'Update') : (t('settings.users.create') || 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('settings.title') || 'Settings'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.subtitle') || 'Configure system settings and preferences'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<PricesIcon />} 
            label={t('settings.tabs.prices') || 'Prices'} 
            iconPosition="start"
          />
          <Tab 
            icon={<LocationIcon />} 
            label="Dive Sites" 
            iconPosition="start"
          />
          <Tab 
            icon={<BoatIcon />} 
            label="Boats" 
            iconPosition="start"
          />
          <Tab 
            icon={<PeopleIcon />} 
            label={t('settings.tabs.users') || 'User Management'} 
            iconPosition="start"
          />
          <Tab 
            icon={<VerifiedUserIcon />} 
            label={t('settings.tabs.certification') || 'Certification Verification'} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          {/* Prices Settings */}
          <Prices />
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Dive Sites Management */}
          {isAdmin() && (
            <>
              <Accordion defaultExpanded sx={{ mb: 3 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:before': { display: 'none' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <LocationIcon color="primary" />
                    <Box>
                      <Typography variant="h6">Dive Sites</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure dive sites, difficulty levels, and site information
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Manage all dive sites for each location. Configure difficulty levels, depth ranges, and site descriptions.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingDiveSite(null);
                          setDiveSiteFormData({
                            name: '',
                            locationId: locations.length > 0 ? locations[0].id : '',
                            type: 'diving',
                            depthRange: { min: 0, max: 0 },
                            difficultyLevel: 'beginner',
                            current: '',
                            waves: '',
                            travelTime: '',
                            description: '',
                            isActive: true
                          });
                          setDiveSiteDialogOpen(true);
                        }}
                      >
                        Add Dive Site
                      </Button>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Depth Range</TableCell>
                            <TableCell>Difficulty Level</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {diveSites.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} align="center">
                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                  No dive sites found. Click "Add Dive Site" to create one.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            diveSites.map((site) => {
                              const location = locations.find(l => l.id === site.locationId);
                              // Handle both difficultyLevel and difficulty fields (for backward compatibility)
                              const difficulty = site.difficultyLevel || site.difficulty || 'beginner';
                              // Handle both depthRange object and depth string
                              const depthRange = site.depthRange || (site.depth ? { min: 0, max: 0 } : { min: 0, max: 0 });
                              const depthDisplay = depthRange.min && depthRange.max 
                                ? `${depthRange.min}-${depthRange.max}m`
                                : site.depth || 'N/A';
                              
                              return (
                                <TableRow key={site.id}>
                                  <TableCell>{site.name}</TableCell>
                                  <TableCell>{location?.name || 'Unknown'}</TableCell>
                                  <TableCell>{site.type || 'diving'}</TableCell>
                                  <TableCell>{depthDisplay}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={difficulty} 
                                      size="small"
                                      color={
                                        difficulty === 'beginner' ? 'success' :
                                        difficulty === 'intermediate' ? 'info' :
                                        difficulty === 'advanced' ? 'warning' :
                                        'error'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={site.isActive !== false ? 'Active' : 'Inactive'} 
                                      size="small"
                                      color={site.isActive !== false ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingDiveSite(site);
                                        setDiveSiteFormData({
                                          name: site.name || '',
                                          locationId: site.locationId || (locations.length > 0 ? locations[0].id : ''),
                                          type: site.type || 'diving',
                                          depthRange: site.depthRange || (site.depth ? { min: 0, max: 0 } : { min: 0, max: 0 }),
                                          difficultyLevel: difficulty,
                                          current: site.current || '',
                                          waves: site.waves || '',
                                          travelTime: site.travelTime || '',
                                          description: site.description || '',
                                          isActive: site.isActive !== false
                                        });
                                        setDiveSiteDialogOpen(true);
                                      }}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${site.name}"?`)) {
                                          dataService.remove('diveSites', site.id);
                                          loadDiveSites();
                                          setSnackbar({
                                            open: true,
                                            message: 'Dive site deleted successfully!',
                                            severity: 'success'
                                          });
                                        }
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Dive Site Dialog */}
              <Dialog 
                open={diveSiteDialogOpen} 
                onClose={() => setDiveSiteDialogOpen(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>
                  {editingDiveSite ? 'Edit Dive Site' : 'Add Dive Site'}
                </DialogTitle>
                <DialogContent>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Dive Site Name"
                        value={diveSiteFormData.name}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, name: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Location</InputLabel>
                        <Select
                          value={diveSiteFormData.locationId}
                          onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, locationId: e.target.value })}
                          label="Location"
                        >
                          {locations.map((location) => (
                            <MenuItem key={location.id} value={location.id}>
                              {location.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={diveSiteFormData.type}
                          onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, type: e.target.value })}
                          label="Type"
                        >
                          <MenuItem value="diving">Diving</MenuItem>
                          <MenuItem value="beach">Beach</MenuItem>
                          <MenuItem value="cave">Cave</MenuItem>
                          <MenuItem value="reef">Reef</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Difficulty Level</InputLabel>
                        <Select
                          value={diveSiteFormData.difficultyLevel}
                          onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, difficultyLevel: e.target.value })}
                          label="Difficulty Level"
                        >
                          <MenuItem value="beginner">Beginner</MenuItem>
                          <MenuItem value="intermediate">Intermediate</MenuItem>
                          <MenuItem value="advanced">Advanced</MenuItem>
                          <MenuItem value="expert">Expert</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Min Depth (meters)"
                        type="number"
                        value={diveSiteFormData.depthRange.min}
                        onChange={(e) => setDiveSiteFormData({
                          ...diveSiteFormData,
                          depthRange: { ...diveSiteFormData.depthRange, min: parseInt(e.target.value) || 0 }
                        })}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Max Depth (meters)"
                        type="number"
                        value={diveSiteFormData.depthRange.max}
                        onChange={(e) => setDiveSiteFormData({
                          ...diveSiteFormData,
                          depthRange: { ...diveSiteFormData.depthRange, max: parseInt(e.target.value) || 0 }
                        })}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Current"
                        value={diveSiteFormData.current}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, current: e.target.value })}
                        placeholder="e.g., little-medium, moderate, strong"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Waves"
                        value={diveSiteFormData.waves}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, waves: e.target.value })}
                        placeholder="e.g., protected, unprotected, low, medium"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Travel Time"
                        value={diveSiteFormData.travelTime}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, travelTime: e.target.value })}
                        placeholder="e.g., 5-10 min, 15-20 min"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={diveSiteFormData.isActive}
                            onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, isActive: e.target.checked })}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={4}
                        value={diveSiteFormData.description}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, description: e.target.value })}
                        placeholder="Describe the dive site, marine life, points of interest..."
                      />
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDiveSiteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => {
                      if (!diveSiteFormData.name || !diveSiteFormData.locationId) {
                        setSnackbar({
                          open: true,
                          message: 'Please fill in all required fields',
                          severity: 'error'
                        });
                        return;
                      }
                      
                      const diveSiteData = {
                        ...diveSiteFormData,
                        updatedAt: new Date().toISOString()
                      };
                      
                      if (editingDiveSite) {
                        dataService.update('diveSites', editingDiveSite.id, diveSiteData);
                        setSnackbar({
                          open: true,
                          message: 'Dive site updated successfully!',
                          severity: 'success'
                        });
                      } else {
                        diveSiteData.createdAt = new Date().toISOString();
                        dataService.create('diveSites', diveSiteData);
                        setSnackbar({
                          open: true,
                          message: 'Dive site created successfully!',
                          severity: 'success'
                        });
                      }
                      
                      setDiveSiteDialogOpen(false);
                      loadDiveSites();
                    }}
                  >
                    Save
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}

          {!isAdmin() && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You don't have permission to manage dive sites. Only administrators can access this section.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Boats Management */}
          {isAdmin() && (
            <>
              <Accordion defaultExpanded sx={{ mb: 3 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    '&:before': { display: 'none' }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <BoatIcon color="primary" />
                    <Box>
                      <Typography variant="h6">Boats</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Configure boats, capacity, and onboard equipment
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ pt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Manage all boats for each location. Configure capacity and onboard equipment.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setEditingBoat(null);
                          setBoatFormData({
                            name: '',
                            locationId: locations.length > 0 ? locations[0].id : '',
                            capacity: 10,
                            equipmentOnboard: [],
                            isActive: true
                          });
                          setBoatDialogOpen(true);
                        }}
                      >
                        Add Boat
                      </Button>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Capacity</TableCell>
                            <TableCell>Equipment</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {boats.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} align="center">
                                <Typography color="text.secondary" sx={{ py: 2 }}>
                                  No boats found. Click "Add Boat" to create one.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            boats.map((boat) => {
                              const location = locations.find(l => l.id === boat.locationId);
                              
                              return (
                                <TableRow key={boat.id}>
                                  <TableCell>{boat.name}</TableCell>
                                  <TableCell>{location?.name || 'Unknown'}</TableCell>
                                  <TableCell>{boat.capacity || 0}</TableCell>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {(boat.equipmentOnboard || []).slice(0, 3).map((equipment) => (
                                        <Chip key={equipment} label={equipment.replace(/_/g, ' ')} size="small" variant="outlined" />
                                      ))}
                                      {(boat.equipmentOnboard || []).length > 3 && (
                                        <Chip label={`+${(boat.equipmentOnboard || []).length - 3} more`} size="small" variant="outlined" color="primary" />
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={boat.isActive !== false ? 'Active' : 'Inactive'} 
                                      size="small"
                                      color={boat.isActive !== false ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setEditingBoat(boat);
                                        setBoatFormData({
                                          name: boat.name || '',
                                          locationId: boat.locationId || (locations.length > 0 ? locations[0].id : ''),
                                          capacity: boat.capacity || 10,
                                          equipmentOnboard: boat.equipmentOnboard || [],
                                          isActive: boat.isActive !== false
                                        });
                                        setBoatDialogOpen(true);
                                      }}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${boat.name}"?`)) {
                                          dataService.remove('boats', boat.id);
                                          loadBoats();
                                          setSnackbar({
                                            open: true,
                                            message: 'Boat deleted successfully!',
                                            severity: 'success'
                                          });
                                        }
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Boat Dialog */}
              <Dialog 
                open={boatDialogOpen} 
                onClose={() => setBoatDialogOpen(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>
                  {editingBoat ? 'Edit Boat' : 'Add Boat'}
                </DialogTitle>
                <DialogContent>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Boat Name"
                        value={boatFormData.name}
                        onChange={(e) => setBoatFormData({ ...boatFormData, name: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Location</InputLabel>
                        <Select
                          value={boatFormData.locationId}
                          onChange={(e) => setBoatFormData({ ...boatFormData, locationId: e.target.value })}
                          label="Location"
                        >
                          {locations.map((location) => (
                            <MenuItem key={location.id} value={location.id}>
                              {location.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Capacity"
                        type="number"
                        value={boatFormData.capacity}
                        onChange={(e) => setBoatFormData({ ...boatFormData, capacity: parseInt(e.target.value) || 0 })}
                        inputProps={{ min: 1 }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={boatFormData.isActive}
                            onChange={(e) => setBoatFormData({ ...boatFormData, isActive: e.target.checked })}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormLabel component="legend">Onboard Equipment</FormLabel>
                      <FormGroup>
                        <Grid container spacing={1}>
                          {EQUIPMENT_OPTIONS.map((equipment) => (
                            <Grid item xs={12} sm={6} md={4} key={equipment}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={boatFormData.equipmentOnboard.includes(equipment)}
                                    onChange={(e) => {
                                      const newEquipment = e.target.checked
                                        ? [...boatFormData.equipmentOnboard, equipment]
                                        : boatFormData.equipmentOnboard.filter(eq => eq !== equipment);
                                      setBoatFormData({ ...boatFormData, equipmentOnboard: newEquipment });
                                    }}
                                  />
                                }
                                label={equipment.replace(/_/g, ' ')}
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </FormGroup>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setBoatDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={() => {
                      if (!boatFormData.name || !boatFormData.locationId) {
                        setSnackbar({
                          open: true,
                          message: 'Please fill in all required fields',
                          severity: 'error'
                        });
                        return;
                      }
                      
                      const boatData = {
                        ...boatFormData,
                        updatedAt: new Date().toISOString()
                      };
                      
                      if (editingBoat) {
                        dataService.update('boats', editingBoat.id, boatData);
                        setSnackbar({
                          open: true,
                          message: 'Boat updated successfully!',
                          severity: 'success'
                        });
                      } else {
                        boatData.createdAt = new Date().toISOString();
                        dataService.create('boats', boatData);
                        setSnackbar({
                          open: true,
                          message: 'Boat created successfully!',
                          severity: 'success'
                        });
                      }
                      
                      setBoatDialogOpen(false);
                      loadBoats();
                    }}
                  >
                    Save
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}

          {!isAdmin() && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                You don't have permission to manage boats. Only administrators can access this section.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 3 && (
        <Box>
          {/* User Management - Only visible to admins and superadmins */}
          {isAdmin() && (
            <Accordion defaultExpanded sx={{ mb: 3 }}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  '&:before': { display: 'none' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <PeopleIcon color="primary" />
                  <Box>
                    <Typography variant="h6">User Management</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create and manage user accounts with granular permissions
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('settings.users.manageHelp') || 'Create accounts for each person and assign granular permissions. Grant access from "almost everything" to "only boat preparation" and all options in between.'}
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddUser}
                    >
                      {t('settings.users.addUser') || 'Add User'}
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('settings.users.name') || 'Name'}</TableCell>
                          <TableCell>{t('settings.users.username') || 'Username'}</TableCell>
                          <TableCell>{'Email'}</TableCell>
                          <TableCell>{t('settings.users.permissions') || 'Permissions'}</TableCell>
                          <TableCell>{t('settings.users.status') || 'Status'}</TableCell>
                          <TableCell align="right">{t('settings.users.actions') || 'Actions'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography color="text.secondary" sx={{ py: 2 }}>
                                No users found. Click "Add User" to create one.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.username}</TableCell>
                              <TableCell>{user.email || '-'}</TableCell>
                              <TableCell>
                                {user.role === USER_ROLES.SUPERADMIN ? (
                                  <Chip
                                    icon={getRoleIcon(user.role)}
                                    label="Superadmin (Full Access)"
                                    color={getRoleColor(user.role)}
                                    size="small"
                                  />
                                ) : user.permissions && user.permissions.length > 0 ? (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {user.permissions.slice(0, 3).map((perm) => (
                                      <Chip
                                        key={perm}
                                        label={AVAILABLE_PERMISSIONS[perm]}
                                        size="small"
                                        variant="outlined"
                                      />
                                    ))}
                                    {user.permissions.length > 3 && (
                                      <Chip
                                        label={`+${user.permissions.length - 3} more`}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Chip
                                    label="No permissions"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.isActive ? (t('settings.users.active') || 'Active') : (t('settings.users.inactive') || 'Inactive')}
                                  color={user.isActive ? 'success' : 'default'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditUser(user)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteUser(user.id)}
                                  color="error"
                                  disabled={
                                    (user.role === USER_ROLES.SUPERADMIN && users.filter(u => u.role === USER_ROLES.SUPERADMIN).length === 1) ||
                                    (user.role === USER_ROLES.ADMIN && users.filter(u => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPERADMIN).length === 1) ||
                                    (user.role === USER_ROLES.SUPERADMIN && !isSuperAdmin())
                                  }
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {!isAdmin() && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                {t('settings.users.noPermission') || "You don't have permission to manage users. Only administrators can access this section."}
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 4 && (
        <Box>
          {/* Certification Verification Settings */}
          <Accordion defaultExpanded sx={{ mb: 3 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:before': { display: 'none' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <VerifiedUserIcon color="primary" />
                <Box>
                  <Typography variant="h6">{t('settings.cert.title') || 'Certification Verification'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('settings.cert.subtitle') || 'Configure verification portal URLs for certification agencies'}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
                  {t('settings.cert.description') || 'Configure the verification portal URLs for each certification agency. These URLs will be opened in popup windows when verifying customer certifications.'}
                </Typography>
                
                <Grid container spacing={3}>
                  {Object.entries(settings.certificationUrls).map(([agency, url]) => (
                    <Grid item xs={12} md={6} key={agency}>
                      <TextField
                        fullWidth
                        label={`${agency} ${t('settings.cert.verificationUrl') || 'Verification URL'}`}
                        value={url}
                        onChange={(e) => handleUrlChange(agency, e.target.value)}
                        placeholder={`${t('settings.cert.enterUrl') || 'Enter'} ${agency} ${t('settings.cert.portalUrl') || 'verification portal URL'}`}
                        variant="outlined"
                        size="small"
                      />
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleTestUrl(agency, url)}
                          disabled={!url}
                        >
                          {t('settings.cert.test') || 'Test URL'}
                        </Button>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    {t('settings.cert.save') || 'Save Certification Settings'}
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{t('settings.tip') || 'Tip'}:</strong> {t('settings.tipText') || 'Make sure the URLs are correct and accessible. You can test each URL using the "Test URL" button. If a popup is blocked, check your browser\'s popup blocker settings.'}
            </Typography>
          </Alert>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  </>
  );
};

export default Settings;

