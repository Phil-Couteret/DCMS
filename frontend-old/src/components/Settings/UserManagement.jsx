// User Management tab of Settings - create/edit user accounts with granular
// permissions (each admin user is also a staff record). Extracted from the
// former monolithic Settings.jsx (Phase 5.2).
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Snackbar,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as VerifiedUserIcon,
  People as PeopleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  DirectionsBoat as BoatIcon,
  PersonPin as GuideIcon,
  School as TrainerIcon,
  Work as InternIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useAuth, USER_ROLES, AVAILABLE_PERMISSIONS, ALL_PERMISSIONS } from '../../utils/authContext';
import { useTranslation } from '../../utils/languageContext';

const STAFF_ROLE_OPTIONS = [
  { value: 'boat_captain', label: 'Boat Captain' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'divemaster', label: 'Divemaster' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'intern', label: 'Intern' },
  { value: 'admin', label: 'Admin' }
];

const getStaffRoleLabel = (role) => {
  const roleLabels = {
    owner: 'Owner',
    manager: 'Manager',
    instructor: 'Instructor',
    divemaster: 'Divemaster',
    assistant: 'Assistant',
    admin: 'Admin',
    boat_captain: 'Boat Captain',
    mechanic: 'Mechanic',
    intern: 'Intern'
  };
  return roleLabels[role] || role;
};

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
      return 'error';
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

