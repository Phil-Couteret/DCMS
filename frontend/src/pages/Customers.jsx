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
  ExpandMore as ExpandMoreIcon
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

  useEffect(() => {
    if (!mode && !customerId) {
      loadCustomers();
    }
  }, [mode, customerId]);

  const loadCustomers = () => {
    const allCustomers = dataService.getAll('customers');
    console.log('Loaded customers:', allCustomers.length, allCustomers);
    // Debug: Check if customers have certifications
    allCustomers.forEach(customer => {
      console.log(`${customer.firstName} ${customer.lastName}:`, customer.certifications);
    });
    setCustomers(allCustomers);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = dataService.searchCustomers(query);
      setCustomers(results);
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

      {customers.length === 0 ? (
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
            {customers.map((customer) => (
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
                    <Typography variant="body1" fontWeight="medium">
                      {customer.firstName} {customer.lastName}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label={customer.customerType || 'tourist'} 
                        size="small" 
                        variant="outlined"
                      />
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
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('customers.type')}: {customer.customerType || 'tourist'}
                  </Typography>
                  
                  {/* Medical Certificate Status */}
                  {customer.medicalCertificate && customer.medicalCertificate.hasCertificate && (
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

                      {/* Diving Insurance Status */}
                      {customer.divingInsurance && customer.divingInsurance.hasInsurance && (
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
                      
                      {/* Certifications */}
                      {customer.certifications && customer.certifications.length > 0 && (
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
