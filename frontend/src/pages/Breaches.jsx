import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import breachService from '../services/breachService';
import { format } from 'date-fns';
import { useTranslation } from '../utils/languageContext';

const BREACH_TYPES = [
  { value: 'unauthorized_access', label: 'Unauthorized Access' },
  { value: 'data_loss', label: 'Data Loss' },
  { value: 'data_disclosure', label: 'Data Disclosure' },
  { value: 'data_modification', label: 'Data Modification' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'critical', label: 'Critical', color: 'error' },
];

const STATUS_OPTIONS = [
  { value: 'detected', label: 'Detected', color: 'error' },
  { value: 'assessed', label: 'Assessed', color: 'warning' },
  { value: 'reported', label: 'Reported', color: 'info' },
  { value: 'resolved', label: 'Resolved', color: 'success' },
];

const DATA_TYPES = [
  { value: 'customer_data', label: 'Customer Data' },
  { value: 'booking_data', label: 'Booking Data' },
  { value: 'financial_data', label: 'Financial Data' },
  { value: 'equipment_data', label: 'Equipment Data' },
  { value: 'staff_data', label: 'Staff Data' },
  { value: 'certification_data', label: 'Certification Data' },
  { value: 'medical_data', label: 'Medical Data' },
];

const Breaches = () => {
  const { t } = useTranslation();
  const [breaches, setBreaches] = useState([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    detected: 0,
    assessed: 0,
    reported: 0,
    resolved: 0,
    overdue: 0,
    requiringCustomerNotification: 0,
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    breachType: 'unauthorized_access',
    severity: 'medium',
    description: '',
    occurredAt: '',
    affectedDataTypes: [],
    affectedCustomerIds: [],
    rootCause: '',
    containmentMeasures: '',
    mitigationActions: '',
    notes: '',
  });

  const [statusUpdate, setStatusUpdate] = useState({
    status: 'detected',
    authorityNotificationDate: '',
    authorityName: '',
    customerNotificationDate: '',
    customersNotifiedCount: 0,
  });

  useEffect(() => {
    loadBreaches();
    loadStatistics();
  }, [filterStatus]);

  const loadBreaches = async () => {
    setLoading(true);
    try {
      const filters = filterStatus !== 'all' ? { status: filterStatus } : {};
      const result = await breachService.getAllBreaches({ ...filters, limit: 100 });
      setBreaches(result.breaches || []);
    } catch (error) {
      console.error('Error loading breaches:', error);
      setSnackbar({
        open: true,
        message: 'Error loading breaches: ' + error.message,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await breachService.getBreachStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      breachType: 'unauthorized_access',
      severity: 'medium',
      description: '',
      occurredAt: '',
      affectedDataTypes: [],
      affectedCustomerIds: [],
      rootCause: '',
      containmentMeasures: '',
      mitigationActions: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBreach(null);
  };

  const handleOpenStatusDialog = (breach) => {
    setSelectedBreach(breach);
    setStatusUpdate({
      status: breach.status || 'detected',
      authorityNotificationDate: breach.authority_notification_date || '',
      authorityName: breach.authority_name || '',
      customerNotificationDate: breach.customer_notification_date || '',
      customersNotifiedCount: breach.customers_notified_count || 0,
    });
    setStatusDialogOpen(true);
  };

  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedBreach(null);
  };

  const handleCreateBreach = async () => {
    try {
      const breachData = {
        ...formData,
        occurredAt: formData.occurredAt ? new Date(formData.occurredAt).toISOString() : undefined,
      };
      
      await breachService.createBreach(breachData);
      setSnackbar({
        open: true,
        message: 'Breach record created successfully',
        severity: 'success',
      });
      handleCloseDialog();
      loadBreaches();
      loadStatistics();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error creating breach: ' + error.message,
        severity: 'error',
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedBreach) return;

    try {
      const updates = {
        authorityNotificationDate: statusUpdate.authorityNotificationDate
          ? new Date(statusUpdate.authorityNotificationDate).toISOString()
          : undefined,
        authorityName: statusUpdate.authorityName || undefined,
        customerNotificationDate: statusUpdate.customerNotificationDate
          ? new Date(statusUpdate.customerNotificationDate).toISOString()
          : undefined,
        customersNotifiedCount: statusUpdate.customersNotifiedCount || undefined,
      };

      // Remove undefined values
      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) delete updates[key];
      });

      await breachService.updateBreachStatus(selectedBreach.id, statusUpdate.status, updates);
      setSnackbar({
        open: true,
        message: 'Breach status updated successfully',
        severity: 'success',
      });
      handleCloseStatusDialog();
      loadBreaches();
      loadStatistics();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error updating breach status: ' + error.message,
        severity: 'error',
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 0) {
      setFilterStatus('all');
    } else if (newValue === 1) {
      setFilterStatus('detected');
    } else if (newValue === 2) {
      setFilterStatus('assessed');
    } else if (newValue === 3) {
      setFilterStatus('reported');
    } else if (newValue === 4) {
      setFilterStatus('resolved');
    }
  };

  const getHoursUntilDeadline = (deadline) => {
    if (!deadline) return null;
    return breachService.getHoursUntilDeadline(deadline);
  };

  const isOverdue = (breach) => {
    return breachService.isBreachOverdue(breach);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('breaches.management')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          color="error"
        >
          {t('breaches.reportNew')}
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.totalBreaches')}
              </Typography>
              <Typography variant="h5">{statistics.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.detected')}
              </Typography>
              <Typography variant="h5" color="error">
                {statistics.detected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.assessed')}
              </Typography>
              <Typography variant="h5" color="warning.main">
                {statistics.assessed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.reported')}
              </Typography>
              <Typography variant="h5" color="info.main">
                {statistics.reported}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.resolved')}
              </Typography>
              <Typography variant="h5" color="success.main">
                {statistics.resolved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                {t('breaches.overdue')}
              </Typography>
              <Typography variant="h5" color="error">
                {statistics.overdue}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overdue Alert */}
      {statistics.overdue > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <strong>Warning:</strong> {statistics.overdue} breach(es) are overdue for authority notification (past 72-hour deadline).
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label={t('breaches.all')} />
          <Tab label={t('breaches.detected')} />
          <Tab label={t('breaches.assessed')} />
          <Tab label={t('breaches.reported')} />
          <Tab label={t('breaches.resolved')} />
        </Tabs>
      </Paper>

      {/* Breaches Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Detected</TableCell>
              <TableCell>Deadline</TableCell>
              <TableCell>Affected Customers</TableCell>
              <TableCell>Authority Notified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breaches.map((breach) => {
              const hoursUntilDeadline = getHoursUntilDeadline(breach.notification_deadline);
              const overdue = isOverdue(breach);

              return (
                <TableRow key={breach.id} sx={{ bgcolor: overdue ? 'error.light' : 'inherit' }}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {breach.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {BREACH_TYPES.find((t) => t.value === breach.breach_type)?.label || breach.breach_type}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={breach.severity.toUpperCase()}
                      color={breachService.getSeverityColor(breach.severity)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={breach.status.toUpperCase()}
                      color={breachService.getStatusColor(breach.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {breach.detected_at
                      ? format(new Date(breach.detected_at), 'MMM dd, yyyy HH:mm')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {breach.notification_deadline && (
                      <Box>
                        <Typography variant="body2">
                          {format(new Date(breach.notification_deadline), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                        {overdue && (
                          <Chip label="OVERDUE" color="error" size="small" sx={{ mt: 0.5 }} />
                        )}
                        {!overdue && hoursUntilDeadline !== null && hoursUntilDeadline > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {hoursUntilDeadline}h remaining
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{breach.affected_customers_count || 0}</TableCell>
                  <TableCell>
                    {breach.reported_to_authority ? (
                      <Chip
                        label={breach.authority_name || 'Yes'}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip label="No" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Update Status">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenStatusDialog(breach)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {breaches.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No breaches found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Breach Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Report New Data Breach</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Breach Type</InputLabel>
                <Select
                  value={formData.breachType}
                  onChange={(e) => setFormData({ ...formData, breachType: e.target.value })}
                  label="Breach Type"
                >
                  {BREACH_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  label="Severity"
                >
                  {SEVERITY_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Occurred At (Optional)"
                value={formData.occurredAt}
                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Affected Data Types</InputLabel>
                <Select
                  multiple
                  value={formData.affectedDataTypes}
                  onChange={(e) => setFormData({ ...formData, affectedDataTypes: e.target.value })}
                  label="Affected Data Types"
                >
                  {DATA_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Root Cause (Optional)"
                value={formData.rootCause}
                onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Containment Measures (Optional)"
                value={formData.containmentMeasures}
                onChange={(e) => setFormData({ ...formData, containmentMeasures: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Mitigation Actions (Optional)"
                value={formData.mitigationActions}
                onChange={(e) => setFormData({ ...formData, mitigationActions: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleCreateBreach}
            variant="contained"
            disabled={!formData.description}
            color="error"
          >
            Create Breach Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog} maxWidth="md" fullWidth>
        <DialogTitle>Update Breach Status</DialogTitle>
        <DialogContent>
          {selectedBreach && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Breach:</strong> {selectedBreach.description.substring(0, 100)}
                  {selectedBreach.description.length > 100 && '...'}
                </Typography>
                {selectedBreach.notification_deadline && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Notification Deadline:</strong>{' '}
                    {format(new Date(selectedBreach.notification_deadline), 'MMM dd, yyyy HH:mm')}
                    {isOverdue(selectedBreach) && (
                      <Chip label="OVERDUE" color="error" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                )}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                      label="Status"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {(statusUpdate.status === 'reported' || statusUpdate.status === 'resolved') && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Authority Notification Date"
                        value={statusUpdate.authorityNotificationDate}
                        onChange={(e) =>
                          setStatusUpdate({ ...statusUpdate, authorityNotificationDate: e.target.value })
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Authority Name"
                        value={statusUpdate.authorityName}
                        onChange={(e) =>
                          setStatusUpdate({ ...statusUpdate, authorityName: e.target.value })
                        }
                        placeholder="e.g., Spanish DPA (AEPD)"
                      />
                    </Grid>
                  </>
                )}

                {selectedBreach.customer_notification_required && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="Customer Notification Date"
                        value={statusUpdate.customerNotificationDate}
                        onChange={(e) =>
                          setStatusUpdate({ ...statusUpdate, customerNotificationDate: e.target.value })
                        }
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Customers Notified Count"
                        value={statusUpdate.customersNotifiedCount}
                        onChange={(e) =>
                          setStatusUpdate({
                            ...statusUpdate,
                            customersNotifiedCount: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </Grid>
                  </>
                )}

                {statusUpdate.status === 'resolved' && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      Marking this breach as resolved will close the incident record.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog}>Cancel</Button>
          <Button onClick={handleUpdateStatus} variant="contained" color="primary">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />
    </Box>
  );
};

export default Breaches;

