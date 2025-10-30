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
  CardHeader
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
  AttachMoney as PricesIcon
} from '@mui/icons-material';
import dataService from '../services/dataService';
import { useAuth, USER_ROLES } from '../utils/authContext';
import Prices from '../components/Settings/Prices';

const Settings = () => {
  const { isAdmin } = useAuth();
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
    role: USER_ROLES.GUIDE,
    isActive: true,
    locationAccess: [] // Array of location IDs
  });

  useEffect(() => {
    loadSettings();
    if (isAdmin()) {
      loadUsers();
      loadLocations();
    }
  }, [isAdmin]);

  // Debug locationAccess changes
  useEffect(() => {
    console.log('userFormData.locationAccess changed:', userFormData.locationAccess);
  }, [userFormData.locationAccess]);

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
      role: USER_ROLES.GUIDE,
      isActive: true,
      locationAccess: []
    });
    setUserDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    const locationAccess = (user.locationAccess || []).length === 0 ? ['__ALL__'] : user.locationAccess;
    console.log('Editing user:', user);
    console.log('Original locationAccess:', user.locationAccess);
    console.log('Converted locationAccess:', locationAccess);
    setUserFormData({
      username: user.username,
      name: user.name,
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
      locationAccess: locationAccess
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    try {
      // Convert "__ALL__" selection to empty array for global access
      const locationAccess = userFormData.locationAccess.includes('__ALL__') 
        ? [] 
        : userFormData.locationAccess;
      
      console.log('Saving user with locationAccess:', userFormData.locationAccess);
      console.log('Converted to:', locationAccess);
      
      const userData = {
        ...userFormData,
        locationAccess: locationAccess
      };

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
        // Prevent deleting the last admin
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete && userToDelete.role === USER_ROLES.ADMIN) {
          const adminCount = users.filter(u => u.role === USER_ROLES.ADMIN).length;
          if (adminCount <= 1) {
            setSnackbar({
              open: true,
              message: 'Cannot delete the last admin user',
              severity: 'error'
            });
            return;
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
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value={USER_ROLES.ADMIN}>Admin</MenuItem>
                  <MenuItem value={USER_ROLES.BOAT_PILOT}>Boat Pilot</MenuItem>
                  <MenuItem value={USER_ROLES.GUIDE}>Guide</MenuItem>
                  <MenuItem value={USER_ROLES.TRAINER}>Trainer</MenuItem>
                  <MenuItem value={USER_ROLES.INTERN}>Intern</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Location Access</InputLabel>
                <Select
                  multiple
                  value={userFormData.locationAccess}
                  onOpen={() => console.log('Select opened')}
                  onClose={() => console.log('Select closed')}
                  onChange={(e) => {
                    const selected = e.target.value;
                    console.log('Select onChange - selected:', selected);
                    console.log('Select onChange - current userFormData.locationAccess:', userFormData.locationAccess);
                    
                    // If "__ALL__" is selected, clear other selections
                    if (selected.includes('__ALL__')) {
                      console.log('Setting to __ALL__ only');
                      setUserFormData({ ...userFormData, locationAccess: ['__ALL__'] });
                    } else {
                      console.log('Setting to specific locations:', selected);
                      setUserFormData({ ...userFormData, locationAccess: selected });
                    }
                  }}
                  label="Location Access"
                  MenuProps={{
                    sx: { zIndex: 99999 }
                  }}
                  renderValue={(selected) => {
                    console.log('renderValue - selected:', selected);
                    console.log('renderValue - userFormData.locationAccess:', userFormData.locationAccess);
                    if (selected.length === 0) return 'Select locations...';
                    if (selected.includes('__ALL__')) return 'All Locations (Global Access)';
                    if (selected.length === locations.length) return 'All Locations';
                    return selected.map(locId => {
                      if (locId === '__ALL__') return 'All Locations (Global Access)';
                      return locations.find(l => l.id === locId)?.name;
                    }).join(', ');
                  }}
                >
                  {locations.length === 0 ? (
                    <MenuItem disabled>No locations available</MenuItem>
                  ) : (
                    <>
                      <MenuItem value="__ALL__">All Locations (Global Access)</MenuItem>
                      {locations.map((location) => (
                        <MenuItem key={location.id} value={location.id}>
                          {location.name}
                        </MenuItem>
                      ))}
                    </>
                  )}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {userFormData.locationAccess.length === 0 
                  ? 'Select locations or choose "All Locations" for global access'
                  : userFormData.locationAccess.includes('__ALL__')
                    ? 'Global access to all current and future locations'
                    : `Access to ${userFormData.locationAccess.length} specific location(s)`
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
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained" disabled={!userFormData.username || !userFormData.name}>
            {editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure system settings and preferences
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<VerifiedUserIcon />} 
            label="Certification Verification" 
            iconPosition="start"
          />
          <Tab 
            icon={<PricesIcon />} 
            label="Prices" 
            iconPosition="start"
          />
          <Tab 
            icon={<PeopleIcon />} 
            label="User Management" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
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
              <Typography variant="h6">Certification Verification</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure verification portal URLs for certification agencies
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
              Configure the verification portal URLs for each certification agency. 
              These URLs will be opened in popup windows when verifying customer certifications.
            </Typography>
            
            <Grid container spacing={3}>
              {Object.entries(settings.certificationUrls).map(([agency, url]) => (
                <Grid item xs={12} md={6} key={agency}>
                  <TextField
                    fullWidth
                    label={`${agency} Verification URL`}
                    value={url}
                    onChange={(e) => handleUrlChange(agency, e.target.value)}
                    placeholder={`Enter ${agency} verification portal URL`}
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
                      Test URL
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
                Save Certification Settings
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> Make sure the URLs are correct and accessible. 
          You can test each URL using the "Test URL" button. 
          If a popup is blocked, check your browser's popup blocker settings.
        </Typography>
      </Alert>


      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
        </Box>
      )}

      {activeTab === 1 && (
        <Prices />
      )}

      {activeTab === 2 && (
        <Box>
          {/* User Management - Only visible to admins */}
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
                      Create and manage admin and guide accounts
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Manage system users and their roles. Admins have full access, guides can access bookings, customers, and equipment.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddUser}
                    >
                      Add User
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Username</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
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
                                <Chip
                                  icon={getRoleIcon(user.role)}
                                  label={getRoleLabel(user.role)}
                                  color={getRoleColor(user.role)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={user.isActive ? 'Active' : 'Inactive'}
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
                                  disabled={user.role === USER_ROLES.ADMIN && users.filter(u => u.role === USER_ROLES.ADMIN).length === 1}
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
                You don't have permission to manage users. Only administrators can access this section.
              </Typography>
            </Alert>
          )}
        </Box>
      )}
      </Box>
    </>
  );
};

export default Settings;

