import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Snackbar,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import bookingService from '../services/bookingService';

const EQUIPMENT_ITEMS = [
  { key: 'mask', label: 'Mask' },
  { key: 'snorkel', label: 'Snorkel' },
  { key: 'fins', label: 'Fins' },
  { key: 'boots', label: 'Boots' },
  { key: 'wetsuit', label: 'Wetsuit' },
  { key: 'hood', label: 'Hood' },
  { key: 'bcd', label: 'BCD' },
  { key: 'regulator', label: 'Regulator' },
  { key: 'computer', label: 'Dive Computer' },
  { key: 'torch', label: 'Torch' },
  { key: 'camera', label: 'Camera' },
  { key: 'weights', label: 'Weights' },
  { key: 'tank', label: 'Tank' }
];
const EQUIPMENT_ITEMS_NO_TANK = EQUIPMENT_ITEMS.filter(item => item.key !== 'tank');

const getDefaultEquipmentOwnership = () =>
  EQUIPMENT_ITEMS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});

const getDefaultSuitPreferences = () => ({
  style: 'full',
  thickness: '5mm',
  hood: false
});

const defaultProfileForm = {
  firstName: '',
  lastName: '',
  phone: '',
  nationality: '',
  customerType: 'tourist',
  centerSkillLevel: 'beginner',
  notes: '',
  preferences: {
    tankSize: '12L',
    bcdSize: '',
    finsSize: '',
    bootsSize: '',
    wetsuitSize: '',
    ownEquipment: false,
    equipmentOwnership: getDefaultEquipmentOwnership(),
    suitPreferences: getDefaultSuitPreferences()
  }
};

const defaultCertForm = {
  agency: '',
  level: '',
  certificationNumber: '',
  issueDate: '',
  verified: false
};

