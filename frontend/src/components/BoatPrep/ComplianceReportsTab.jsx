// Presentational component for the BoatPrep "ComplianceReportsTab" tab.
// Extracted from BoatPrep.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useBoatPrepData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

const ComplianceReportsTab = (props) => {
  const {
    allCustomers, allDiveSites, allStaff, boats, exportComplianceReport, 
    exportComplianceReportPDF, postDivePreparations, reportDate, 
    setReportDate
  } = props;

  return (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">
              Compliance Reports (Spanish Regulations)
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Report Date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              {(() => {
                const completedPrepsForReport = postDivePreparations.filter(prep => prep.diveSiteStatus?.completed === true);
                if (completedPrepsForReport.length > 0) {
                  return (
                    <Box display="flex" gap={2}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => exportComplianceReport(completedPrepsForReport)}
                      >
                        Download CSV
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => exportComplianceReportPDF(completedPrepsForReport)}
                      >
                        Download PDF
                      </Button>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            This report contains all data required for Spanish regulatory compliance, including gender breakdown and certifications.
            Only completed dives are included in compliance reports.
          </Alert>

          {(() => {
            const completedPrepsForReport = postDivePreparations.filter(prep => prep.diveSiteStatus?.completed === true);
            
            if (completedPrepsForReport.length === 0) {
              return (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No completed dives found for {reportDate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Complete dives in the Post-Dive Reports tab to generate compliance reports.
                  </Typography>
                </Paper>
              );
            }

            // Calculate gender breakdown for divers and guides
            const calculateGenderBreakdown = (prep) => {
              const divers = (prep.diverIds || []).map(id => allCustomers.find(c => c.id === id)).filter(Boolean);
              const guides = (prep.guideIds || []).map(id => allStaff.find(s => s.id === id)).filter(Boolean);
              
              const diversByGender = {
                male: divers.filter(d => d.gender === 'male').length,
                female: divers.filter(d => d.gender === 'female').length,
                unspecified: divers.filter(d => !d.gender || (d.gender !== 'male' && d.gender !== 'female')).length
              };

              // Guides gender breakdown (if staff have gender field, otherwise will show 0)
              const guidesByGender = {
                male: 0,
                female: 0,
                unspecified: guides.length
              };

              return { divers, guides, diversByGender, guidesByGender };
            };

            return (
              <Grid container spacing={3}>
                {completedPrepsForReport.map((prep) => {
                  const boat = prep.boatId ? boats.find(b => b.id === prep.boatId) : null;
                  const plannedSite = allDiveSites.find(s => s.id === prep.diveSiteId);
                  const actualSite = allDiveSites.find(s => s.id === (prep.postDiveReport?.actualDiveSiteId || prep.actualDiveSiteId || prep.diveSiteId));
                  const { divers, guides, diversByGender, guidesByGender } = calculateGenderBreakdown(prep);
                  const captain = prep.captainId ? allStaff.find(s => s.id === prep.captainId) : null;

                  // Get highest certification level for each diver
                  const getHighestCertification = (customer) => {
                    if (!customer?.certifications || customer.certifications.length === 0) return 'No certification';
                    // Sort by level priority (simplified - in production, use proper level hierarchy)
                    const sorted = [...customer.certifications].sort((a, b) => {
                      const levels = { 'instructor': 10, 'dm': 9, 'rescue': 8, 'aow': 7, 'ow': 6 };
                      return (levels[b.level?.toLowerCase()] || 0) - (levels[a.level?.toLowerCase()] || 0);
                    });
                    return `${sorted[0].agency || ''} ${sorted[0].level || ''}`.trim();
                  };

                  return (
                    <Grid item xs={12} key={prep.id}>
                      <Paper sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6">
                            {boat ? boat.name : 'Shore Dive'} - {prep.session} - {prep.date}
                          </Typography>
                          <Chip label="Completed" color="success" />
                        </Box>

                        <Grid container spacing={2}>
                          {/* Dive Information */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Dive Site Information
                            </Typography>
                            <Typography variant="body2"><strong>Planned:</strong> {plannedSite?.name || 'Unknown'}</Typography>
                            <Typography variant="body2"><strong>Actual:</strong> {actualSite?.name || plannedSite?.name || 'Unknown'}</Typography>
                            {prep.postDiveReport?.entryTime && (
                              <Typography variant="body2"><strong>Entry Time:</strong> {prep.postDiveReport.entryTime}</Typography>
                            )}
                            {prep.postDiveReport?.exitTime && (
                              <Typography variant="body2"><strong>Exit Time:</strong> {prep.postDiveReport.exitTime}</Typography>
                            )}
                          </Grid>

                          {/* Staff Information */}
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Staff
                            </Typography>
                            {captain && (
                              <Typography variant="body2"><strong>Captain:</strong> {captain.name || captain.firstName + ' ' + captain.lastName}</Typography>
                            )}
                            {guides.length > 0 && (
                              <>
                                <Typography variant="body2"><strong>Guides ({guides.length}):</strong></Typography>
                                {guides.map(g => (
                                  <Typography key={g.id} variant="body2" sx={{ ml: 2 }}>
                                    • {g.name || g.firstName + ' ' + g.lastName} - {g.role || 'Guide'}
                                  </Typography>
                                ))}
                                <Typography variant="caption" color="text.secondary">
                                  Gender breakdown: {guidesByGender.male}M / {guidesByGender.female}F / {guidesByGender.unspecified}U
                                </Typography>
                              </>
                            )}
                          </Grid>

                          {/* Divers Information */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2" color="primary" gutterBottom>
                              Divers ({divers.length} total)
                            </Typography>
                            <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell><strong>Name</strong></TableCell>
                                      <TableCell><strong>Gender</strong></TableCell>
                                      <TableCell><strong>Certification</strong></TableCell>
                                      <TableCell><strong>Nationality</strong></TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {divers.map(diver => (
                                      <TableRow key={diver.id}>
                                        <TableCell>{diver.firstName} {diver.lastName}</TableCell>
                                        <TableCell>{diver.gender ? (diver.gender.charAt(0).toUpperCase() + diver.gender.slice(1)) : 'Not specified'}</TableCell>
                                        <TableCell>{getHighestCertification(diver)}</TableCell>
                                        <TableCell>{diver.nationality || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Gender breakdown: {diversByGender.male} Male / {diversByGender.female} Female / {diversByGender.unspecified} Unspecified
                            </Typography>
                          </Grid>

                          {/* Summary for Regulatory Compliance */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 2 }} />
                            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Regulatory Compliance Summary
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Date</Typography>
                                  <Typography variant="body2"><strong>{prep.date}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Session</Typography>
                                  <Typography variant="body2"><strong>{prep.session}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Total Divers</Typography>
                                  <Typography variant="body2"><strong>{divers.length}</strong></Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="caption" color="text.secondary">Total Guides</Typography>
                                  <Typography variant="body2"><strong>{guides.length}</strong></Typography>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {prep.postDiveReport?.notes && (
                            <Grid item xs={12}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Additional Notes
                              </Typography>
                              <Typography variant="body2">{prep.postDiveReport.notes}</Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            );
          })()}
        </Box>

  );
};

export default ComplianceReportsTab;
