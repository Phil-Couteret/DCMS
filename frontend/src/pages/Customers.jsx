import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  CheckCircle as VerifiedIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomerForm from '../components/Customer/CustomerForm';
import dataService from '../services/dataService';
import { useAuth } from '../utils/authContext';
import { useTranslation } from '../utils/languageContext';

const Customers = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const customerId = searchParams.get('id');

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [isBikeRental, setIsBikeRental] = useState(false);

  // Check if current location is bike rental and refresh customers when location changes
  useEffect(() => {
    const checkLocation = async () => {
      try {
        const allLocations = await dataService.getAll('locations') || [];
        if (Array.isArray(allLocations)) {
          setLocations(allLocations);
          const currentLocationId = localStorage.getItem('dcms_current_location');
          const currentLocation = allLocations.find(l => l.id === currentLocationId);
          const isBikeRentalLocation = currentLocation?.type === 'bike_rental';
          setIsBikeRental(isBikeRentalLocation);
          // Reload customers when location type changes
          if (!mode && !customerId) {
            loadCustomers();
          }
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };
    checkLocation();
    
    // Listen for location changes
    const onLocChange = () => {
      checkLocation();
    };
    window.addEventListener('dcms_location_changed', onLocChange);
    
    return () => {
      window.removeEventListener('dcms_location_changed', onLocChange);
    };
  }, [mode, customerId]);

  useEffect(() => {
    if (!mode && !customerId) {
      loadCustomers();
    }
  }, [mode, customerId]);

  // Refresh list when customers are created or updated
  useEffect(() => {
    const onCustomerUpdate = (event) => {
      console.log('[Admin] Customer event received:', event.type, event.detail);
      if (!mode && !customerId) {
        console.log('[Admin] Refreshing customers list...');
        loadCustomers();
      }
    };
    const onStorageChange = (event) => {
      if (event.key === 'dcms_customers' || !event.key) {
        console.log('[Admin] Storage event received for customers');
        if (!mode && !customerId) loadCustomers();
      }
    };
    
    // Listen for sync events
    const onSync = () => {
      if (!mode && !customerId) {
        loadCustomers();
      }
    };
    window.addEventListener('dcms_customers_synced', onSync);
    
    // Poll for changes every 2 seconds (since different ports = separate localStorage)
    const pollInterval = setInterval(async () => {
      if (!mode && !customerId) {
        try {
          const allCustomers = await dataService.getAll('customers');
          const currentCount = Array.isArray(allCustomers) ? allCustomers.length : 0;
          if (currentCount !== customers.length) {
            loadCustomers();
          }
        } catch (error) {
          // Ignore polling errors
        }
      }
    }, 2000);
    
    window.addEventListener('dcms_customer_created', onCustomerUpdate);
    window.addEventListener('dcms_customer_updated', onCustomerUpdate);
    window.addEventListener('storage', onStorageChange);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('dcms_customer_created', onCustomerUpdate);
      window.removeEventListener('dcms_customer_updated', onCustomerUpdate);
      window.removeEventListener('storage', onStorageChange);
      window.removeEventListener('dcms_customers_synced', onSync);
    };
  }, [mode, customerId, customers.length]);

  const loadCustomers = async () => {
    try {
      // Get current location type to determine filtering
      const allLocations = await dataService.getAll('locations') || [];
      const currentLocationId = localStorage.getItem('dcms_current_location');
      const currentLocation = Array.isArray(allLocations) ? allLocations.find(l => l.id === currentLocationId) : null;
      const isBikeRentalLocation = currentLocation?.type === 'bike_rental';
      
      const allCustomers = await dataService.getAll('customers');
      // Ensure we have an array
      if (!Array.isArray(allCustomers)) {
        setCustomers([]);
        return;
      }
      
      // Filter customers based on location type
      // Bike rental customers: don't have customerType (no diving-related data)
      // Diving customers: have customerType (tourist/local/recurrent)
      let filteredCustomers = allCustomers;
      if (isBikeRentalLocation) {
        // For bike rental locations: only show customers without customerType (bike rental customers)
        filteredCustomers = allCustomers.filter(customer => {
          // Bike rental customers don't have customerType or it's empty/undefined
          const hasCustomerType = customer.customerType && customer.customerType.trim() !== '';
          return !hasCustomerType;
        });
      } else {
        // For diving locations: only show customers with customerType (diving customers)
        filteredCustomers = allCustomers.filter(customer => {
          // Diving customers have customerType (tourist/local/recurrent)
          const hasCustomerType = customer.customerType && customer.customerType.trim() !== '';
          return hasCustomerType;
        });
      }
      
      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const handleSyncFromServer = async () => {
    try {
      if (typeof window !== 'undefined' && window.syncService) {
        // Force pull from server
        await window.syncService.syncAll();
        // Reload customers after sync
        setTimeout(() => {
          loadCustomers();
        }, 500);
      }
    } catch (error) {
      console.error('[Admin] Sync error:', error);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await dataService.searchCustomers(query);
        if (Array.isArray(results)) {
          setCustomers(results);
        } else {
          setCustomers([]);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      }
    } else {
      loadCustomers();
    }
  };

  if (mode === 'new' || customerId) {
    return <CustomerForm />;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          {t('customers.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSyncFromServer}
            sx={{ minWidth: 'auto' }}
          >
            Sync from Public Site
          </Button>
          <Button
            variant="outlined"
            onClick={loadCustomers}
            sx={{ minWidth: 'auto' }}
          >
            Refresh
          </Button>
          {isAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/customers?mode=new')}
            >
              {t('customers.new')}
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder={t('customers.search')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {!Array.isArray(customers) || customers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? (t('customers.noResults') || 'No results found') : t('customers.noCustomers')}
          </Typography>
          {!searchQuery && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t('customers.createFirst')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/customers?mode=new')}
              >
                {t('customers.createFirst')}
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Array.isArray(customers) && customers.map((customer) => (
              <Accordion key={customer.id}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                    <Typography variant="body1" fontWeight="medium" sx={{ color: 'text.primary' }}>
                      {[customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Unknown Customer'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Customer Type and Skill Level - only for diving locations */}
                      {!isBikeRental && (
                        <>
                          <Chip 
                            label={customer.customerType || 'tourist'} 
                            size="small" 
                            variant="outlined"
                          />
                          <Chip 
                            label={`Skill: ${customer.centerSkillLevel || 'beginner'}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </>
                      )}
                      {/* Approval status - only for diving locations */}
                      {!isBikeRental && (
                        <>
                          <Chip 
                            label={customer.isApproved ? 'Approved' : 'Pending'}
                            size="small"
                            color={customer.isApproved ? 'success' : 'warning'}
                            variant={customer.isApproved ? 'filled' : 'outlined'}
                            icon={customer.isApproved ? <VerifiedIcon /> : <PendingIcon />}
                          />
                          {isAdmin() && (
                            <Button
                              size="small"
                              variant={customer.isApproved ? 'outlined' : 'contained'}
                              color={customer.isApproved ? 'error' : 'success'}
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // Get fresh customer data to preserve all fields
                                  const freshCustomer = await dataService.getById('customers', customer.id);
                                  if (freshCustomer) {
                                    const updatedCustomer = {
                                      ...freshCustomer, // Preserve all existing fields
                                      isApproved: !freshCustomer.isApproved,
                                      updatedAt: new Date().toISOString()
                                    };
                                    await dataService.update('customers', customer.id, updatedCustomer);
                                    // Reload after update
                                    await loadCustomers();
                                  }
                                } catch (error) {
                                  console.error('Error updating customer approval:', error);
                                  alert('Error updating customer approval. Please try again.');
                                }
                              }}
                              sx={{ minWidth: '100px' }}
                            >
                              {customer.isApproved ? 'Revoke' : 'Approve'}
                            </Button>
                          )}
                        </>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {customer.email}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers?id=${customer.id}`);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {customer.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {customer.phone}
                  </Typography>
                  {customer.nationality && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('customers.nationality')}: {customer.nationality}
                    </Typography>
                  )}
                  {/* Customer Type - only for diving locations */}
                  {!isBikeRental && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {t('customers.type')}: {customer.customerType || 'tourist'}
                    </Typography>
                  )}
                  
                  {/* Medical Certificate Status - only for diving locations */}
                  {!isBikeRental && customer.medicalCertificate && customer.medicalCertificate.hasCertificate && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {t('customers.medicalCertificate') || 'Medical Certificate'}:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 1,
                        border: `1px solid ${customer.medicalCertificate.verified ? '#4caf50' : '#f44336'}`,
                        borderRadius: 1,
                        backgroundColor: customer.medicalCertificate.verified ? '#e8f5e9' : '#ffebee'
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          #{customer.medicalCertificate.certificateNumber} 
                          {customer.medicalCertificate.expiryDate && ` (${t('customers.expires') || 'Expires'}: ${customer.medicalCertificate.expiryDate})`}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {customer.medicalCertificate.verified ? (
                            <>
                              <VerifiedIcon sx={{ color: 'success.main', fontSize: 18 }} />
                              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                                {t('customers.verified') || 'Verified'}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />
                              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'medium' }}>
                                {t('customers.notVerified') || 'Not Verified'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Box>
                      )}

                      {/* Diving Insurance Status - only for diving locations */}
                      {!isBikeRental && customer.divingInsurance && customer.divingInsurance.hasInsurance && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {t('customers.divingInsurance') || 'Diving Insurance'}:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        p: 1,
                        border: `1px solid ${customer.divingInsurance.verified ? '#4caf50' : '#f44336'}`,
                        borderRadius: 1,
                        backgroundColor: customer.divingInsurance.verified ? '#e8f5e9' : '#ffebee'
                      }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          {customer.divingInsurance.insuranceProvider} - #{customer.divingInsurance.policyNumber}
                          {customer.divingInsurance.expiryDate && ` (${t('customers.expires') || 'Expires'}: ${customer.divingInsurance.expiryDate})`}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {customer.divingInsurance.verified ? (
                            <>
                              <VerifiedIcon sx={{ color: 'success.main', fontSize: 18 }} />
                              <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                                {t('customers.verified') || 'Verified'}
                              </Typography>
                            </>
                          ) : (
                            <>
                              <ErrorIcon sx={{ color: 'error.main', fontSize: 18 }} />
                              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'medium' }}>
                                {t('customers.notVerified') || 'Not Verified'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Box>
                      )}
                      
                      {/* Certifications - only for diving locations */}
                      {!isBikeRental && customer.certifications && customer.certifications.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {t('customers.certifications') || 'Certifications'}:
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {customer.certifications.map((cert, index) => {
                          // Determine verification status
                          let StatusIcon;
                          let statusColor;
                          let statusText;
                          let tooltipText;
                          
                          if (cert.verified) {
                            StatusIcon = VerifiedIcon;
                            statusColor = 'success.main';
                            statusText = t('customers.verified') || 'Verified';
                            tooltipText = `${t('customers.verifiedOn') || 'Verified on'} ${cert.verifiedDate || 'N/A'}`;
                          } else if (cert.verified === false) {
                            StatusIcon = PendingIcon;
                            statusColor = 'warning.main';
                            statusText = t('customers.pendingVerification') || 'Pending Verification';
                            tooltipText = t('customers.needsVerification') || 'Needs verification';
                          } else {
                            StatusIcon = ErrorIcon;
                            statusColor = 'error.main';
                            statusText = t('customers.notVerified') || 'Not Verified';
                            tooltipText = t('customers.verificationRequired') || 'Verification required';
                          }

                          return (
                            <Box 
                              key={index} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                p: 1,
                                border: `1px solid ${cert.verified ? '#4caf50' : cert.verified === false ? '#ff9800' : '#f44336'}`,
                                borderRadius: 1,
                                backgroundColor: cert.verified ? '#e8f5e9' : cert.verified === false ? '#fff3e0' : '#ffebee',
                                '&:hover': {
                                  opacity: 0.8
                                }
                              }}
                            >
                              <Chip
                                label={`${cert.agency} ${cert.level}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                                #{cert.certificationNumber}
                              </Typography>
                              <Tooltip title={tooltipText}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <StatusIcon sx={{ color: statusColor, fontSize: 18 }} />
                                  <Typography variant="caption" sx={{ color: statusColor, fontWeight: 'medium' }}>
                                    {statusText}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </Box>
                          );
                          })}
                          </Box>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/customers?id=${customer.id}`)}
                      >
                        {t('common.edit')}
                      </Button>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Customers;