const MyAccount = () => {
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [certForm, setCertForm] = useState(defaultCertForm);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const mapCustomerToForm = (customerData) => ({
    firstName: customerData?.firstName || '',
    lastName: customerData?.lastName || '',
    phone: customerData?.phone || '',
    nationality: customerData?.nationality || '',
    customerType: customerData?.customerType || 'tourist',
    centerSkillLevel: customerData?.centerSkillLevel || 'beginner',
    notes: customerData?.notes || '',
  preferences: (() => {
    const ownership = {
      ...getDefaultEquipmentOwnership(),
      ...(customerData?.preferences?.equipmentOwnership || {})
    };
    ownership.tank = false;
    const ownsAllExceptTank = EQUIPMENT_ITEMS_NO_TANK.every(
      (item) => ownership[item.key]
    );
    return {
      tankSize: customerData?.preferences?.tankSize || '12L',
      bcdSize: customerData?.preferences?.bcdSize || '',
      finsSize: customerData?.preferences?.finsSize || '',
      bootsSize: customerData?.preferences?.bootsSize || '',
      wetsuitSize: customerData?.preferences?.wetsuitSize || '',
      ownEquipment: ownsAllExceptTank,
      equipmentOwnership: ownership,
      suitPreferences: {
        ...getDefaultSuitPreferences(),
        ...(customerData?.preferences?.suitPreferences || {})
      }
    };
  })()
  });

  useEffect(() => {
    const storedEmail = localStorage.getItem('dcms_user_email') || '';
    setUserEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setCustomer(null);
      setBookings([]);
      return;
    }

    const loadBookings = () => {
      const userBookings = bookingService.getCustomerBookings(userEmail);
      setBookings(userBookings);
    };

    const loadCustomerProfile = () => {
      setLoadingCustomer(true);
      const customerData = bookingService.getCustomerByEmail(userEmail);
      setCustomer(customerData);
      if (customerData) {
        setProfileForm(mapCustomerToForm(customerData));
      }
      setLoadingCustomer(false);
    };

    loadBookings();
    loadCustomerProfile();

    const handleBookingCreated = () => {
      loadBookings();
    };

    const handleCustomerUpdated = (event) => {
      if (
        event?.detail?.email?.toLowerCase() === userEmail.toLowerCase()
      ) {
        setCustomer(event.detail);
        setProfileForm(mapCustomerToForm(event.detail));
      }
    };

    const handleStorageChange = () => {
      loadCustomerProfile();
      loadBookings();
    };

    window.addEventListener('dcms_booking_created', handleBookingCreated);
    window.addEventListener('dcms_customer_updated', handleCustomerUpdated);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('dcms_booking_created', handleBookingCreated);
      window.removeEventListener('dcms_customer_updated', handleCustomerUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userEmail]);

  const getLocationName = (locationId) =>
    locationId === 'caleta' ? 'Caleta de Fuste' : 'Las Playitas';

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'success',
      pending: 'warning',
      cancelled: 'error',
      completed: 'info'
    };
    return colors[status] || 'default';
  };

  const certifications = useMemo(
    () => customer?.certifications || [],
    [customer]
  );

  const handleProfileFieldChange = (field, value) => {
    if (field.startsWith('preferences.')) {
      const path = field.replace('preferences.', '').split('.');
      setProfileForm((prev) => {
        const safePreferences = {
          ...prev.preferences,
          equipmentOwnership: {
            ...getDefaultEquipmentOwnership(),
            ...(prev.preferences?.equipmentOwnership || {})
          },
          suitPreferences: {
            ...getDefaultSuitPreferences(),
            ...(prev.preferences?.suitPreferences || {})
          }
        };

        if (path.length === 1) {
          const key = path[0];
          if (key === 'ownEquipment') {
            let updatedOwnership = { ...safePreferences.equipmentOwnership };
            if (value) {
              updatedOwnership = EQUIPMENT_ITEMS.reduce((acc, item) => {
                if (item.key !== 'tank') {
                  acc[item.key] = true;
                } else {
                  acc[item.key] = false;
                }
                return acc;
              }, {});
            } else {
              updatedOwnership = {
                ...getDefaultEquipmentOwnership(),
                ...updatedOwnership,
                tank: false
              };
            }
            updatedOwnership.tank = false;
            const ownsAllExceptTank = EQUIPMENT_ITEMS_NO_TANK.every(
              (item) => updatedOwnership[item.key]
            );
            return {
              ...prev,
              preferences: {
                ...safePreferences,
                ownEquipment: value ? ownsAllExceptTank : false,
                equipmentOwnership: updatedOwnership
              }
            };
          }

          return {
            ...prev,
            preferences: {
              ...safePreferences,
              [key]: value
            }
          };
        }

        const updatedPreferences = { ...safePreferences };
        let cursor = updatedPreferences;
        for (let i = 0; i < path.length - 1; i += 1) {
          const segment = path[i];
          cursor[segment] = { ...(cursor[segment] || {}) };
          cursor = cursor[segment];
        }
        cursor[path[path.length - 1]] = value;

        return {
          ...prev,
          preferences: updatedPreferences
        };
      });
      return;
    }

    setProfileForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEquipmentOwnershipChange = (itemKey, checked) => {
    if (itemKey === 'tank') {
      return;
    }
    setProfileForm((prev) => {
      const ownership = {
        ...getDefaultEquipmentOwnership(),
        ...(prev.preferences?.equipmentOwnership || {}),
        [itemKey]: checked
      };
      ownership.tank = false;
      const ownsAllExceptTank = EQUIPMENT_ITEMS_NO_TANK.every(
        (item) => ownership[item.key]
      );
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          equipmentOwnership: ownership,
          ownEquipment: ownsAllExceptTank
        }
      };
    });
  };

  const getEquipmentOwnershipList = (ownership = {}) =>
    EQUIPMENT_ITEMS_NO_TANK.filter((item) => ownership[item.key]);

  const handleOwnEquipmentToggle = (checked) => {
    setProfileForm((prev) => {
      const ownership = {
        ...getDefaultEquipmentOwnership(),
        ...(prev.preferences?.equipmentOwnership || {})
      };
      EQUIPMENT_ITEMS.forEach((item) => {
        if (item.key === 'tank') {
          ownership[item.key] = false;
        } else {
          ownership[item.key] = checked;
        }
      });
      const ownsAllExceptTank = EQUIPMENT_ITEMS_NO_TANK.every(
        (item) => ownership[item.key]
      );
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          equipmentOwnership: ownership,
          ownEquipment: checked ? ownsAllExceptTank : false
        }
      };
    });
  };

  const handleSaveProfile = () => {
    if (!userEmail) {
      setSnackbar({
        open: true,
        message: 'Please log in first.',
        severity: 'warning'
      });
      return;
    }

    const updated = bookingService.updateCustomerProfile(userEmail, {
      ...profileForm
    });

    if (updated) {
      setCustomer(updated);
      setProfileForm(mapCustomerToForm(updated));
      setProfileDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully.',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: 'Unable to update profile.',
        severity: 'error'
      });
    }
  };

  const handleAddCertification = () => {
    if (!userEmail) return;
    if (!certForm.agency || !certForm.level || !certForm.certificationNumber) {
      setSnackbar({
        open: true,
        message: 'Please fill required fields.',
        severity: 'warning'
      });
      return;
    }

    bookingService.addOrUpdateCertification(userEmail, certForm);
    const updated = bookingService.getCustomerByEmail(userEmail);
    setCustomer(updated);
    setCertDialogOpen(false);
    setCertForm(defaultCertForm);
    setSnackbar({
      open: true,
      message: 'Certification saved.',
      severity: 'success'
    });
  };

  const handleDeleteCertification = (certId) => {
    if (!userEmail) return;
    bookingService.deleteCertification(userEmail, certId);
    const updated = bookingService.getCustomerByEmail(userEmail);
    setCustomer(updated);
    setSnackbar({
      open: true,
      message: 'Certification removed.',
      severity: 'info'
    });
  };

  const renderLoginPrompt = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Please log in to view your account.
        </Typography>
        <Button variant="contained" href="/login">
          Go to Login
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        My Account
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Bookings" />
          <Tab label="Profile" />
          <Tab label="Certifications" />
        </Tabs>
      </Box>

      {!userEmail ? (
        renderLoginPrompt()
      ) : (
        <>
          {/* Bookings Tab */}
          {tabValue === 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">My Bookings</Typography>
                <Button variant="contained" startIcon={<AddIcon />} href="/book-dive">
                  Book a Dive
                </Button>
              </Box>

              {bookings.length === 0 ? (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No bookings found.
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {`Bookings for ${userEmail}`}
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} href="/book-dive">
                      Book a Dive
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Location</strong></TableCell>
                        <TableCell><strong>Activity</strong></TableCell>
                        <TableCell align="right"><strong>Dives/Sessions</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.bookingDate}</TableCell>
                          <TableCell>{getLocationName(booking.locationId)}</TableCell>
                          <TableCell>{booking.activityType}</TableCell>
                          <TableCell align="right">{booking.numberOfDives || 1}</TableCell>
                          <TableCell>
                            <Chip
                              label={booking.status}
                              color={getStatusColor(booking.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">€{booking.totalPrice?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Profile Tab */}
          {tabValue === 1 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5">Personal Information</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setProfileDialogOpen(true)}
                    disabled={loadingCustomer || !customer}
                  >
                    Edit Profile
                  </Button>
                </Box>

                {loadingCustomer ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : !customer ? (
                  <Alert severity="info">
                    No profile found for {userEmail}. Create a booking to generate your profile.
                  </Alert>
                ) : (
                  <>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">First Name</Typography>
                        <Typography variant="body1" gutterBottom>{customer.firstName}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Last Name</Typography>
                        <Typography variant="body1" gutterBottom>{customer.lastName}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Email</Typography>
                        <Typography variant="body1" gutterBottom>{customer.email}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1" gutterBottom>{customer.phone || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">Nationality</Typography>
                        <Typography variant="body1" gutterBottom>{customer.nationality || '-'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">Customer Type</Typography>
                        <Typography variant="body1" gutterBottom>{customer.customerType || 'tourist'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">Center Skill Level</Typography>
                        <Typography variant="body1" gutterBottom>{customer.centerSkillLevel || 'beginner'}</Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 3 }} />

                    <Typography variant="h6" gutterBottom>Equipment Preferences</Typography>
                    {(() => {
                      const ownership = customer.preferences?.equipmentOwnership || {};
                      const equipmentBrought = getEquipmentOwnershipList(ownership);
                      const showBCD = !ownership.bcd;
                      const showFins = !ownership.fins;
                      const showBoots = !ownership.boots;
                      const showWetsuit = !ownership.wetsuit;
                      const suitPref = customer.preferences?.suitPreferences || {};
                      const providedItems = [];

                      providedItems.push({
                        key: 'tank',
                        label: 'Tank',
                        value: customer.preferences?.tankSize || '12L',
                        note: 'Air supply is always provided by the dive center'
                      });
                      if (showBCD) {
                        providedItems.push({
                          key: 'bcd',
                          label: 'BCD',
                          value: customer.preferences?.bcdSize || '-'
                        });
                      }
                      if (showWetsuit) {
                        providedItems.push({
                          key: 'wetsuit',
                          label: 'Wetsuit',
                          value: customer.preferences?.wetsuitSize || '-'
                        });
                      }
                      if (showFins) {
                        providedItems.push({
                          key: 'fins',
                          label: 'Fins',
                          value: customer.preferences?.finsSize || '-'
                        });
                      }
                      if (showBoots) {
                        providedItems.push({
                          key: 'boots',
                          label: 'Boots',
                          value: customer.preferences?.bootsSize || '-'
                        });
                      }

                      return (
                        <>
                          <Typography variant="subtitle2" gutterBottom>Gear you bring</Typography>
                          {equipmentBrought.length ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                              {equipmentBrought.map((item) => (
                                <Chip key={item.key} label={item.label} color="info" size="small" />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              We'll prepare the full equipment kit for you.
                            </Typography>
                          )}

                          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                            Equipment we will prepare
                          </Typography>
                          <Grid container spacing={3}>
                            {providedItems.map((item) => (
                              <Grid item xs={12} sm={4} key={item.key}>
                                <Typography variant="body2" color="text.secondary">
                                  {item.label}
                                </Typography>
                                <Typography variant="body1" gutterBottom>{item.value}</Typography>
                                {item.note && (
                                  <Typography variant="caption" color="text.secondary">
                                    {item.note}
                                  </Typography>
                                )}
                              </Grid>
                            ))}
                          </Grid>

                          {showWetsuit ? (
                            <Box sx={{ mt: 3 }}>
                              <Typography variant="subtitle2" gutterBottom>Suit Preferences</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Style: {suitPref.style === 'shorty' ? 'Shorty' : 'Full'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Thickness: {suitPref.thickness || '5mm'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Hood: {suitPref.hood ? 'Yes' : 'No'}
                              </Typography>
                            </Box>
                          ) : (
                            <Alert severity="success" sx={{ mt: 2 }}>
                              You bring your own suit, so no rental sizing is required.
                            </Alert>
                          )}
                        </>
                      );
                    })()}

                    {customer.notes && (
                      <>
                        <Divider sx={{ my: 3 }} />
                        <Typography variant="h6" gutterBottom>Notes & Requirements</Typography>
                        <Typography variant="body1">{customer.notes}</Typography>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Certifications Tab */}
          {tabValue === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">My Certifications</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setCertDialogOpen(true)}
                  disabled={!customer}
                >
                  Add Certification
                </Button>
              </Box>

              {!customer ? (
                <Alert severity="info">
                  Add a booking first to create your diver profile and upload certifications.
                </Alert>
              ) : certifications.length === 0 ? (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      No certifications registered yet.
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCertDialogOpen(true)}>
                      Add Certification
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Grid container spacing={3}>
                  {certifications.map((cert) => {
                    const certKey = cert.id || cert.certificationNumber;
                    return (
                    <Grid item xs={12} md={6} key={certKey}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="h6" gutterBottom>
                                {cert.agency} - {cert.level}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Cert. Number: {cert.certificationNumber}
                              </Typography>
                              {cert.issueDate && (
                                <Typography variant="body2" color="text.secondary">
                                  Issued: {cert.issueDate}
                                </Typography>
                              )}
                              <Chip
                                label={cert.verified ? 'Verified' : 'Pending Verification'}
                                size="small"
                                color={cert.verified ? 'success' : 'warning'}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                            <Button
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={() => handleDeleteCertification(certKey)}
                            >
                              Remove
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )})}
                </Grid>
              )}
            </Box>
          )}
        </>
      )}

      {/* Edit Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={profileForm.firstName}
                onChange={(e) => handleProfileFieldChange('firstName', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={profileForm.lastName}
                onChange={(e) => handleProfileFieldChange('lastName', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                value={profileForm.phone}
                onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nationality"
                value={profileForm.nationality}
                onChange={(e) => handleProfileFieldChange('nationality', e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="customer-type-label">Customer Type</InputLabel>
                <Select
                  labelId="customer-type-label"
                  value={profileForm.customerType}
                  label="Customer Type"
                  onChange={(e) => handleProfileFieldChange('customerType', e.target.value)}
                >
                  <MenuItem value="tourist">Tourist</MenuItem>
                  <MenuItem value="local">Local</MenuItem>
                  <MenuItem value="recurrent">Recurrent</MenuItem>
                  <MenuItem value="resident">Resident</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="skill-level-label">Center Skill Level</InputLabel>
                <Select
                  labelId="skill-level-label"
                  value={profileForm.centerSkillLevel}
                  label="Center Skill Level"
                  onChange={(e) => handleProfileFieldChange('centerSkillLevel', e.target.value)}
                >
                  <MenuItem value="beginner">Beginner</MenuItem>
                  <MenuItem value="intermediate">Intermediate</MenuItem>
                  <MenuItem value="advanced">Advanced</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes / Special Requirements"
                value={profileForm.notes}
                onChange={(e) => handleProfileFieldChange('notes', e.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" gutterBottom>
                Equipment Preferences
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={profileForm.preferences.ownEquipment}
                    onChange={(e) => handleOwnEquipmentToggle(e.target.checked)}
                  />
                }
                label="I bring my complete equipment setup"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Gear I bring myself</Typography>
              <FormGroup>
                <Grid container spacing={1}>
                  {EQUIPMENT_ITEMS.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={profileForm.preferences.equipmentOwnership[item.key] || false}
                            onChange={(e) =>
                              handleEquipmentOwnershipChange(item.key, e.target.checked)
                            }
                            disabled={item.key === 'tank'}
                          />
                        }
                        label={
                          item.key === 'tank'
                            ? `${item.label} (provided by center)`
                            : item.label
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="tank-size-label">Tank Size</InputLabel>
                <Select
                  labelId="tank-size-label"
                  value={profileForm.preferences.tankSize}
                  label="Tank Size"
                  onChange={(e) =>
                    handleProfileFieldChange('preferences.tankSize', e.target.value)
                  }
                >
                  <MenuItem value="10L">10 L</MenuItem>
                  <MenuItem value="12L">12 L</MenuItem>
                  <MenuItem value="15L">15 L</MenuItem>
                  <MenuItem value="Nitrox 12L">Nitrox 12 L</MenuItem>
                  <MenuItem value="Nitrox 15L">Nitrox 15 L</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {!profileForm.preferences.equipmentOwnership.bcd && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="BCD Size"
                  value={profileForm.preferences.bcdSize}
                  onChange={(e) =>
                    handleProfileFieldChange('preferences.bcdSize', e.target.value)
                  }
                  fullWidth
                />
              </Grid>
            )}
            {!profileForm.preferences.equipmentOwnership.wetsuit && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Wetsuit Size"
                  value={profileForm.preferences.wetsuitSize}
                  onChange={(e) =>
                    handleProfileFieldChange('preferences.wetsuitSize', e.target.value)
                  }
                  fullWidth
                />
              </Grid>
            )}
            {!profileForm.preferences.equipmentOwnership.fins && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Fins Size"
                  value={profileForm.preferences.finsSize}
                  onChange={(e) =>
                    handleProfileFieldChange('preferences.finsSize', e.target.value)
                  }
                  fullWidth
                />
              </Grid>
            )}
            {!profileForm.preferences.equipmentOwnership.boots && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Boots Size"
                  value={profileForm.preferences.bootsSize}
                  onChange={(e) =>
                    handleProfileFieldChange('preferences.bootsSize', e.target.value)
                  }
                  fullWidth
                />
              </Grid>
            )}
            {!profileForm.preferences.equipmentOwnership.wetsuit ? (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Suit Preferences
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend">Preferred Suit Style</FormLabel>
                    <RadioGroup
                      row
                      value={profileForm.preferences.suitPreferences.style}
                      onChange={(e) =>
                        handleProfileFieldChange('preferences.suitPreferences.style', e.target.value)
                      }
                    >
                      <FormControlLabel value="full" control={<Radio />} label="Full" />
                      <FormControlLabel value="shorty" control={<Radio />} label="Shorty" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="suit-thickness-label">Thickness</InputLabel>
                    <Select
                      labelId="suit-thickness-label"
                      value={profileForm.preferences.suitPreferences.thickness}
                      label="Thickness"
                      onChange={(e) =>
                        handleProfileFieldChange('preferences.suitPreferences.thickness', e.target.value)
                      }
                    >
                      <MenuItem value="3mm">3 mm</MenuItem>
                      <MenuItem value="5mm">5 mm</MenuItem>
                      <MenuItem value="7mm">7 mm</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profileForm.preferences.suitPreferences.hood}
                        onChange={(e) =>
                          handleProfileFieldChange('preferences.suitPreferences.hood', e.target.checked)
                        }
                      />
                    }
                    label="Include hood"
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="success">
                  Diver brings their own suit, so suit rental options are hidden.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={certDialogOpen} onClose={() => setCertDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Certification</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Agency"
                value={certForm.agency}
                onChange={(e) => setCertForm((prev) => ({ ...prev, agency: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Level"
                value={certForm.level}
                onChange={(e) => setCertForm((prev) => ({ ...prev, level: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Certification Number"
                value={certForm.certificationNumber}
                onChange={(e) =>
                  setCertForm((prev) => ({ ...prev, certificationNumber: e.target.value }))
                }
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Issue Date"
                type="date"
                value={certForm.issueDate}
                onChange={(e) => setCertForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={certForm.verified}
                    onChange={(e) =>
                      setCertForm((prev) => ({ ...prev, verified: e.target.checked }))
                    }
                  />
                }
                label="Already verified"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCertification}>
            Save Certification
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MyAccount;

