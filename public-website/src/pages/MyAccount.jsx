import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Link,
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
  Edit as EditIcon,
  Logout as LogoutIcon,
  CloudUpload as CloudUploadIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookingService from '../services/bookingService';
import RegisteredDiverBooking from '../components/RegisteredDiverBooking';
import PackPurchase from '../components/PackPurchase';
import packPurchaseService from '../services/packPurchaseService';
import consentService from '../services/consentService';
import dataExportService from '../services/dataExportService';
import passwordMigrationService from '../services/passwordMigrationService';
import passwordHash from '../utils/passwordHash';
import dataRetentionService from '../services/dataRetentionService';
import auditService from '../services/auditService';
import dsarService from '../services/dsarService';
import { getPricePerDive, getCustomerType } from '../services/pricingService';

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
  gender: '',
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
  expiryDate: '',
  verified: false
};

const LOCATION_LABELS = {
  caleta: 'Caleta de Fuste',
  playitas: 'Las Playitas',
  '550e8400-e29b-41d4-a716-446655440001': 'Caleta de Fuste',
  '550e8400-e29b-41d4-a716-446655440002': 'Las Playitas'
};

const MyAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [certForm, setCertForm] = useState(defaultCertForm);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [cancelDialog, setCancelDialog] = useState({ open: false, booking: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [consents, setConsents] = useState({
    dataProcessing: false,
    medicalData: false,
    marketing: false
  });
  const [exporting, setExporting] = useState(false);
  const [dsarRequests, setDsarRequests] = useState([]);
  const [dsarLoading, setDsarLoading] = useState(false);
  const [dsarStats, setDsarStats] = useState({ total: 0, pending: 0, completed: 0, overdue: 0 });

  // File upload handler
  const handleFileUpload = async (event, documentType) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'File size must be less than 10MB',
        severity: 'error'
      });
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(',')[1]; // Remove data:image/png;base64, prefix
      const documentData = {
        id: Date.now().toString(),
        type: documentType, // 'medical_certificate', 'diving_insurance', 'other'
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileData: base64String,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'customer'
      };

      // Get current customer (async - fetch from server)
      const currentCustomer = await bookingService.getCustomerByEmail(userEmail);
      if (!currentCustomer) {
        setSnackbar({
          open: true,
          message: 'Customer profile not found',
          severity: 'error'
        });
        return;
      }

      // Add document to customer's uploadedDocuments array
      const existingDocuments = currentCustomer.uploadedDocuments || [];
      const updatedDocuments = [...existingDocuments, documentData];

      // Update customer profile (async)
      await bookingService.updateCustomerProfile(userEmail, {
        uploadedDocuments: updatedDocuments
      });

      // Refresh customer data (async - fetch from server)
      const updated = await bookingService.getCustomerByEmail(userEmail);
      setCustomer(updated);
      setUploadedDocuments(updatedDocuments);

      setSnackbar({
        open: true,
        message: 'File uploaded successfully',
        severity: 'success'
      });
    };

    reader.readAsDataURL(file);
    event.target.value = ''; // Reset file input
  };

  // Download file
  const handleFileDownload = (document) => {
    const byteCharacters = atob(document.fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: document.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Delete file
  const handleFileDelete = async (documentId) => {
    const currentCustomer = await bookingService.getCustomerByEmail(userEmail);
    if (!currentCustomer) return;

    const updatedDocuments = (currentCustomer.uploadedDocuments || []).filter(doc => doc.id !== documentId);
    await bookingService.updateCustomerProfile(userEmail, {
      uploadedDocuments: updatedDocuments
    });

    const updated = await bookingService.getCustomerByEmail(userEmail);
    setCustomer(updated);
    setUploadedDocuments(updatedDocuments);

    setSnackbar({
      open: true,
      message: 'File deleted successfully',
      severity: 'success'
    });
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dcms_user_email');
      window.dispatchEvent(new CustomEvent('dcms_customer_logged_out'));
    }
    setUserEmail('');
    setCustomer(null);
    setBookings([]);
    navigate('/login');
  };

  const handleConsentChange = async (consentType, given) => {
    if (!customer) return;
    
    const customerId = customer.id;
    const ipAddress = null; // Could be retrieved from request if available
    const userAgent = navigator.userAgent;
    
    consentService.recordConsent(customerId, consentType, given, 'online', ipAddress, userAgent);
    
    setConsents(prev => ({ ...prev, [consentType === 'data_processing' ? 'dataProcessing' : consentType === 'medical_data' ? 'medicalData' : 'marketing']: given }));
    
    setSnackbar({
      open: true,
      message: given ? 'Consent updated successfully' : 'Consent withdrawn successfully',
      severity: 'success'
    });
  };

  // Calculate retention info for display
  const retentionInfo = useMemo(() => {
    if (!customer) return null;
    
    const lastActivity = dataRetentionService.getLastActivityDate(customer);
    const retentionPolicies = dataRetentionService.getRetentionPolicies();
    let retentionDate = null;
    
    if (lastActivity) {
      const activityDate = new Date(lastActivity);
      retentionDate = new Date(activityDate);
      retentionDate.setDate(retentionDate.getDate() + retentionPolicies.customerInactive.days);
    }
    
    return {
      lastActivity,
      retentionPolicies,
      retentionDate
    };
  }, [customer]);

  const handleCreateDsarRequest = async () => {
    if (!customer) return;
    
    setDsarLoading(true);
    try {
      const dsar = await dsarService.createDsarRequest(customer.id, {
        requestType: 'access',
        requestedBy: customer.email,
        responseFormat: 'json',
        responseDeliveryMethod: 'portal',
      });
      
      // Reload DSAR requests
      const [requests, stats] = await Promise.all([
        dsarService.getCustomerDsars(customer.id),
        dsarService.getDsarStatistics(customer.id),
      ]);
      setDsarRequests(requests);
      setDsarStats(stats);
      
      // Log audit event
      await auditService.logAuditEvent(
        'customer',
        customer.id,
        'create',
        'dsar',
        dsar.id,
        { requestType: 'access' }
      );
      
      setSnackbar({
        open: true,
        message: 'DSAR request submitted successfully. We will respond within 30 days.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error submitting DSAR request: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setDsarLoading(false);
    }
  };

  const handleExportData = async (format = 'json') => {
    if (!userEmail || !customer) return;
    
    setExporting(true);
    try {
      if (format === 'json') {
        dataExportService.downloadCustomerDataAsJSON(userEmail);
        setSnackbar({
          open: true,
          message: 'Data exported successfully as JSON',
          severity: 'success'
        });
      } else {
        dataExportService.downloadCustomerDataAsCSV(userEmail);
        setSnackbar({
          open: true,
          message: 'Data exported successfully as CSV',
          severity: 'success'
        });
      }
      
      // Log audit event
      await auditService.logDataExport(customer.id, customer.id, format);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error exporting data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  const mapCustomerToForm = (customerData) => ({
    firstName: customerData?.firstName || '',
    lastName: customerData?.lastName || '',
    phone: customerData?.phone || '',
    nationality: customerData?.nationality || '',
    gender: customerData?.gender || '',
    customerType: customerData?.customerType || 'tourist',
    centerSkillLevel: customerData?.centerSkillLevel || 'beginner',
    notes: customerData?.notes || '',
    medicalCertificate: customerData?.medicalCertificate || { hasCertificate: false },
    divingInsurance: customerData?.divingInsurance || { hasInsurance: false },
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
    
    // Clean up expired accounts on app load
    passwordMigrationService.cleanupExpiredAccounts();
    
    // Run data retention cleanup (with delay to not block UI)
    setTimeout(() => {
      dataRetentionService.runDataRetentionCleanup();
    }, 1000);
  }, []);

  // Define load functions using useCallback so they can be used in multiple places
  const loadBookings = useCallback(async () => {
    if (!userEmail) return;
    try {
      const userBookings = await bookingService.getCustomerBookings(userEmail);
      // Ensure bookings is always an array
      setBookings(Array.isArray(userBookings) ? userBookings : []);
    } catch (error) {
      console.error('[MyAccount] Failed to load bookings:', error);
      setBookings([]);
    }
  }, [userEmail]);

  const loadCustomerProfile = useCallback(async () => {
    if (!userEmail) return;
    
    setLoadingCustomer(true);
    const customerData = await bookingService.getCustomerByEmail(userEmail);
      
      // Load consent status
      if (customerData) {
        const customerId = customerData.id;
        setConsents({
          dataProcessing: consentService.hasConsent(customerId, 'data_processing'),
          medicalData: consentService.hasConsent(customerId, 'medical_data'),
          marketing: consentService.hasConsent(customerId, 'marketing')
        });
      }
      
      // Only set defaults if customerType/centerSkillLevel are truly missing (null/undefined)
      // Don't overwrite existing values - they may have been set by admin
      if (customerData && (customerData.customerType === null || customerData.customerType === undefined || 
          customerData.centerSkillLevel === null || customerData.centerSkillLevel === undefined)) {
        await bookingService.updateCustomerProfile(userEmail, {
          customerType: customerData.customerType ?? 'tourist',
          centerSkillLevel: customerData.centerSkillLevel ?? 'beginner'
        });
        // Reload after update (async)
        const updated = await bookingService.getCustomerByEmail(userEmail);
        setCustomer(updated);
        if (updated) {
          setProfileForm(mapCustomerToForm(updated));
        }
      } else {
        setCustomer(customerData);
        if (customerData) {
          setProfileForm(mapCustomerToForm(customerData));
        }
      }
      setLoadingCustomer(false);
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      setCustomer(null);
      setBookings([]);
      return;
    }

    // Fetch data from server on page load (no longer need syncNow - we fetch directly)
    loadBookings();
    loadCustomerProfile();

    const handleBookingCreated = async () => {
      await loadBookings();
    };
    const handleBookingUpdated = async () => {
      await loadBookings();
    };

    const handleCustomerUpdated = (event) => {
      if (
        event?.detail?.email?.toLowerCase() === userEmail.toLowerCase()
      ) {
        setCustomer(event.detail);
        setProfileForm(mapCustomerToForm(event.detail));
      }
    };

    // Listen to custom events only - don't listen to storage events (they cause too many refreshes)
    // Storage events fire for cross-tab communication, but we use custom events for same-tab updates
    window.addEventListener('dcms_booking_created', handleBookingCreated);
    window.addEventListener('dcms_booking_updated', handleBookingUpdated);
    window.addEventListener('dcms_customer_updated', handleCustomerUpdated);
    
    // Listen to sync events (only when data actually changes from server)
    const handleBookingsSynced = async (event) => {
      await loadBookings();
    };
    const handleCustomersSynced = async (event) => {
      await loadCustomerProfile();
    };
    
    window.addEventListener('dcms_bookings_synced', handleBookingsSynced);
    window.addEventListener('dcms_customers_synced', handleCustomersSynced);

    return () => {
      window.removeEventListener('dcms_booking_created', handleBookingCreated);
      window.removeEventListener('dcms_booking_updated', handleBookingUpdated);
      window.removeEventListener('dcms_customer_updated', handleCustomerUpdated);
      window.removeEventListener('dcms_bookings_synced', handleBookingsSynced);
      window.removeEventListener('dcms_customers_synced', handleCustomersSynced);
    };
  }, [userEmail]);

  // Refresh customer data when switching to certifications tab to pick up admin changes
  useEffect(() => {
    if (userEmail && tabValue === 2) {
      loadCustomerProfile();
    }
  }, [tabValue, userEmail, loadCustomerProfile]);

  const getLocationName = (locationId) =>
    LOCATION_LABELS[locationId] || 'Las Playitas';

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'success',
      pending: 'warning',
      cancelled: 'error',
      completed: 'info'
    };
    return colors[status] || 'default';
  };

  const canCancelBooking = (booking) => {
    // Cannot cancel if status is not confirmed or pending
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return false;
    }
    
    // Cannot cancel past bookings
    const bookingDate = new Date(booking.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    if (bookingDate < today) {
      return false;
    }
    
    return true;
  };

  // Calculate cumulative pricing for all bookings (ONLY for tourist customers)
  const getCumulativePricePerDive = useMemo(() => {
    if (!customer || !bookings || bookings.length === 0) return null;
    
    // Check customerType directly from customer object (don't default to 'tourist' here)
    const customerType = customer?.customerType;
    
    // For recurrent/local customers, DO NOT use cumulative pricing - they have fixed prices
    if (customerType === 'recurrent' || customerType === 'local') {
      return null; // Fixed pricing will be calculated per booking
    }
    
    // Only calculate cumulative pricing for tourist customers (or if customerType is undefined/null)
    
    // ONLY for tourist customers, calculate cumulative pricing
    // Calculate total dives across all bookings
    let totalDives = 0;
    let locationId = null;
    
    bookings.forEach(booking => {
      if (booking.activityType === 'diving') {
        // Get number of dives from booking
        let bookingDives = booking.numberOfDives;
        if (!bookingDives && booking.diveSessions) {
          bookingDives = (booking.diveSessions.morning ? 1 : 0) +
                        (booking.diveSessions.afternoon ? 1 : 0) +
                        (booking.diveSessions.night ? 1 : 0);
        }
        if (bookingDives) {
          totalDives += bookingDives;
        }
        
        // Get location ID from first diving booking (normalize if needed)
        if (!locationId && booking.locationId) {
          locationId = booking.locationId;
          if (locationId === 'caleta') locationId = '550e8400-e29b-41d4-a716-446655440001';
          if (locationId === 'playitas') locationId = '550e8400-e29b-41d4-a716-446655440002';
        }
      }
    });
    
    if (totalDives === 0 || !locationId) return null;
    
    // Calculate price per dive based on total dives (cumulative pricing for tourists only)
    // Use 'tourist' as default if customerType is undefined
    const effectiveCustomerType = customerType || 'tourist';
    return getPricePerDive(locationId, effectiveCustomerType, totalDives);
  }, [customer, bookings]);

  // Calculate price per dive for a booking
  const getBookingPricePerDive = (booking) => {
    if (!booking || !customer) return null;
    
    // Only calculate for diving activities
    if (booking.activityType !== 'diving') return null;
    
    // Get location ID (normalize if needed)
    let locationId = booking.locationId;
    if (locationId === 'caleta') locationId = '550e8400-e29b-41d4-a716-446655440001';
    if (locationId === 'playitas') locationId = '550e8400-e29b-41d4-a716-446655440002';
    
    // Get customer type directly from customer object
    // IMPORTANT: Check the actual property - customer should be loaded before this function is called
    let customerType = customer?.customerType;
    
    // Note: We can't fetch from server here since this is called during render (not async)
    // Customer should be loaded on mount via loadCustomerProfile()
    
    // IMPORTANT: For recurrent/local customers, NEVER use cumulative pricing
    // They have fixed prices that don't change based on number of dives
    if (customerType === 'recurrent' || customerType === 'local') {
      // Use fixed pricing - numberOfDives parameter doesn't matter for fixed pricing
      const price = getPricePerDive(locationId, customerType, 1);
      return price;
    }
    
    // For customers without a customerType set, default to tourist and use cumulative pricing
    // ONLY for tourist customers (or undefined customerType), use cumulative pricing if available
    if ((!customerType || customerType === 'tourist') && getCumulativePricePerDive !== null) {
      return getCumulativePricePerDive;
    }
    
    // Fallback: calculate per booking (will default to tourist pricing)
    const effectiveCustomerType = customerType || 'tourist';
    return getPricePerDive(locationId, effectiveCustomerType, 1);
  };

  const openCancelDialog = (booking) => {
    setCancelDialog({ open: true, booking });
    setCancelReason('');
  };

  const closeCancelDialog = () => {
    if (cancelLoading) return;
    setCancelDialog({ open: false, booking: null });
    setCancelReason('');
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelDialog.booking) return;
    if (!customer || !customer.id) {
      setSnackbar({
        open: true,
        message: 'Customer information not available. Please refresh the page.',
        severity: 'error'
      });
      return;
    }
    setCancelLoading(true);
    try {
      // CRITICAL: Verify the booking belongs to the current customer before cancelling
      if (cancelDialog.booking.customerId && cancelDialog.booking.customerId !== customer.id) {
        console.error('[MyAccount] Booking customer mismatch! Booking:', cancelDialog.booking.customerId, 'Current customer:', customer.id);
        setSnackbar({
          open: true,
          message: 'This booking does not belong to your account. Please refresh the page.',
          severity: 'error'
        });
        setCancelLoading(false);
        closeCancelDialog();
        return;
      }
      
      const updated = await bookingService.cancelBooking(cancelDialog.booking.id, {
        reason: cancelReason.trim(),
        cancelledBy: 'customer',
        customerId: customer.id // Pass customer ID for additional verification
      });
      if (updated) {
        setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        setSnackbar({
          open: true,
          message: 'Booking cancelled successfully.',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Unable to cancel booking. Please try again.',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to cancel booking.',
        severity: 'error'
      });
    } finally {
      setCancelLoading(false);
      closeCancelDialog();
    }
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

  const handleSaveProfile = async () => {
    if (!userEmail || !customer) {
      setSnackbar({
        open: true,
        message: 'Please log in first.',
        severity: 'warning'
      });
      return;
    }

    const updated = await bookingService.updateCustomerProfile(userEmail, {
      ...profileForm
    });

    if (updated) {
      // Log audit event for profile update
      const changedFields = {};
      Object.keys(profileForm).forEach(key => {
        if (customer[key] !== profileForm[key]) {
          changedFields[key] = { old: customer[key], new: profileForm[key] };
        }
      });
      await auditService.logProfileUpdate(customer.id, customer.id, changedFields);
      
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

  const handleChangePassword = async () => {
    if (!userEmail || !customer) return;
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'Please fill in all password fields.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      // Verify current password (handles both plaintext and hashed)
      const isValid = await passwordMigrationService.verifyPassword(
        passwordForm.currentPassword,
        customer.password
      );

      if (!isValid) {
        setSnackbar({
          open: true,
          message: 'Current password is incorrect.',
          severity: 'error'
        });
        return;
      }
      
      // Check new password length
      if (passwordForm.newPassword.length < 6) {
        setSnackbar({
          open: true,
          message: 'New password must be at least 6 characters long.',
          severity: 'warning'
        });
        return;
      }
      
      // Check passwords match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setSnackbar({
          open: true,
          message: 'New passwords do not match.',
          severity: 'error'
        });
        return;
      }
      
      // Hash new password
      const hashedPassword = await passwordHash.storeHashedPassword(passwordForm.newPassword);
      
      // Update password with hash (and clear passwordChangeRequiredAt if it exists)
      const updated = bookingService.updateCustomerProfile(userEmail, {
        password: hashedPassword,
        passwordChangeRequiredAt: null // Clear password change requirement
      });
      
      if (updated) {
        setCustomer(updated);
        setPasswordDialogOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSnackbar({
          open: true,
          message: 'Password changed successfully.',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Unable to change password.',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error changing password: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleAddCertification = async () => {
    if (!userEmail) return;
    if (!certForm.agency || !certForm.level || !certForm.certificationNumber) {
      setSnackbar({
        open: true,
        message: 'Please fill required fields.',
        severity: 'warning'
      });
      return;
    }

    try {
      await bookingService.addOrUpdateCertification(userEmail, certForm);
      // Reload customer data from server to get updated certifications
      const updated = await bookingService.getCustomerByEmail(userEmail);
      setCustomer(updated);
      setCertDialogOpen(false);
      setCertForm(defaultCertForm);
      setSnackbar({
        open: true,
        message: 'Certification saved.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error saving certification: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteCertification = async (certId) => {
    if (!userEmail) return;
    try {
      await bookingService.deleteCertification(userEmail, certId);
      // Reload customer data from server to get updated certifications
      const updated = await bookingService.getCustomerByEmail(userEmail);
      setCustomer(updated);
      setSnackbar({
        open: true,
        message: 'Certification removed.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error removing certification: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleSyncToServer = async () => {
    try {
      setSnackbar({
        open: true,
        message: 'Syncing to server...',
        severity: 'info'
      });
      const result = await bookingService.syncAllCustomersToServer();
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Successfully synced ${result.count} customer(s) to server.`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `Sync failed: ${result.error || 'Unknown error'}`,
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Sync error: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!userEmail || !customer) return;
    
    try {
      // Log audit event before deletion
      await auditService.logAccountDeletion(customer.id, customer.id, {
        email: customer.email,
        deletionReason: 'User requested',
      });
      
      const result = await bookingService.deleteCustomerAccount(userEmail);
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Account deleted successfully. Redirecting...',
          severity: 'success'
        });
        setDeleteDialogOpen(false);
        // Redirect to home after a short delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error deleting account: ${error.message}`,
        severity: 'error'
      });
      setDeleteDialogOpen(false);
    }
  };

  const renderLoginPrompt = () => (
    <Card>
      <CardContent sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {t('myAccount.pleaseLogin')}
        </Typography>
        <Button variant="contained" href="/login">
          {t('myAccount.goToLogin')}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h3" gutterBottom sx={{ mb: 0 }}>
          {t('myAccount.title')}
        </Typography>
        {userEmail && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            {t('myAccount.logout')}
          </Button>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label={t('myAccount.tabs.bookings')} />
          <Tab label={t('myAccount.tabs.profile')} />
          <Tab label={t('myAccount.tabs.certifications')} />
          <Tab label={t('myAccount.tabs.privacy')} />
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
                <Typography variant="h5">{t('myAccount.bookings.title')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      // Refresh data from server (async functions)
                      try {
                        await loadBookings();
                        await loadCustomerProfile();
                        setSnackbar({
                          open: true,
                          message: t('myAccount.dataRefreshed'),
                          severity: 'success'
                        });
                      } catch (err) {
                        console.warn('[MyAccount] Refresh failed:', err);
                        setSnackbar({
                          open: true,
                          message: t('myAccount.refreshFailed'),
                          severity: 'error'
                        });
                      }
                    }}
                  >
                    {t('myAccount.bookings.refresh')}
                  </Button>
                  {customer && customer.isApproved && (
                    <>
                    <RegisteredDiverBooking 
                      customer={customer} 
                      onBookingCreated={async () => {
                        await loadBookings();
                      }}
                    />
                    <PackPurchase 
                      customer={customer} 
                      onPackPurchased={async () => {
                        await loadBookings();
                      }}
                    />
                    </>
                  )}
                  {customer && customer.isApproved === false && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {t('myAccount.pendingApproval')}
                    </Alert>
                  )}
                </Box>
              </Box>

              {/* My Pack Credits */}
              {customer && customer.isApproved && (() => {
                const packs = packPurchaseService.getCustomerPackPurchases(customer.id);
                if (packs.length === 0) return null;
                return (
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {t('myAccount.packCredits.title')}
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>{t('myAccount.packCredits.location')}</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>{t('myAccount.packCredits.count')}</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>{t('myAccount.packCredits.type')}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {packs.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell sx={{ fontSize: '1.35rem', fontWeight: 600 }}>
                                  {LOCATION_LABELS[p.locationId] || p.locationId}
                                </TableCell>
                                <TableCell sx={{ fontSize: '1.35rem', fontWeight: 600 }}>
                                  {t('myAccount.packCredits.divesRemaining', { remaining: p.divesRemaining, total: p.divesTotal })}
                                </TableCell>
                                <TableCell sx={{ fontSize: '1.15rem', fontWeight: 400 }}>
                                  {p.withEquipment ? t('myAccount.packCredits.withEquipment') : t('myAccount.packCredits.ownEquipment')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                );
              })()}

              {bookings.length === 0 ? (
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {t('myAccount.bookings.noBookingsFound')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {`Bookings for ${userEmail}`}
                    </Typography>
                    {customer && customer.isApproved && (
                      <>
                      <RegisteredDiverBooking 
                        customer={customer} 
                        onBookingCreated={async () => {
                          await loadBookings();
                        }}
                      />
                      <PackPurchase 
                        customer={customer} 
                        onPackPurchased={async () => {}}
                      />
                      </>
                    )}
                    {customer && customer.isApproved === false && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Your account is pending approval. The diving center needs to assess your diving level before you can book dives. 
                        Once approved, you'll be able to book dives here.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>{t('myAccount.bookings.date')}</strong></TableCell>
                        <TableCell><strong>{t('myAccount.bookings.location')}</strong></TableCell>
                        <TableCell><strong>{t('myAccount.bookings.activity')}</strong></TableCell>
                        <TableCell align="right"><strong>{t('myAccount.bookings.divesSessions')}</strong></TableCell>
                        <TableCell align="right"><strong>{t('myAccount.bookings.pricePerDive')}</strong></TableCell>
                        <TableCell><strong>{t('myAccount.bookings.status')}</strong></TableCell>
                        <TableCell align="right"><strong>{t('myAccount.bookings.total')}</strong></TableCell>
                        <TableCell align="right"><strong>{t('myAccount.bookings.actions')}</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bookings.map((booking) => {
                        const pricePerDive = getBookingPricePerDive(booking);
                        
                        // Calculate total based on displayed price per dive for consistency
                        let calculatedTotal = booking.totalPrice || 0;
                        if (pricePerDive !== null && booking.activityType === 'diving') {
                          // Get number of dives from booking
                          let numberOfDives = booking.numberOfDives;
                          if (!numberOfDives && booking.diveSessions) {
                            numberOfDives = (booking.diveSessions.morning ? 1 : 0) +
                                          (booking.diveSessions.afternoon ? 1 : 0) +
                                          (booking.diveSessions.night ? 1 : 0);
                          }
                          if (!numberOfDives || numberOfDives === 0) numberOfDives = 1;
                          
                          // Use the displayed price per dive to calculate total
                          calculatedTotal = pricePerDive * numberOfDives;
                        }
                        
                        return (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.bookingDate}</TableCell>
                            <TableCell>{getLocationName(booking.locationId)}</TableCell>
                            <TableCell>{booking.activityType}</TableCell>
                            <TableCell align="right">{booking.numberOfDives || 1}</TableCell>
                            <TableCell align="right">
                              {pricePerDive !== null ? `€${pricePerDive.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={booking.status}
                                color={getStatusColor(booking.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">€{calculatedTotal.toFixed(2)}</TableCell>
                            <TableCell align="right">
                              {canCancelBooking(booking) ? (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => openCancelDialog(booking)}
                                >
                                  Cancel
                                </Button>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  -
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
                  <Typography variant="h5">{t('myAccount.profile.title')}</Typography>
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
                        <Typography variant="body2" color="text.secondary">Gender</Typography>
                        <Typography variant="body1" gutterBottom>
                          {customer.gender ? (customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)) : '-'}
                        </Typography>
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

                    <Divider sx={{ my: 4 }} />
                    
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Account Management</Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setPasswordDialogOpen(true)}
                        disabled={!customer}
                      >
                        Change Password
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={!customer}
                      >
                        Delete Account
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Deleting your account will permanently remove all your data and bookings.
                    </Typography>
                    
                    <Divider sx={{ my: 4 }} />
                    
                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Medical Certificate & Insurance</Typography>
                    {customer?.medicalCertificate?.hasCertificate ? (
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="subtitle1">Medical Certificate</Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => setProfileDialogOpen(true)}
                            >
                              Edit
                            </Button>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Certificate Number</Typography>
                              <Typography variant="body1">{customer.medicalCertificate.certificateNumber || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Issue Date</Typography>
                              <Typography variant="body1">{customer.medicalCertificate.issueDate || '-'}</Typography>
                            </Grid>
                            {customer.medicalCertificate.expiryDate && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                                <Typography variant="body1">{customer.medicalCertificate.expiryDate}</Typography>
                              </Grid>
                            )}
                            {customer.medicalCertificate.verified && (
                              <Grid item xs={12}>
                                <Chip label="Verified" color="success" size="small" />
                              </Grid>
                            )}
                          </Grid>
                          <Box sx={{ mt: 2 }}>
                            <input
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              style={{ display: 'none' }}
                              id="upload-medical-certificate"
                              type="file"
                              onChange={(e) => handleFileUpload(e, 'medical_certificate')}
                            />
                            <label htmlFor="upload-medical-certificate">
                              <Button
                                component="span"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mr: 1 }}
                              >
                                Upload Document
                              </Button>
                            </label>
                            {(customer?.uploadedDocuments || uploadedDocuments).filter(doc => doc.type === 'medical_certificate').map(doc => (
                              <Chip
                                key={doc.id}
                                label={doc.fileName}
                                onDelete={() => handleFileDelete(doc.id)}
                                onClick={() => handleFileDownload(doc)}
                                icon={<FileDownloadIcon />}
                                sx={{ mr: 1, mb: 1 }}
                                clickable
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ) : (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          No medical certificate details provided. Please add your medical certificate information.
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ mt: 1 }}
                        >
                          Add Medical Certificate Details
                        </Button>
                      </Alert>
                    )}
                    
                    {customer?.divingInsurance?.hasInsurance ? (
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="subtitle1">Diving Insurance</Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditIcon />}
                              onClick={() => setProfileDialogOpen(true)}
                            >
                              Edit
                            </Button>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Provider</Typography>
                              <Typography variant="body1">{customer.divingInsurance.insuranceProvider || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Policy Number</Typography>
                              <Typography variant="body1">{customer.divingInsurance.policyNumber || '-'}</Typography>
                            </Grid>
                            {customer.divingInsurance.expiryDate && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                                <Typography variant="body1">{customer.divingInsurance.expiryDate}</Typography>
                              </Grid>
                            )}
                          </Grid>
                          <Box sx={{ mt: 2 }}>
                            <input
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              style={{ display: 'none' }}
                              id="upload-diving-insurance"
                              type="file"
                              onChange={(e) => handleFileUpload(e, 'diving_insurance')}
                            />
                            <label htmlFor="upload-diving-insurance">
                              <Button
                                component="span"
                                variant="outlined"
                                size="small"
                                startIcon={<CloudUploadIcon />}
                                sx={{ mr: 1 }}
                              >
                                Upload Document
                              </Button>
                            </label>
                            {(customer?.uploadedDocuments || uploadedDocuments).filter(doc => doc.type === 'diving_insurance').map(doc => (
                              <Chip
                                key={doc.id}
                                label={doc.fileName}
                                onDelete={() => handleFileDelete(doc.id)}
                                onClick={() => handleFileDownload(doc)}
                                icon={<FileDownloadIcon />}
                                sx={{ mr: 1, mb: 1 }}
                                clickable
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ) : (
                      <Alert severity="info">
                        <Typography variant="body2" gutterBottom>
                          No diving insurance details provided. Please add your insurance information.
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setProfileDialogOpen(true)}
                          sx={{ mt: 1 }}
                        >
                          Add Insurance Details
                        </Button>
                      </Alert>
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
                <Typography variant="h5">{t('myAccount.certifications.title')}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={loadCustomerProfile}
                    disabled={!userEmail}
                  >
                    {t('myAccount.bookings.refresh')}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setCertDialogOpen(true)}
                    disabled={!customer}
                  >
                    Add Certification
                  </Button>
                </Box>
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

          {/* Privacy & Data Tab */}
          {tabValue === 3 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                {t('myAccount.privacy.title')}
              </Typography>

              {/* Data Export Section */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Export My Data (GDPR Right to Data Portability)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You have the right to receive a copy of all your personal data in a structured, 
                    machine-readable format. This includes your profile, bookings, certifications, and consent records.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleExportData('json')}
                      disabled={exporting || !customer}
                    >
                      Export as JSON
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleExportData('csv')}
                      disabled={exporting || !customer}
                    >
                      Export as CSV
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* DSAR Requests Section */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Subject Access Requests (DSAR)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Submit a formal request to access your personal data. We will respond within 30 days as required by GDPR Article 15.
                  </Typography>
                  
                  {dsarStats.total > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Active Requests:</strong> {dsarStats.pending} pending, {dsarStats.completed} completed
                        {dsarStats.overdue > 0 && (
                          <Chip 
                            label={`${dsarStats.overdue} overdue`} 
                            color="error" 
                            size="small" 
                            sx={{ ml: 1 }} 
                          />
                        )}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateDsarRequest}
                    disabled={dsarLoading || !customer}
                    sx={{ mt: 1 }}
                  >
                    Submit New DSAR Request
                  </Button>

                  {dsarRequests.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Your DSAR Requests
                      </Typography>
                      {dsarRequests.map((dsar) => (
                        <Card key={dsar.id} sx={{ mt: 2 }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="h6" gutterBottom>
                                  Request #{dsar.id.substring(0, 8)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Type:</strong> {dsar.request_type === 'access' ? 'Data Access' : dsar.request_type}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Status:</strong>{' '}
                                  <Chip 
                                    label={dsar.status.toUpperCase()} 
                                    size="small"
                                    color={
                                      dsar.status === 'completed' ? 'success' :
                                      dsar.status === 'rejected' ? 'error' :
                                      dsar.status === 'in_progress' ? 'warning' : 'default'
                                    }
                                  />
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Requested:</strong> {new Date(dsar.requested_at).toLocaleDateString()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Deadline:</strong> {new Date(dsar.deadline).toLocaleDateString()}
                                  {dsarService.isDsarOverdue(dsar) && (
                                    <Chip label="OVERDUE" color="error" size="small" sx={{ ml: 1 }} />
                                  )}
                                  {!dsarService.isDsarOverdue(dsar) && dsar.status !== 'completed' && (
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                      ({dsarService.getDaysUntilDeadline(dsar.deadline)} days remaining)
                                    </Typography>
                                  )}
                                </Typography>
                                {dsar.completed_at && (
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Completed:</strong> {new Date(dsar.completed_at).toLocaleDateString()}
                                  </Typography>
                                )}
                                {dsar.rejection_reason && (
                                  <Alert severity="error" sx={{ mt: 1 }}>
                                    <strong>Rejected:</strong> {dsar.rejection_reason}
                                  </Alert>
                                )}
                                {dsar.status === 'completed' && dsar.response_data && (
                                  <Alert severity="success" sx={{ mt: 1 }}>
                                    Your data has been prepared. You can download it from the export section above.
                                  </Alert>
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Consent Management Section */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Manage Your Consents
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You can withdraw your consent at any time. Some consents are required for our services to function.
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Learn more in our{' '}
                    <Link href="/privacy-policy" target="_blank" underline="always">
                      Privacy Policy
                    </Link>.
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Data Processing Consent (Required) */}
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={consents.dataProcessing}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              setSnackbar({
                                open: true,
                                message: 'Data processing consent is required for our services. If you wish to delete your account, please contact us.',
                                severity: 'warning'
                              });
                            } else {
                              handleConsentChange('data_processing', true);
                            }
                          }}
                          disabled={!customer}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" component="span">
                            <strong>Data Processing (Required)</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" display="block">
                            Required to provide dive booking services and manage your account. Cannot be withdrawn while you have an active account.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>

                  {/* Medical Data Consent (Required) */}
                  <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={consents.medicalData}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              setSnackbar({
                                open: true,
                                message: 'Medical data processing is required for diving safety as per Spanish maritime regulations.',
                                severity: 'warning'
                              });
                            } else {
                              handleConsentChange('medical_data', true);
                            }
                          }}
                          disabled={!customer}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" component="span">
                            <strong>Medical Data Processing (Required)</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" display="block">
                            Required for diving safety and compliance with Spanish maritime regulations. Cannot be withdrawn while you book dives.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>

                  {/* Marketing Consent (Optional) */}
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={consents.marketing}
                          onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                          disabled={!customer}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" component="span">
                            <strong>Marketing Communications (Optional)</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" display="block">
                            Receive promotional emails about dive offers and updates. You can withdraw this consent at any time.
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Data Retention Information Section */}
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Retention Policies
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Your data is retained according to our retention policies for legal and business requirements. 
                    Learn more in our{' '}
                    <Link href="/privacy-policy" target="_blank" underline="always">
                      Privacy Policy
                    </Link>.
                  </Typography>
                  
                  {retentionInfo && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Account Status
                      </Typography>
                      {retentionInfo.lastActivity ? (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Last activity: {new Date(retentionInfo.lastActivity).toLocaleDateString()}
                          </Typography>
                          {retentionInfo.retentionDate && retentionInfo.retentionDate > new Date() && (
                            <Alert severity="info" sx={{ mt: 1 }}>
                              Your account data will be automatically deleted on{' '}
                              <strong>{retentionInfo.retentionDate.toLocaleDateString()}</strong> if you remain inactive 
                              (7 years after last activity).
                            </Alert>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Activity information not available
                        </Typography>
                      )}
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Retention Periods
                      </Typography>
                      <Typography component="div" variant="body2" color="text.secondary">
                        <ul style={{ marginTop: 8, marginBottom: 8 }}>
                          <li><strong>Customer Accounts:</strong> {retentionInfo.retentionPolicies.customerInactive.years} years after last activity</li>
                          <li><strong>Booking Records:</strong> {retentionInfo.retentionPolicies.bookings.years} years from booking date</li>
                          <li><strong>Medical Certificates:</strong> {retentionInfo.retentionPolicies.medicalCertificates.years} years after expiry</li>
                          <li><strong>Marketing Consent:</strong> Until withdrawn or {retentionInfo.retentionPolicies.marketingConsent.years} years inactive</li>
                        </ul>
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Account Deletion Section */}
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    Delete My Account
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You have the right to request deletion of your personal data. This will permanently delete 
                    your account, profile, and all associated data. Some data may be retained for legal/accounting 
                    purposes as required by law.
                  </Typography>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Warning:</strong> This action cannot be undone. All your bookings, certifications, 
                    and profile data will be permanently deleted.
                  </Alert>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        try {
                          await bookingService.deleteCustomerAccount(userEmail);
                          consentService.deleteCustomerConsents(customer.id);
                          handleLogout();
                          setSnackbar({
                            open: true,
                            message: 'Account deleted successfully',
                            severity: 'success'
                          });
                        } catch (error) {
                          setSnackbar({
                            open: true,
                            message: 'Error deleting account: ' + error.message,
                            severity: 'error'
                          });
                        }
                      }
                    }}
                    disabled={!customer}
                  >
                    Delete My Account
                  </Button>
                </CardContent>
              </Card>
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
                <InputLabel>Gender</InputLabel>
                <Select
                  label="Gender"
                  value={profileForm.gender || ''}
                  onChange={(e) => handleProfileFieldChange('gender', e.target.value)}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
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
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Medical Certificate
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={profileForm.medicalCertificate?.hasCertificate || false}
                    onChange={(e) => {
                      const medicalCert = {
                        ...(profileForm.medicalCertificate || {}),
                        hasCertificate: e.target.checked
                      };
                      setProfileForm(prev => ({
                        ...prev,
                        medicalCertificate: medicalCert
                      }));
                    }}
                  />
                }
                label="I have a valid medical certificate"
              />
            </Grid>
            {profileForm.medicalCertificate?.hasCertificate && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Certificate Number"
                    value={profileForm.medicalCertificate?.certificateNumber || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        medicalCertificate: {
                          ...(prev.medicalCertificate || {}),
                          certificateNumber: e.target.value,
                          hasCertificate: true
                        }
                      }));
                    }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Issue Date"
                    type="date"
                    value={profileForm.medicalCertificate?.issueDate || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        medicalCertificate: {
                          ...(prev.medicalCertificate || {}),
                          issueDate: e.target.value,
                          hasCertificate: true
                        }
                      }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expiry Date"
                    type="date"
                    value={profileForm.medicalCertificate?.expiryDate || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        medicalCertificate: {
                          ...(prev.medicalCertificate || {}),
                          expiryDate: e.target.value,
                          hasCertificate: true
                        }
                      }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Diving Insurance
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={profileForm.divingInsurance?.hasInsurance || false}
                    onChange={(e) => {
                      const insurance = {
                        ...(profileForm.divingInsurance || {}),
                        hasInsurance: e.target.checked
                      };
                      setProfileForm(prev => ({
                        ...prev,
                        divingInsurance: insurance
                      }));
                    }}
                  />
                }
                label="I have diving insurance"
              />
            </Grid>
            {profileForm.divingInsurance?.hasInsurance && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Insurance Provider"
                    value={profileForm.divingInsurance?.insuranceProvider || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        divingInsurance: {
                          ...(prev.divingInsurance || {}),
                          insuranceProvider: e.target.value,
                          hasInsurance: true
                        }
                      }));
                    }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Policy Number"
                    value={profileForm.divingInsurance?.policyNumber || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        divingInsurance: {
                          ...(prev.divingInsurance || {}),
                          policyNumber: e.target.value,
                          hasInsurance: true
                        }
                      }));
                    }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Issue Date"
                    type="date"
                    value={profileForm.divingInsurance?.issueDate || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        divingInsurance: {
                          ...(prev.divingInsurance || {}),
                          issueDate: e.target.value,
                          hasInsurance: true
                        }
                      }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expiry Date"
                    type="date"
                    value={profileForm.divingInsurance?.expiryDate || ''}
                    onChange={(e) => {
                      setProfileForm(prev => ({
                        ...prev,
                        divingInsurance: {
                          ...(prev.divingInsurance || {}),
                          expiryDate: e.target.value,
                          hasInsurance: true
                        }
                      }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Grid>
              </>
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
                select
                label="Certification Agency"
                value={certForm.agency}
                onChange={(e) => setCertForm((prev) => ({ ...prev, agency: e.target.value }))}
                fullWidth
              >
                <MenuItem value="SSI">SSI</MenuItem>
                <MenuItem value="PADI">PADI</MenuItem>
                <MenuItem value="CMAS">CMAS</MenuItem>
                <MenuItem value="VDST">VDST</MenuItem>
              </TextField>
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
            <Grid item xs={12} sm={6}>
              <TextField
                label="Issue Date"
                type="date"
                value={certForm.issueDate}
                onChange={(e) => setCertForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Expiry Date (Optional)"
                type="date"
                value={certForm.expiryDate || ''}
                onChange={(e) => setCertForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
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

      {/* Delete Account Confirmation Dialog */}
      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="New Password"
                type="password"
                fullWidth
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                helperText="At least 6 characters"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Warning:</strong> This action cannot be undone.
            </Typography>
            <Typography variant="body2">
              Deleting your account will permanently remove:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Your personal information</li>
              <li>All your bookings</li>
              <li>Your certifications</li>
              <li>Your preferences</li>
            </ul>
          </Alert>
          <Typography variant="body1">
            Are you sure you want to delete your account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAccount}
            startIcon={<DeleteIcon />}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={cancelDialog.open} onClose={closeCancelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {cancelDialog.booking
              ? `Are you sure you want to cancel the booking on ${cancelDialog.booking.bookingDate} at ${getLocationName(cancelDialog.booking.locationId)}?`
              : 'Are you sure you want to cancel this booking?'}
          </Typography>
          <TextField
            label="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} disabled={cancelLoading}>
            Back
          </Button>
          <Button
            onClick={handleConfirmCancelBooking}
            color="error"
            variant="contained"
            disabled={cancelLoading}
          >
            {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyAccount;

