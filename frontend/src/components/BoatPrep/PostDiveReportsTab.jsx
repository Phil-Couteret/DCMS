// Presentational component for the BoatPrep "PostDiveReportsTab" tab.
// Extracted from BoatPrep.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useBoatPrepData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon
} from '@mui/icons-material';

const PostDiveReportsTab = (props) => {
  const {
    allDiveSites, boats, deleteBoatPrep, editingReports, postDivePreparations, reportDate, 
    savePostDiveReport, setReportDate, t, updatePostDiveReport, 
    updatePostDiveTimestamp
  } = props;

  return (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              Post-Dive Reports
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
    </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Confirm and complete dives after boats return. Update the actual dive site if it differs from the planned site, and add notes for official marine authority documentation.
          </Alert>

          {postDivePreparations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No prepared dives found for {reportDate}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('boatPrep.preparedDivesHint')}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {postDivePreparations.map((prep) => {
                const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
                const plannedSite = allDiveSites.find(s => s.id === prep.diveSiteId);
                const currentActualSiteId = editingReports[prep.id]?.actualDiveSiteId !== undefined 
                  ? editingReports[prep.id].actualDiveSiteId 
                  : (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId);
                const actualSite = allDiveSites.find(s => s.id === currentActualSiteId);
                const currentNotes = editingReports[prep.id]?.notes !== undefined 
                  ? editingReports[prep.id].notes 
                  : (prep.postDiveReport?.notes || '');
                const isCompleted = prep.diveSiteStatus?.completed === true;
                const isConfirmed = prep.diveSiteStatus?.confirmed === true;

                return (
                  <Grid item xs={12} md={6} key={prep.id}>
                    <Paper sx={{ p: 3, border: '1px solid', borderColor: isCompleted ? 'success.main' : 'divider' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">
                          {boat ? boat.name : 'Shore Dive'} - {prep.session}
                        </Typography>
                        {isCompleted ? (
                          <Chip label="Completed" color="success" size="small" />
                        ) : (
                          <Chip label="Pending Confirmation" color="warning" size="small" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Date: {prep.date} | Divers: {prep.diverIds?.length || 0}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Planned Dive Site: <strong>{plannedSite?.name || 'Unknown'}</strong>
                      </Typography>
                      {!isConfirmed && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          This dive needs to be confirmed after the boat returns.
                        </Alert>
                      )}

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Actual Dive Site (Official Report)</InputLabel>
                        <Select
                          value={currentActualSiteId || ''}
                          label="Actual Dive Site (Official Report)"
                          onChange={(e) => updatePostDiveReport(prep.id, 'actualDiveSiteId', e.target.value)}
                        >
                          {allDiveSites.map(site => (
                            <MenuItem key={site.id} value={site.id}>
                              {site.name}
                              {site.difficultyLevel && (
                                <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                  ({site.difficultyLevel})
                                </Typography>
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {plannedSite && currentActualSiteId && prep.diveSiteId !== currentActualSiteId && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          <strong>Note:</strong> Planned site was <strong>{plannedSite.name}</strong>, but actual site is <strong>{actualSite?.name || 'Unknown'}</strong>
                        </Alert>
                      )}

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Entry Time"
                            type="time"
                            fullWidth
                            value={editingReports[prep.id]?.timestamps?.entryTime || prep.postDiveReport?.entryTime || ''}
                            onChange={(e) => updatePostDiveTimestamp(prep.id, 'entryTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Exit Time"
                            type="time"
                            fullWidth
                            value={editingReports[prep.id]?.timestamps?.exitTime || prep.postDiveReport?.exitTime || ''}
                            onChange={(e) => updatePostDiveTimestamp(prep.id, 'exitTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                      </Grid>

                      <TextField
                        label="Post-Dive Notes (Optional)"
                        fullWidth
                        multiline
                        rows={3}
                        value={currentNotes}
                        onChange={(e) => updatePostDiveReport(prep.id, 'notes', e.target.value)}
                        placeholder="Add any additional notes about the dive (conditions, changes, etc.) for official documentation..."
                        size="small"
                        sx={{ mb: 2 }}
                      />

                      <Box display="flex" gap={2} flexDirection="column">
                        <Box display="flex" gap={2}>
                          <Button 
                            variant={isCompleted ? "outlined" : "contained"}
                            color={isCompleted ? "success" : "primary"}
                            onClick={() => savePostDiveReport(prep.id, !isCompleted)}
                            fullWidth
                          >
                            {isCompleted ? 'Already Completed' : 'Confirm & Complete Dive'}
                          </Button>
                          {!isCompleted && (
                            <Button 
                              variant="outlined"
                              color="primary"
                              onClick={() => savePostDiveReport(prep.id, false)}
                              fullWidth
                            >
                              Save (Don't Complete)
                            </Button>
                          )}
                        </Box>
                        <Button 
                          variant="outlined"
                          color="error"
                          onClick={() => deleteBoatPrep(prep.id)}
                          startIcon={<DeleteIcon />}
                          fullWidth
                        >
                          Delete/Cancel Dive
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>

  );
};

export default PostDiveReportsTab;