const UserManagement = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [locations, setLocations] = useState([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLES.ADMIN,
    staffRoles: [],
    permissions: [],
    isActive: true,
    locationAccess: [],
    staffLocationIds: ['__ALL__'],
    employmentStartDate: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadUsers().catch((err) => console.error('Error loading users:', err));
    loadLocations().catch((err) => console.error('Error loading locations:', err));
    loadStaff().catch((err) => console.error('Error loading staff:', err));
  }, []);

  const loadUsers = async () => {
    try {
      const [allUsers, allStaff] = await Promise.all([
        dataService.getAll('users') || [],
        dataService.getAll('staff') || []
      ]);
      setUsers(Array.isArray(allUsers) ? allUsers : []);
      setStaff(Array.isArray(allStaff) ? allStaff : []);
    } catch (error) {
      console.error('Error loading users/staff:', error);
      setUsers([]);
      setStaff([]);
    }
  };

  const loadLocations = async () => {
    try {
      const allLocations = await dataService.getAll('locations') || [];
      setLocations(Array.isArray(allLocations) ? allLocations : []);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  // Load staff alongside users (staff members are also users)
  const loadStaff = async () => {
    try {
      const allStaff = await dataService.getAll('staff') || [];
      setStaff(Array.isArray(allStaff) ? allStaff : []);
    } catch (error) {
      console.error('Error loading staff:', error);
      setStaff([]);
    }
  };

  // Find staff member by email (to link users with staff)
  const getStaffForUser = (userEmail) => {
    if (!userEmail) return null;
    const staffMember = staff.find(s => s.email === userEmail);
    if (!staffMember) return null;

    let roles = [];
    if (staffMember.certifications && Array.isArray(staffMember.certifications)) {
      const roleValues = ['boat_captain', 'instructor', 'divemaster', 'assistant', 'manager', 'owner', 'mechanic', 'intern', 'admin'];
      const rolesFromCerts = staffMember.certifications.filter(c => typeof c === 'string' && roleValues.includes(c));
      if (rolesFromCerts.length > 0) {
        roles = rolesFromCerts;
      } else {
        roles = staffMember.role ? [staffMember.role] : [];
      }
    } else if (staffMember.role) {
      roles = [staffMember.role];
    }

    return {
      ...staffMember,
      roles: roles
    };
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      name: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: USER_ROLES.ADMIN,
      staffRoles: [],
      permissions: [],
      isActive: true,
      locationAccess: [],
      staffLocationIds: ['__ALL__'],
      employmentStartDate: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    const locationAccess = (user.locationAccess || []).length === 0 ? ['__ALL__'] : user.locationAccess;
    const staffMember = getStaffForUser(user.email);

    const nameParts = (user.name || '').split(' ');
    const firstName = staffMember?.firstName || nameParts[0] || '';
    const lastName = staffMember?.lastName || nameParts.slice(1).join(' ') || '';

    setUserFormData({
      username: user.username,
      name: user.name,
      firstName: firstName,
      lastName: lastName,
      email: user.email || '',
      phone: staffMember?.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role || USER_ROLES.ADMIN,
      staffRoles: staffMember?.roles || (staffMember?.role ? [staffMember.role] : []),
      permissions: user.permissions || [],
      isActive: user.isActive,
      locationAccess: locationAccess,
      staffLocationIds: (staffMember?.locationIds && staffMember.locationIds.length > 0)
        ? staffMember.locationIds
        : (staffMember?.locationId ? [staffMember.locationId] : ['__ALL__']),
      employmentStartDate: staffMember?.employmentStartDate ? (staffMember.employmentStartDate.split('T')[0] || staffMember.employmentStartDate) : ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (!editingUser) {
        if (!userFormData.password || userFormData.password.trim() === '') {
          setSnackbar({ open: true, message: 'Password is required for new users', severity: 'error' });
          return;
        }
      }

      if (userFormData.password && userFormData.password.trim() !== '') {
        if (userFormData.password.length < 6) {
          setSnackbar({ open: true, message: 'Password must be at least 6 characters long', severity: 'error' });
          return;
        }

        if (userFormData.password !== userFormData.confirmPassword) {
          setSnackbar({ open: true, message: 'Passwords do not match', severity: 'error' });
          return;
        }
      }

      if (!userFormData.firstName || !userFormData.lastName) {
        setSnackbar({ open: true, message: 'First name and last name are required', severity: 'error' });
        return;
      }
      if (!userFormData.staffRoles || userFormData.staffRoles.length === 0) {
        setSnackbar({ open: true, message: 'At least one staff role is required', severity: 'error' });
        return;
      }
      if (!userFormData.staffLocationIds || userFormData.staffLocationIds.length === 0) {
        setSnackbar({ open: true, message: 'Select at least one location or All Locations', severity: 'error' });
        return;
      }

      const locationAccess = userFormData.locationAccess.includes('__ALL__')
        ? []
        : userFormData.locationAccess;

      const userName = `${(userFormData.firstName || '').trim()} ${(userFormData.lastName || '').trim()}`.trim();

      const userData = {
        username: userFormData.username,
        name: userName,
        email: userFormData.email,
        role: userFormData.role,
        permissions: userFormData.permissions || [],
        locationAccess: locationAccess,
        isActive: userFormData.isActive
      };

      if (userFormData.password && userFormData.password.trim() !== '') {
        userData.password = userFormData.password;
      }

      let userId;
      if (editingUser) {
        await dataService.update('users', editingUser.id, userData);
        userId = editingUser.id;
        setSnackbar({ open: true, message: 'User updated successfully!', severity: 'success' });
      } else {
        const newUser = await dataService.create('users', {
          ...userData,
          createdAt: new Date().toISOString()
        });
        userId = newUser.id;
        setSnackbar({ open: true, message: 'User created successfully!', severity: 'success' });
      }

      const primaryRole = userFormData.staffRoles && userFormData.staffRoles.length > 0
        ? userFormData.staffRoles[0]
        : 'assistant';

      const locationIds = userFormData.staffLocationIds.includes('__ALL__')
        ? []
        : userFormData.staffLocationIds.filter(id => id !== '__ALL__');

      const staffData = {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        phone: userFormData.phone || '',
        role: primaryRole,
        locationId: locationIds.length > 0 ? locationIds[0] : (locations.length > 0 ? locations[0].id : null),
        locationIds,
        certifications: userFormData.staffRoles || [],
        emergencyContact: {},
        employmentStartDate: userFormData.employmentStartDate || null,
        isActive: userFormData.isActive
      };

      const existingStaff = getStaffForUser(userFormData.email);
      if (existingStaff) {
        await dataService.update('staff', existingStaff.id, staffData);
      } else {
        await dataService.create('staff', staffData);
      }

      setUserDialogOpen(false);
      await loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      setSnackbar({ open: true, message: 'Error saving user', severity: 'error' });
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const userToDelete = users.find(u => u.id === userId);
        if (userToDelete) {
          if (userToDelete.role === USER_ROLES.SUPERADMIN) {
            const superadminCount = users.filter(u => u.role === USER_ROLES.SUPERADMIN).length;
            if (superadminCount <= 1) {
              setSnackbar({ open: true, message: 'Cannot delete the last superadmin user', severity: 'error' });
              return;
            }
          } else if (userToDelete.role === USER_ROLES.ADMIN) {
            const adminCount = users.filter(u => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.SUPERADMIN).length;
            if (adminCount <= 1) {
              setSnackbar({ open: true, message: 'Cannot delete the last admin user', severity: 'error' });
              return;
            }
          }
        }

        dataService.remove('users', userId);
        setSnackbar({ open: true, message: 'User deleted successfully!', severity: 'success' });
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setSnackbar({ open: true, message: 'Error deleting user', severity: 'error' });
      }
    }
  };

  return (
    <Box>
      {/* User Dialog */}
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                value={userFormData.firstName}
                onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={userFormData.lastName}
                onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
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
            {userFormData.role === USER_ROLES.SUPERADMIN && (
              <Grid item xs={12}>
                <Alert severity="info">
                  This is a Superadmin account with full access to all features.
                </Alert>
              </Grid>
            )}

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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                value={userFormData.phone}
                onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Staff Roles *
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Select all roles that apply. Staff can have multiple roles (e.g., Boat Captain and Instructor).
              </Typography>
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Grid container spacing={2}>
                  {STAFF_ROLE_OPTIONS.map((roleOption) => (
                    <Grid item xs={12} sm={6} md={4} key={roleOption.value}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={userFormData.staffRoles.includes(roleOption.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserFormData({
                                  ...userFormData,
                                  staffRoles: [...userFormData.staffRoles, roleOption.value]
                                });
                              } else {
                                setUserFormData({
                                  ...userFormData,
                                  staffRoles: userFormData.staffRoles.filter(r => r !== roleOption.value)
                                });
                              }
                            }}
                          />
                        }
                        label={roleOption.label}
                      />
                    </Grid>
                  ))}
                </Grid>
                {userFormData.staffRoles.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Please select at least one staff role.
                  </Alert>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Locations (where this staff can work) *
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Select one, several, or All Locations. Staff can be assigned to boats and dives at their selected locations.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={userFormData.staffLocationIds.includes('__ALL__')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserFormData({ ...userFormData, staffLocationIds: ['__ALL__'] });
                      } else {
                        setUserFormData({ ...userFormData, staffLocationIds: [] });
                      }
                    }}
                  />
                }
                label={t('settings.users.allLocations') || 'All Locations'}
              />
              {!userFormData.staffLocationIds.includes('__ALL__') && locations.map((location) => (
                <FormControlLabel
                  key={location.id}
                  control={
                    <Checkbox
                      checked={userFormData.staffLocationIds.includes(location.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setUserFormData({
                            ...userFormData,
                            staffLocationIds: [...userFormData.staffLocationIds.filter(id => id !== '__ALL__'), location.id]
                          });
                        } else {
                          setUserFormData({
                            ...userFormData,
                            staffLocationIds: userFormData.staffLocationIds.filter(id => id !== location.id)
                          });
                        }
                      }}
                    />
                  }
                  label={location.name}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {userFormData.staffLocationIds.includes('__ALL__')
                  ? (t('settings.users.globalAccess') || 'Can work at all locations')
                  : `${userFormData.staffLocationIds.length} ${t('settings.users.locations') || 'location(s)'} selected`
                }
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Employment Start Date"
                type="date"
                value={userFormData.employmentStartDate}
                onChange={(e) => setUserFormData({ ...userFormData, employmentStartDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
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
            disabled={
              !userFormData.username ||
              !userFormData.firstName ||
              !userFormData.lastName ||
              (!editingUser && !userFormData.password) ||
              !userFormData.staffRoles ||
              userFormData.staffRoles.length === 0 ||
              !userFormData.staffLocationIds ||
              userFormData.staffLocationIds.length === 0
            }
          >
            {editingUser ? (t('common.update') || 'Update') : (t('settings.users.create') || 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

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
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Staff Roles</TableCell>
                      <TableCell>{t('settings.users.permissions') || 'Permissions'}</TableCell>
                      <TableCell>{t('settings.users.status') || 'Status'}</TableCell>
                      <TableCell align="right">{t('settings.users.actions') || 'Actions'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography color="text.secondary" sx={{ py: 2 }}>
                            No users found. Click "Add User" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => {
                        const staffMember = getStaffForUser(user.email);
                        return (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell>{user.email || '-'}</TableCell>
                          <TableCell>{staffMember?.phone || '-'}</TableCell>
                          <TableCell>
                            {staffMember && staffMember.roles && staffMember.roles.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {staffMember.roles.map((role) => (
                                  <Chip
                                    key={role}
                                    label={getStaffRoleLabel(role)}
                                    size="small"
                                    color={role === 'boat_captain' ? 'primary' : 'default'}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
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
                        );
                      })
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default UserManagement;
