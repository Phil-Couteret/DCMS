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
  LocationOn as LocationIcon,
  VpnKey as ApiKeyIcon,
  Business as BusinessIcon,
  ContentCopy as CopyIcon
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
  
  // User Management state (includes staff members who are also users)
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]); // Load staff to show alongside users
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
    role: USER_ROLES.ADMIN, // Default role (kept for backward compatibility)
    staffRoles: [], // Staff roles array (boat_captain, instructor, etc.) - optional, only if this user is also staff
    permissions: [], // Array of permission keys
    isActive: true,
    locationAccess: [], // Array of location IDs (for user access)
    staffLocationId: '', // Location ID for staff assignment (if this user is also staff)
    employmentStartDate: '', // Employment start date for staff
    isStaffMember: false // Toggle to indicate if this user is also a staff member
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
    reef: '',
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


  // Locations Management state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationFormData, setLocationFormData] = useState({
    name: '',
    type: 'diving',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: ''
    },
    contactInfo: {
      phone: '',
      mobile: '',
      email: '',
      website: ''
    },
    isActive: true
  });

  // Partners Management state
  const [partners, setPartners] = useState([]);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [partnerFormData, setPartnerFormData] = useState({
    name: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    webhookUrl: '',
    commissionRate: null,
    allowedLocations: [],
    isActive: true
  });
  const [newPartnerCredentials, setNewPartnerCredentials] = useState(null);
  
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
    loadSettings().catch(err => console.error('Error loading settings:', err));
    if (isAdmin()) {
      loadUsers().catch(err => console.error('Error loading users:', err));
      loadLocations().catch(err => console.error('Error loading locations:', err));
      loadStaff().catch(err => console.error('Error loading staff:', err));
      loadDiveSites().catch(err => console.error('Error loading dive sites:', err));
      loadBoats().catch(err => console.error('Error loading boats:', err));
      loadPartners().catch(err => console.error('Error loading partners:', err));
    }
  }, [isAdmin]);
  
  const loadDiveSites = async () => {
    try {
      const allDiveSites = await dataService.getAll('diveSites') || [];
      setDiveSites(Array.isArray(allDiveSites) ? allDiveSites : []);
    } catch (error) {
      console.error('Error loading dive sites:', error);
      setDiveSites([]);
    }
  };
  
  const loadBoats = async () => {
    try {
      const allBoats = await dataService.getAll('boats') || [];
      setBoats(Array.isArray(allBoats) ? allBoats : []);
    } catch (error) {
      console.error('Error loading boats:', error);
      setBoats([]);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        const loadedSettings = savedSettings[0];
        setSettings(prev => ({
          ...prev,
          ...loadedSettings
        }));
        setSettingsId(loadedSettings.id);
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

  const handleSave = async () => {
    try {
      if (settingsId) {
        // Update existing settings
        await dataService.update('settings', settingsId, settings);
      } else {
        // Create new settings if none exist
        const newSettings = await dataService.create('settings', settings);
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
      // Normalize location data - handle both isActive and is_active field names
      const normalizedLocations = Array.isArray(allLocations) 
        ? allLocations.map(loc => ({
            ...loc,
            isActive: loc.isActive !== undefined ? loc.isActive : (loc.is_active !== undefined ? loc.is_active : true),
            contactInfo: loc.contactInfo || loc.contact_info || {}
          }))
        : [];
      setLocations(normalizedLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
    }
  };

  // Location Management functions
  const handleSaveLocation = async () => {
    try {
      if (!locationFormData.name.trim()) {
        setSnackbar({
          open: true,
          message: 'Location name is required',
          severity: 'error'
        });
        return;
      }

      const locationData = {
        name: locationFormData.name.trim(),
        type: locationFormData.type,
        address: locationFormData.address,
        contactInfo: locationFormData.contactInfo,
        isActive: locationFormData.isActive
      };

      if (editingLocation) {
        // Update existing location
        await dataService.update('locations', editingLocation.id, locationData);
        setSnackbar({
          open: true,
          message: 'Location updated successfully!',
          severity: 'success'
        });
      } else {
        // Create new location
        await dataService.create('locations', {
          ...locationData,
          createdAt: new Date().toISOString()
        });
        setSnackbar({
          open: true,
          message: 'Location created successfully!',
          severity: 'success'
        });
      }

      setLocationDialogOpen(false);
      setEditingLocation(null);
      setLocationFormData({
        name: '',
        type: 'diving',
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: ''
        },
        contactInfo: {
          phone: '',
          mobile: '',
          email: '',
          website: ''
        },
        isActive: true
      });
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      setSnackbar({
        open: true,
        message: 'Error saving location',
        severity: 'error'
      });
    }
  };

  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      await dataService.remove('locations', locationId);
      setSnackbar({
        open: true,
        message: 'Location deleted successfully!',
        severity: 'success'
      });
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting location',
        severity: 'error'
      });
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

  // Find staff member by email (to link users with staff)
  const getStaffForUser = (userEmail) => {
    if (!userEmail) return null;
    const staffMember = staff.find(s => s.email === userEmail);
    if (!staffMember) return null;
    
    // Extract roles from certifications field (if it's an array of role strings)
    // or use the role field if certifications is not an array of roles
    let roles = [];
    if (staffMember.certifications && Array.isArray(staffMember.certifications)) {
      // Check if certifications contains role strings
      const roleValues = ['boat_captain', 'instructor', 'divemaster', 'assistant', 'manager', 'owner', 'mechanic', 'intern', 'admin'];
      const rolesFromCerts = staffMember.certifications.filter(c => typeof c === 'string' && roleValues.includes(c));
      if (rolesFromCerts.length > 0) {
        roles = rolesFromCerts;
      } else {
        // If certifications doesn't contain roles, use the primary role
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

  // Partners Management functions
  const loadPartners = async () => {
    try {
      const allPartners = await dataService.getAll('partners') || [];
      setPartners(Array.isArray(allPartners) ? allPartners : []);
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    }
  };

  const handleAddPartner = () => {
    setEditingPartner(null);
    setNewPartnerCredentials(null);
    setPartnerFormData({
      name: '',
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      webhookUrl: '',
      commissionRate: null,
      allowedLocations: [],
      isActive: true
    });
    setPartnerDialogOpen(true);
  };

  const handleEditPartner = (partner) => {
    setEditingPartner(partner);
    setNewPartnerCredentials(null);
    setPartnerFormData({
      name: partner.name || '',
      companyName: partner.companyName || partner.company_name || '',
      contactEmail: partner.contactEmail || partner.contact_email || '',
      contactPhone: partner.contactPhone || partner.contact_phone || '',
      webhookUrl: partner.webhookUrl || partner.webhook_url || '',
      commissionRate: partner.commissionRate !== undefined ? partner.commissionRate : (partner.commission_rate !== undefined ? parseFloat(partner.commission_rate) : null),
      allowedLocations: partner.allowedLocations || partner.allowed_locations || [],
      isActive: partner.isActive !== undefined ? partner.isActive : (partner.is_active !== undefined ? partner.is_active : true)
    });
    setPartnerDialogOpen(true);
  };

  const handleSavePartner = async () => {
    try {
      const partnerData = {
        ...partnerFormData,
        commissionRate: partnerFormData.commissionRate ? parseFloat(partnerFormData.commissionRate) : null
      };

      if (editingPartner) {
        // Update existing partner
        const updated = await dataService.update('partners', editingPartner.id, partnerData);
        setSnackbar({
          open: true,
          message: 'Partner updated successfully!',
          severity: 'success'
        });
      } else {
        // Create new partner
        const created = await dataService.create('partners', partnerData);
        // Check if API secret is returned (only on create)
        if (created.apiSecret) {
          setNewPartnerCredentials({
            apiKey: created.apiKey || created.api_key,
            apiSecret: created.apiSecret
          });
        }
        setSnackbar({
          open: true,
          message: 'Partner created successfully! Save the API credentials shown below.',
          severity: 'success'
        });
      }
      await loadPartners();
      if (!newPartnerCredentials) {
        setPartnerDialogOpen(false);
      }
    } catch (error) {
      console.error('Error saving partner:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error saving partner',
        severity: 'error'
      });
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      try {
        await dataService.remove('partners', partnerId);
        setSnackbar({
          open: true,
          message: 'Partner deleted successfully!',
          severity: 'success'
        });
        await loadPartners();
      } catch (error) {
        console.error('Error deleting partner:', error);
        setSnackbar({
          open: true,
          message: 'Error deleting partner',
          severity: 'error'
        });
      }
    }
  };

  const handleRegenerateApiKey = async (partnerId) => {
    if (window.confirm('Are you sure you want to regenerate the API key? The old key will no longer work.')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3003/api'}/partners/${partnerId}/regenerate-api-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (data.apiSecret) {
          setNewPartnerCredentials({
            apiKey: data.apiKey || data.api_key,
            apiSecret: data.apiSecret
          });
          setSnackbar({
            open: true,
            message: 'API key regenerated! Save the new credentials shown below.',
            severity: 'success'
          });
          await loadPartners();
        }
      } catch (error) {
        console.error('Error regenerating API key:', error);
        setSnackbar({
          open: true,
          message: 'Error regenerating API key',
          severity: 'error'
        });
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: 'Copied to clipboard!',
      severity: 'success'
    });
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
      staffLocationId: locations.length > 0 ? locations[0].id : '',
      employmentStartDate: '',
      isStaffMember: false
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    const locationAccess = (user.locationAccess || []).length === 0 ? ['__ALL__'] : user.locationAccess;
    const staffMember = getStaffForUser(user.email);
    
    // Parse name into first/last if needed
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
      staffLocationId: staffMember?.locationId || (locations.length > 0 ? locations[0].id : ''),
      employmentStartDate: staffMember?.employmentStartDate ? (staffMember.employmentStartDate.split('T')[0] || staffMember.employmentStartDate) : '',
      isStaffMember: !!staffMember
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
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

      // Validate staff fields if isStaffMember is true
      if (userFormData.isStaffMember) {
        if (!userFormData.firstName || !userFormData.lastName) {
          setSnackbar({
            open: true,
            message: 'First name and last name are required for staff members',
            severity: 'error'
          });
          return;
        }
        if (!userFormData.staffRoles || userFormData.staffRoles.length === 0) {
          setSnackbar({
            open: true,
            message: 'At least one staff role is required',
            severity: 'error'
          });
          return;
        }
        if (!userFormData.staffLocationId) {
          setSnackbar({
            open: true,
            message: 'Location is required for staff members',
            severity: 'error'
          });
          return;
        }
      }

      // Convert "__ALL__" selection to empty array for global access
      const locationAccess = userFormData.locationAccess.includes('__ALL__') 
        ? [] 
        : userFormData.locationAccess;
      
      // Build user name from firstName/lastName if provided, otherwise use name field
      const userName = userFormData.firstName && userFormData.lastName
        ? `${userFormData.firstName} ${userFormData.lastName}`.trim()
        : userFormData.name;
      
      const userData = {
        username: userFormData.username,
        name: userName,
        email: userFormData.email,
        role: userFormData.role,
        permissions: userFormData.permissions || [],
        locationAccess: locationAccess,
        isActive: userFormData.isActive
      };
      
      // Only include password if it's provided
      if (userFormData.password && userFormData.password.trim() !== '') {
        userData.password = userFormData.password;
      }

      let userId;
      if (editingUser) {
        // Update existing user
        await dataService.update('users', editingUser.id, userData);
        userId = editingUser.id;
        setSnackbar({
          open: true,
          message: 'User updated successfully!',
          severity: 'success'
        });
      } else {
        // Create new user
        const newUser = await dataService.create('users', {
          ...userData,
          createdAt: new Date().toISOString()
        });
        userId = newUser.id;
        setSnackbar({
          open: true,
          message: 'User created successfully!',
          severity: 'success'
        });
      }

      // If this user is also a staff member, create/update staff record
      if (userFormData.isStaffMember) {
        // Store all roles in certifications field as JSON, use first role as primary role
        const primaryRole = userFormData.staffRoles && userFormData.staffRoles.length > 0 
          ? userFormData.staffRoles[0] 
          : 'assistant'; // fallback
        
        const staffData = {
          firstName: userFormData.firstName,
          lastName: userFormData.lastName,
          email: userFormData.email,
          phone: userFormData.phone || '',
          role: primaryRole, // Store primary role in role field
          locationId: userFormData.staffLocationId,
          certifications: userFormData.staffRoles || [], // Store all roles in certifications field
          emergencyContact: {},
          employmentStartDate: userFormData.employmentStartDate || null,
          isActive: userFormData.isActive
        };

        const existingStaff = getStaffForUser(userFormData.email);
        if (existingStaff) {
          // Update existing staff record
          await dataService.update('staff', existingStaff.id, staffData);
        } else {
          // Create new staff record
          await dataService.create('staff', staffData);
        }
      }

      setUserDialogOpen(false);
      await loadUsers();
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
                value={userFormData.isStaffMember && userFormData.firstName && userFormData.lastName
                  ? `${userFormData.firstName} ${userFormData.lastName}`.trim()
                  : userFormData.name}
                onChange={(e) => {
                  // If staff member, update firstName/lastName; otherwise update name
                  if (userFormData.isStaffMember) {
                    const parts = e.target.value.split(' ');
                    setUserFormData({ 
                      ...userFormData, 
                      firstName: parts[0] || '',
                      lastName: parts.slice(1).join(' ') || '',
                      name: e.target.value
                    });
                  } else {
                    setUserFormData({ ...userFormData, name: e.target.value });
                  }
                }}
                required={!userFormData.isStaffMember}
                disabled={userFormData.isStaffMember}
                helperText={userFormData.isStaffMember ? "Name is generated from First Name and Last Name below" : ""}
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
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Staff Member Information (Optional)
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Check this box if this user is also a staff member (boat captain, guide, instructor, etc.) who can be assigned to boats and dives.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={userFormData.isStaffMember}
                    onChange={(e) => setUserFormData({ ...userFormData, isStaffMember: e.target.checked })}
                  />
                }
                label="This user is also a staff member"
              />
            </Grid>

            {userFormData.isStaffMember && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    required={userFormData.isStaffMember}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    required={userFormData.isStaffMember}
                  />
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
                    Select all roles that apply. Staff members can have multiple roles (e.g., Boat Captain and Instructor).
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
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required={userFormData.isStaffMember}>
                    <InputLabel>Location (for Staff Assignment)</InputLabel>
                    <Select
                      value={userFormData.staffLocationId}
                      onChange={(e) => setUserFormData({ ...userFormData, staffLocationId: e.target.value })}
                      label="Location (for Staff Assignment)"
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
                    label="Employment Start Date"
                    type="date"
                    value={userFormData.employmentStartDate}
                    onChange={(e) => setUserFormData({ ...userFormData, employmentStartDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
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
              !userFormData.name || 
              (!editingUser && !userFormData.password) ||
              (userFormData.isStaffMember && (!userFormData.firstName || !userFormData.lastName || !userFormData.staffRoles || userFormData.staffRoles.length === 0 || !userFormData.staffLocationId))
            }
          >
            {editingUser ? (t('common.update') || 'Update') : (t('settings.users.create') || 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Partner Dialog */}
      <Dialog 
        open={partnerDialogOpen} 
        onClose={() => {
          setPartnerDialogOpen(false);
          setNewPartnerCredentials(null);
        }} 
        maxWidth="md" 
        fullWidth 
        keepMounted
        sx={{ zIndex: 1300 }}
        PaperProps={{ sx: { zIndex: 1300 } }}
      >
        <DialogTitle>
          {editingPartner ? 'Edit Partner' : 'Add New Partner'}
        </DialogTitle>
        <DialogContent>
          {newPartnerCredentials ? (
            <Box sx={{ pt: 2 }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Save these credentials now! The API secret will not be shown again.
                </Typography>
                <Typography variant="body2">
                  Copy both the API Key and API Secret. The secret is only displayed once.
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    value={newPartnerCredentials.apiKey}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => copyToClipboard(newPartnerCredentials.apiKey)}>
                            <CopyIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Secret"
                    type="password"
                    value={newPartnerCredentials.apiSecret}
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => copyToClipboard(newPartnerCredentials.apiSecret)}>
                            <CopyIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    helperText="This secret will only be shown once. Make sure to save it securely."
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      setPartnerDialogOpen(false);
                      setNewPartnerCredentials(null);
                    }}
                  >
                    I've Saved the Credentials
                  </Button>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Partner Name"
                  value={partnerFormData.name}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={partnerFormData.companyName}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, companyName: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={partnerFormData.contactEmail}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactEmail: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={partnerFormData.contactPhone}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, contactPhone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook URL (optional)"
                  value={partnerFormData.webhookUrl}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, webhookUrl: e.target.value })}
                  helperText="URL for receiving booking notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Commission Rate (%)"
                  type="number"
                  value={partnerFormData.commissionRate !== null && partnerFormData.commissionRate !== undefined 
                    ? (parseFloat(partnerFormData.commissionRate) * 100) 
                    : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPartnerFormData({ 
                      ...partnerFormData, 
                      commissionRate: value && value !== '' ? parseFloat(value) / 100 : null 
                    });
                  }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                  helperText="Enter as percentage (e.g., 10 for 10%)"
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Allowed Locations</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Select locations this partner can access. Leave empty to allow all locations.
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={partnerFormData.allowedLocations.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPartnerFormData({ ...partnerFormData, allowedLocations: [] });
                        }
                      }}
                    />
                  }
                  label="All Locations"
                />
                {!partnerFormData.allowedLocations.length && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Partner will have access to all locations
                  </Alert>
                )}
                {locations.map((location) => (
                  <FormControlLabel
                    key={location.id}
                    control={
                      <Checkbox
                        checked={partnerFormData.allowedLocations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPartnerFormData({ 
                              ...partnerFormData, 
                              allowedLocations: [...partnerFormData.allowedLocations, location.id] 
                            });
                          } else {
                            setPartnerFormData({ 
                              ...partnerFormData, 
                              allowedLocations: partnerFormData.allowedLocations.filter(id => id !== location.id) 
                            });
                          }
                        }}
                      />
                    }
                    label={location.name}
                  />
                ))}
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={partnerFormData.isActive}
                      onChange={(e) => setPartnerFormData({ ...partnerFormData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {!newPartnerCredentials && (
            <>
              <Button onClick={() => {
                setPartnerDialogOpen(false);
                setNewPartnerCredentials(null);
              }}>Cancel</Button>
              <Button 
                onClick={handleSavePartner} 
                variant="contained" 
                disabled={!partnerFormData.name || !partnerFormData.companyName || !partnerFormData.contactEmail}
              >
                {editingPartner ? 'Update' : 'Create'}
              </Button>
            </>
          )}
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
            icon={<LocationIcon />} 
            label="Locations" 
            iconPosition="start"
          />
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
            icon={<BusinessIcon />} 
            label="Partners" 
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
          {/* Locations Management */}
          {isAdmin() && (
            <>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h5" gutterBottom>
                      Locations Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure location names and activity types. This is the initial setup for your business locations.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setEditingLocation(null);
                      setLocationFormData({
                        name: '',
                        type: 'diving',
                        address: {
                          street: '',
                          city: '',
                          postalCode: '',
                          country: ''
                        },
                        contactInfo: {
                          phone: '',
                          mobile: '',
                          email: '',
                          website: ''
                        },
                        isActive: true
                      });
                      setLocationDialogOpen(true);
                    }}
                  >
                    Add Location
                  </Button>
                </Box>

                {locations.length === 0 ? (
                  <Alert severity="info">
                    No locations configured. Click "Add Location" to create your first location.
                  </Alert>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Location Name</strong></TableCell>
                          <TableCell><strong>Activity Type</strong></TableCell>
                          <TableCell><strong>Address</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {locations.map((location) => (
                          <TableRow key={location.id}>
                            <TableCell><strong>{location.name}</strong></TableCell>
                            <TableCell>
                              <Chip 
                                label={location.type === 'bike_rental' ? 'Bike Rental' : 'Diving'} 
                                color={location.type === 'bike_rental' ? 'secondary' : 'primary'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {location.address?.street || location.address?.city 
                                ? `${location.address?.street || ''}, ${location.address?.city || ''}`.trim()
                                : 'Not set'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={(location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)) ? 'Active' : 'Inactive'} 
                                color={(location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)) ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingLocation(location);
                                  setLocationFormData({
                                    name: location.name || '',
                                    type: location.type || 'diving',
                                    address: location.address || {
                                      street: '',
                                      city: '',
                                      postalCode: '',
                                      country: ''
                                    },
                                    contactInfo: location.contactInfo || location.contact_info || {
                                      phone: '',
                                      mobile: '',
                                      email: '',
                                      website: ''
                                    },
                                    isActive: location.isActive !== undefined ? location.isActive : (location.is_active !== undefined ? location.is_active : true)
                                  });
                                  setLocationDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteLocation(location.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>

              {/* Location Dialog */}
              <Dialog 
                open={locationDialogOpen} 
                onClose={() => setLocationDialogOpen(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle>
                  {editingLocation ? 'Edit Location' : 'Add Location'}
                </DialogTitle>
                <DialogContent>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Location Name"
                        value={locationFormData.name}
                        onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                        required
                        helperText="Enter the name of this location (e.g., 'Caleta de Fuste', 'Las Playitas')"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Activity Type</InputLabel>
                        <Select
                          value={locationFormData.type}
                          onChange={(e) => setLocationFormData({ ...locationFormData, type: e.target.value })}
                          label="Activity Type"
                        >
                          <MenuItem value="diving">Diving</MenuItem>
                          <MenuItem value="bike_rental">Bike Rental</MenuItem>
                        </Select>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Select the primary activity type for this location
                        </Typography>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Address Information
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Street Address"
                        value={locationFormData.address.street}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          address: { ...locationFormData.address, street: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={locationFormData.address.city}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          address: { ...locationFormData.address, city: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Postal Code"
                        value={locationFormData.address.postalCode}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          address: { ...locationFormData.address, postalCode: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={locationFormData.address.country}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          address: { ...locationFormData.address, country: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Contact Information
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={locationFormData.contactInfo.phone}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          contactInfo: { ...locationFormData.contactInfo, phone: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Mobile"
                        value={locationFormData.contactInfo.mobile}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          contactInfo: { ...locationFormData.contactInfo, mobile: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={locationFormData.contactInfo.email}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          contactInfo: { ...locationFormData.contactInfo, email: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Website"
                        value={locationFormData.contactInfo.website}
                        onChange={(e) => setLocationFormData({
                          ...locationFormData,
                          contactInfo: { ...locationFormData.contactInfo, website: e.target.value }
                        })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={locationFormData.isActive}
                            onChange={(e) => setLocationFormData({ ...locationFormData, isActive: e.target.checked })}
                          />
                        }
                        label="Active Location"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Inactive locations will be hidden from selection lists
                      </Typography>
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => {
                    setLocationDialogOpen(false);
                    setEditingLocation(null);
                    setLocationFormData({
                      name: '',
                      type: 'diving',
                      address: {
                        street: '',
                        city: '',
                        postalCode: '',
                        country: ''
                      },
                      contactInfo: {
                        phone: '',
                        mobile: '',
                        email: '',
                        website: ''
                      },
                      isActive: true
                    });
                  }}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveLocation}
                  >
                    {editingLocation ? 'Update' : 'Create'}
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Prices Settings */}
          <Prices />
        </Box>
      )}

      {activeTab === 2 && (
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
                            reef: '',
                            isActive: true
                          });
                          setDiveSiteDialogOpen(true);
                        }}
                      >
                        Add Dive Site
                      </Button>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Compliance Reports Settings (per Location)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Enable compliance reports for diving locations in natural reserves. When enabled, the Compliance Reports tab will appear in Dive Preparation.
                      </Typography>
                      {locations.filter(loc => loc.type === 'diving').length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Location</strong></TableCell>
                                <TableCell align="right"><strong>Compliance Reports Mandatory</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {locations.filter(loc => loc.type === 'diving').map((location) => {
                                const locationSettings = location.settings || {};
                                const isEnabled = locationSettings.complianceReportsMandatory || false;
                                return (
                                  <TableRow key={location.id}>
                                    <TableCell>{location.name}</TableCell>
                                    <TableCell align="right">
                                      <Switch
                                        checked={isEnabled}
                                        onChange={async (e) => {
                                          const newValue = e.target.checked;
                                          const updatedSettings = {
                                            ...locationSettings,
                                            complianceReportsMandatory: newValue
                                          };
                                          try {
                                            await dataService.update('locations', location.id, {
                                              settings: updatedSettings
                                            });
                                            // Update local state
                                            setLocations(prev => prev.map(loc => 
                                              loc.id === location.id 
                                                ? { ...loc, settings: updatedSettings }
                                                : loc
                                            ));
                                            setSnackbar({
                                              open: true,
                                              message: `Compliance reports setting updated for ${location.name}`,
                                              severity: 'success'
                                            });
                                          } catch (error) {
                                            console.error('Error saving location setting:', error);
                                            setSnackbar({
                                              open: true,
                                              message: 'Error saving setting',
                                              severity: 'error'
                                            });
                                          }
                                        }}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No diving locations found
                        </Typography>
                      )}
                    </Box>

                    {diveSites.length === 0 ? (
                      <Paper variant="outlined" sx={{ p: 3 }}>
                        <Typography color="text.secondary" align="center">
                          No dive sites found. Click "Add Dive Site" to create one.
                        </Typography>
                      </Paper>
                    ) : (() => {
                      // Group dive sites by reef
                      const reefOrder = ['Castillo Reef', 'Salinas Reef'];
                      const groupedByReef = diveSites.reduce((acc, site) => {
                        let reef = site.conditions?.reef || 'Other';
                        // Group all non-main reefs under "Other"
                        if (!reefOrder.includes(reef)) {
                          reef = 'Other';
                        }
                        if (!acc[reef]) {
                          acc[reef] = [];
                        }
                        acc[reef].push(site);
                        return acc;
                      }, {});

                      // Sort reefs: Castillo first, Salinas second, then Others
                      const sortedReefs = Object.entries(groupedByReef).sort(([a], [b]) => {
                        const aIndex = reefOrder.indexOf(a);
                        const bIndex = reefOrder.indexOf(b);
                        
                        // If both are in the order array, sort by their index
                        if (aIndex !== -1 && bIndex !== -1) {
                          return aIndex - bIndex;
                        }
                        // If only a is in the order array, it comes first
                        if (aIndex !== -1) return -1;
                        // If only b is in the order array, it comes first
                        if (bIndex !== -1) return 1;
                        // If neither is in the order array (both are "Other"), keep order
                        return 0;
                      });

                      return sortedReefs.map(([reef, sites]) => (
                        <Accordion key={reef} defaultExpanded={reefOrder.includes(reef)} sx={{ mb: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                              {reef} ({sites.length} {sites.length === 1 ? 'site' : 'sites'})
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Depth Range</TableCell>
                                  <TableCell>Difficulty Level</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {sites.map((site) => {
                                  // Handle both difficultyLevel and difficulty fields (for backward compatibility)
                                  const difficulty = site.difficultyLevel || site.difficulty || 'beginner';
                                  // Handle both depthRange object and depth string
                                  const depthRange = site.depthRange || (site.depth ? { min: 0, max: 0 } : { min: 0, max: 0 });
                                  const depthDisplay = depthRange.min && depthRange.max 
                                    ? `${depthRange.min}-${depthRange.max}m`
                                    : site.depth || 'N/A';
                                  
                                  return (
                                    <TableRow key={site.id}>
                                      <TableCell><strong>{site.name}</strong></TableCell>
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
                                              current: site.conditions?.current || site.current || '',
                                              waves: site.conditions?.waves || site.waves || '',
                                              travelTime: site.conditions?.travelTime || site.travelTime || '',
                                              description: site.conditions?.description || site.description || '',
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
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          </AccordionDetails>
                        </Accordion>
                      ))
                    })()}
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
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Reef / Area"
                        value={diveSiteFormData.reef}
                        onChange={(e) => setDiveSiteFormData({ ...diveSiteFormData, reef: e.target.value })}
                        placeholder="e.g., Castillo Reef, Salinas Reef"
                        helperText="Group dive sites by reef/area"
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
                      
                      // Build conditions object
                      const conditions = {};
                      if (diveSiteFormData.current) conditions.current = diveSiteFormData.current;
                      if (diveSiteFormData.waves) conditions.waves = diveSiteFormData.waves;
                      if (diveSiteFormData.travelTime) conditions.travelTime = diveSiteFormData.travelTime;
                      if (diveSiteFormData.description) conditions.description = diveSiteFormData.description;
                      // Add reef to conditions if provided
                      if (diveSiteFormData.reef) {
                        conditions.reef = diveSiteFormData.reef;
                      }
                      
                      const diveSiteData = {
                        name: diveSiteFormData.name,
                        locationId: diveSiteFormData.locationId,
                        type: diveSiteFormData.type,
                        depthRange: diveSiteFormData.depthRange,
                        difficultyLevel: diveSiteFormData.difficultyLevel,
                        conditions: Object.keys(conditions).length > 0 ? conditions : undefined,
                        isActive: diveSiteFormData.isActive,
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

      {activeTab === 3 && (
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

      {activeTab === 4 && (
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
        </Box>
      )}

      {activeTab === 5 && (
        <Box>
          {/* Partners Management - Only visible to admins */}
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
                  <BusinessIcon color="primary" />
                  <Box>
                    <Typography variant="h6">Partner Accounts</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage 3rd party partner accounts and API access
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Create and manage partner accounts for 3rd party integrations. Partners can create bookings and manage customers via the API.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddPartner}
                    >
                      Add Partner
                    </Button>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Commission</TableCell>
                          <TableCell>Locations</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {partners.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Typography color="text.secondary" sx={{ py: 2 }}>
                                No partners found. Click "Add Partner" to create one.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          partners.map((partner) => {
                            const allowedLocations = partner.allowedLocations || partner.allowed_locations || [];
                            return (
                              <TableRow key={partner.id}>
                                <TableCell>{partner.name}</TableCell>
                                <TableCell>{partner.companyName || partner.company_name}</TableCell>
                                <TableCell>{partner.contactEmail || partner.contact_email}</TableCell>
                                <TableCell>
                                  {partner.commissionRate !== undefined && partner.commissionRate !== null
                                    ? `${(parseFloat(partner.commissionRate) * 100).toFixed(1)}%`
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {allowedLocations.length === 0 ? (
                                    <Chip label="All" size="small" variant="outlined" />
                                  ) : (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {allowedLocations.slice(0, 2).map((locId) => {
                                        const location = locations.find(l => l.id === locId);
                                        return (
                                          <Chip
                                            key={locId}
                                            label={location?.name || locId.substring(0, 8)}
                                            size="small"
                                            variant="outlined"
                                          />
                                        );
                                      })}
                                      {allowedLocations.length > 2 && (
                                        <Chip
                                          label={`+${allowedLocations.length - 2}`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={partner.isActive !== false ? 'Active' : 'Inactive'}
                                    color={partner.isActive !== false ? 'success' : 'default'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditPartner(partner)}
                                    color="primary"
                                    title="Edit"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleRegenerateApiKey(partner.id)}
                                    color="secondary"
                                    title="Regenerate API Key"
                                  >
                                    <ApiKeyIcon />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeletePartner(partner.id)}
                                    color="error"
                                    title="Delete"
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
                You don't have permission to manage partners. Only administrators can access this section.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {activeTab === 6 && (
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

      {/* Version Information */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          DCMS v1.6.6 - Dive Center Management System
        </Typography>
      </Box>

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

