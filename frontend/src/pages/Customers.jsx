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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText
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
  Sync as SyncIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, processed: 0, successful: 0, errors: [] });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!mode && !customerId) {
      loadCustomers();
    }
  }, [mode, customerId]);

  // Refresh list when customers are created or updated
  useEffect(() => {
    const onCustomerUpdate = (event) => {
      if (!mode && !customerId) {
        loadCustomers();
      }
    };
    const onStorageChange = (event) => {
      if (event.key === 'dcms_customers' || !event.key) {
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
      const allCustomers = await dataService.getAll('customers');
      // Ensure we have an array
      if (!Array.isArray(allCustomers)) {
        setCustomers([]);
        return;
      }
      
      // Show all customers with customerType (diving customers)
      const filteredCustomers = allCustomers.filter(customer => {
        // Diving customers have customerType (tourist/local/recurrent)
        const hasCustomerType = customer.customerType && customer.customerType.trim() !== '';
        return hasCustomerType;
      });
      
      setCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const handleSyncFromServer = async () => {
    try {
      // Since we're using the API directly, just reload customers from the API
      // This will fetch fresh data from PostgreSQL, including any customers created on the public website
      await loadCustomers();
    } catch (error) {
      console.error('[Admin] Error refreshing customers:', error);
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

  const downloadCSVTemplate = () => {
    // CSV template with required and optional fields
    const headers = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dob',
      'nationality',
      'gender',
      'customerType',
      'centerSkillLevel'
    ];

    // Create example row
    const exampleRow = [
      'John',
      'Doe',
      'john.doe@example.com',
      '+34 123 456 789',
      '1990-01-15',
      'Spanish',
      'male',
      'tourist',
      'beginner'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      exampleRow.join(','),
      '',
      'Notes:',
      '- Required fields: firstName, lastName, email',
      '- Date format: YYYY-MM-DD (e.g., 1990-01-15)',
      '- customerType: tourist, local, or recurrent',
      '- centerSkillLevel: beginner, intermediate, advanced, or expert',
      '- gender: male, female, or other',
      '- All other fields are optional'
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim() && !line.startsWith('Notes:'));
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    // Parse headers
    const parseCSVLine = (line) => {
      const values = [];
      let currentValue = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentValue += '"';
            j++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add last value
      return values;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('Notes:') || line.startsWith('-')) continue; // Skip empty lines and notes
      
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());

      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} columns but header has ${headers.length} columns`);
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }

    return data;
  };

  const handleBulkImport = async (file) => {
    if (!file) return;

    setImporting(true);
    setImportProgress({ total: 0, processed: 0, successful: 0, errors: [] });

    try {
      const fileText = await file.text();
      const csvData = parseCSV(fileText);

      if (csvData.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      setImportProgress(prev => ({ ...prev, total: csvData.length }));

      const errors = [];
      let successful = 0;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        try {
          // Validate required fields
          if (!row.firstName || !row.lastName || !row.email) {
            errors.push({
              row: i + 2, // +2 because header is row 1, and arrays are 0-indexed
              error: 'Missing required fields: firstName, lastName, or email'
            });
            setImportProgress(prev => ({ ...prev, processed: i + 1, errors }));
            continue;
          }

          // Build customer data
          const customerData = {
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            email: row.email.trim().toLowerCase(),
            phone: row.phone ? row.phone.trim() : '',
            dob: row.dob ? row.dob.trim() : null,
            nationality: row.nationality ? row.nationality.trim() : '',
            gender: row.gender ? row.gender.trim() : '',
            customerType: row.customerType ? row.customerType.trim() : 'tourist',
            centerSkillLevel: row.centerSkillLevel ? row.centerSkillLevel.trim() : 'beginner',
            preferences: {},
            certifications: [],
            medicalCertificate: { hasCertificate: false },
            divingInsurance: { hasInsurance: false },
            isActive: true
          };

          // Create customer
          await dataService.create('customers', customerData);
          successful++;

          setImportProgress(prev => ({ ...prev, processed: i + 1, successful }));
        } catch (error) {
          console.error(`Error importing row ${i + 2}:`, error);
          errors.push({
            row: i + 2,
            error: error.message || 'Unknown error'
          });
          setImportProgress(prev => ({ ...prev, processed: i + 1, errors }));
        }
      }

      // Reload customers after import
      await loadCustomers();

      // Show summary
      if (errors.length > 0) {
        setImportProgress(prev => ({ ...prev, errors }));
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportProgress(prev => ({
        ...prev,
        errors: [{ row: 0, error: error.message || 'Failed to parse CSV file' }]
      }));
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      handleBulkImport(file);
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
            <>
              <Button
                variant="contained"
                startIcon={<FileUploadIcon />}
                onClick={() => setBulkImportOpen(true)}
              >
                Bulk Import
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/customers?mode=new')}
              >
                {t('customers.new')}
              </Button>
            </>
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
                      {/* Customer Type and Skill Level */}
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
                      {/* Approval status */}
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
                  {/* Customer Type */}
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

      {/* Bulk Import Dialog */}
      <Dialog 
        open={bulkImportOpen} 
        onClose={() => !importing && setBulkImportOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Import Customers</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Instructions:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Download the CSV template to ensure correct format</li>
                  <li>Fill in customer data following the template</li>
                  <li>Required fields: firstName, lastName, email</li>
                  <li>Date format: YYYY-MM-DD (e.g., 1990-01-15)</li>
                  <li>Upload your CSV file to import customers</li>
                </ul>
              </Typography>
            </Alert>

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={downloadCSVTemplate}
                fullWidth
              >
                Download CSV Template
              </Button>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-file-input"
                type="file"
                onChange={handleFileSelect}
                disabled={importing}
              />
              <label htmlFor="csv-file-input">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<FileUploadIcon />}
                  disabled={importing}
                  fullWidth
                >
                  Select CSV File
                </Button>
              </label>
            </Box>

            {importing && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Processing {importProgress.processed} of {importProgress.total} customers...
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(importProgress.processed / importProgress.total) * 100}
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="success.main">
                  Successfully imported: {importProgress.successful}
                </Typography>
                {importProgress.errors.length > 0 && (
                  <Typography variant="body2" color="error.main">
                    Errors: {importProgress.errors.length}
                  </Typography>
                )}
              </Box>
            )}

            {!importing && importProgress.processed > 0 && (
              <Box>
                <Alert 
                  severity={importProgress.errors.length > 0 ? 'warning' : 'success'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="body2">
                    Import completed: {importProgress.successful} successful, {importProgress.errors.length} errors
                  </Typography>
                </Alert>

                {importProgress.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Errors:
                    </Typography>
                    <List dense>
                      {importProgress.errors.map((err, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`Row ${err.row}: ${err.error}`}
                            primaryTypographyProps={{ variant: 'body2', color: 'error' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setBulkImportOpen(false);
              setImportProgress({ total: 0, processed: 0, successful: 0, errors: [] });
            }}
            disabled={importing}
          >
            {importProgress.processed > 0 ? 'Close' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
