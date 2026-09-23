// Presentational component for the BoatPrep "DivePreparationTab" tab.
// Extracted from BoatPrep.jsx as part of the Phase 5.2 shared-hook split;
// all state/logic lives in useBoatPrepData() and is passed in via props.
import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  AutoAwesome as AutoAwesomeIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

const DivePreparationTab = (props) => {
  const {
    allDiveSites, allStaff, allocateRental, assignDiverToBoat, autoAssignDivers, boats, 
    boatsToDisplay, calculateBoatsNeeded, clearAllAssignments, customersWithBookings, date, 
    diveSites, getAvailableStaffForBoat, getBoatCustomers, getBoatDiveSite, 
    getBoatDiveSiteStatus, getBoatDiveSiteSuggestions, getBoatStaff, getDiverSkillLevel, 
    getSkillCounts, getStaffAssignedBoat, getStaffValidationErrors, handleAllocate, hasBoats, 
    locationId, renderDiverItem, requiresCaptain, requiresGuide, savePreparation, searchQuery, 
    session, setAllocateRental, setBoatDiveSite, setBoatDiveSiteStatusValue, setBoatStaff, 
    setDate, setSearchQuery, setSession, setShoreDiveAssignments, setShoreDiveSiteId, 
    setShoreDiveStaff, setShowAllBoats, shoreDiveCustomers, shoreDiveSiteId, 
    shoreDiveSiteSuggestions, shoreDiveSkillCounts, shoreDiveStaff, shouldUseBoatPrep, 
    showAllBoats, t, 
    unassignedCustomers
  } = props;

  return (
        <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">
              {shouldUseBoatPrep ? t('boatPrep.boatPreparation') : t('boatPrep.shoreDivePreparation')}
        </Typography>
            {shouldUseBoatPrep && (
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={autoAssignDivers}>
              Auto-Assign
            </Button>
            <Button variant="outlined" color="error" onClick={clearAllAssignments}>
              Clear All
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Plan Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Session"
                  select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="morning">Morning</MenuItem>
                  {hasBoats && <MenuItem value="10:15">10:15</MenuItem>}
                  <MenuItem value="afternoon">Afternoon</MenuItem>
                  <MenuItem value="night">Night</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {shouldUseBoatPrep ? 'Global Dive Site (optional - can be set per boat)' : 'Dive Site Selection'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {shouldUseBoatPrep 
                    ? 'Select dive sites individually for each boat below'
                    : 'Select dive site for this shore dive session below'
                  }
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Boats Grid or Shore Dive Group */}
        <Grid item xs={12}>
          {shouldUseBoatPrep ? (
            <>
              {boats.length > boatsToDisplay.length && !showAllBoats && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => setShowAllBoats(true)}
                    >
                      Show All {boats.length} Boats
                    </Button>
                  }
                >
                  Showing {boatsToDisplay.length} of {boats.length} boats (based on {customersWithBookings.length} divers)
                </Alert>
              )}
              {showAllBoats && boats.length > calculateBoatsNeeded && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      size="small" 
                      onClick={() => setShowAllBoats(false)}
                    >
                      Show Only Needed Boats
                    </Button>
                  }
                >
                  Showing all {boats.length} boats (only {calculateBoatsNeeded} needed for {customersWithBookings.length} divers)
                </Alert>
              )}
              <Grid container spacing={2}>
                {boatsToDisplay.map(boat => {
              const boatCustomers = getBoatCustomers(boat.id);
              const staff = getBoatStaff(boat.id);
              const totalCapacity = boat.capacity || 10;
              
              // Calculate staff count (1 captain if assigned + guides + trainees)
              const staffCount = (staff.captain ? 1 : 0) + (staff.guides?.length || 0) + (staff.trainees?.length || 0);
              
              // Available spots for divers = total capacity - staff
              const diverCapacity = totalCapacity - staffCount;
              const diversAssigned = boatCustomers.length;
              const remaining = diverCapacity - diversAssigned;
              const skillCounts = getSkillCounts(boatCustomers);
              const isOverCapacity = diversAssigned > diverCapacity;
              
              return (
                <Grid item xs={12} md={6} key={boat.id}>
                  <Paper 
                    sx={{ 
                      p: 2,
                      border: isOverCapacity ? '2px solid' : '1px solid',
                      borderColor: isOverCapacity ? 'error.main' : 'divider',
                      bgcolor: isOverCapacity ? 'error.light' : 'background.paper'
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="h6">{boat.name}</Typography>
                      <Chip 
                        label={`${diversAssigned}/${diverCapacity} divers`}
                        color={isOverCapacity ? 'error' : diversAssigned === diverCapacity ? 'warning' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Total capacity: {totalCapacity} | Staff: {staffCount} | Available for divers: {diverCapacity}
                    </Typography>
                    
                    {isOverCapacity && (
                      <Alert severity="error" sx={{ mb: 1 }}>Over capacity! {diversAssigned - diverCapacity} too many divers</Alert>
                    )}
                    
                    {/* Staff Assignment - Step 1 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      1. Assign Staff
                    </Typography>
                    {(() => {
                      const staff = getBoatStaff(boat.id);
                      const errors = getStaffValidationErrors(boat.id);
                      const diveSiteId = getBoatDiveSite(boat.id);
                      const needsCaptain = requiresCaptain(diveSiteId, session, diveSites);
                      const needsGuide = requiresGuide(session);
                      // Map to staff_role enum values: boat_captain, instructor, divemaster, assistant, intern, etc.
                      const captains = getAvailableStaffForBoat(boat.id, 'boat_captain');
                      // Guides can be divemaster, instructor, or assistant
                      const guides = getAvailableStaffForBoat(boat.id, 'divemaster')
                        .concat(getAvailableStaffForBoat(boat.id, 'instructor'))
                        .concat(getAvailableStaffForBoat(boat.id, 'assistant'));
                      const trainees = getAvailableStaffForBoat(boat.id, 'intern');
                      
                      // Get currently assigned staff on other boats for display
                      const getAssignedBoatName = (staffId) => {
                        const assignedBoat = getStaffAssignedBoat(staffId);
                        if (assignedBoat && assignedBoat !== boat.id) {
                          const otherBoat = boats.find(b => b.id === assignedBoat);
                          return otherBoat?.name;
                        }
                        return null;
                      };
                      
                      return (
                        <Box sx={{ mb: 2 }}>
                          {needsCaptain && (
                            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                              <InputLabel>Captain *</InputLabel>
                              <Select
                                value={staff.captain || ''}
                                label="Captain *"
                                onChange={(e) => {
                                  const newCaptain = e.target.value;
                                  // If changing captain, clear from previous boat
                                  if (staff.captain && staff.captain !== newCaptain) {
                                    const prevBoat = getStaffAssignedBoat(staff.captain);
                                    if (prevBoat && prevBoat !== boat.id) {
                                      const prevStaff = getBoatStaff(prevBoat);
                                      setBoatStaff(prevBoat, { ...prevStaff, captain: null });
                                    }
                                  }
                                  setBoatStaff(boat.id, { ...staff, captain: newCaptain });
                                }}
                              >
                                <MenuItem value="">None</MenuItem>
                                {captains.map(c => (
                                  <MenuItem key={c.id} value={c.id}>
                                    {c.name}
                                    {getAssignedBoatName(c.id) && (
                                      <Chip label={`On ${getAssignedBoatName(c.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                    )}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                          {needsGuide && (
                            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                              <InputLabel>Guides *</InputLabel>
                              <Select
                                multiple
                                value={staff.guides || []}
                                label="Guides *"
                                onChange={(e) => {
                                  const newGuides = e.target.value;
                                  // Remove guides that are no longer selected
                                  (staff.guides || []).forEach(guideId => {
                                    if (!newGuides.includes(guideId)) {
                                      const prevBoat = getStaffAssignedBoat(guideId);
                                      if (prevBoat && prevBoat !== boat.id) {
                                        const prevStaff = getBoatStaff(prevBoat);
                                        setBoatStaff(prevBoat, {
                                          ...prevStaff,
                                          guides: (prevStaff.guides || []).filter(id => id !== guideId)
                                        });
                                      }
                                    }
                                  });
                                  setBoatStaff(boat.id, { ...staff, guides: newGuides });
                                }}
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map(id => {
                                      const guide = allStaff.find(s => s.id === id);
                                      return guide ? <Chip key={id} label={guide.name} size="small" /> : null;
                                    })}
                                  </Box>
                                )}
                              >
                                {guides.map(g => (
                                  <MenuItem key={g.id} value={g.id}>
                                    {g.name}
                                    {getAssignedBoatName(g.id) && (
                                      <Chip label={`On ${getAssignedBoatName(g.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                    )}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <InputLabel>Interns/Trainees</InputLabel>
                            <Select
                              multiple
                              value={staff.trainees || []}
                              label="Interns/Trainees"
                              onChange={(e) => {
                                const newTrainees = e.target.value;
                                // Remove trainees that are no longer selected
                                (staff.trainees || []).forEach(traineeId => {
                                  if (!newTrainees.includes(traineeId)) {
                                    const prevBoat = getStaffAssignedBoat(traineeId);
                                    if (prevBoat && prevBoat !== boat.id) {
                                      const prevStaff = getBoatStaff(prevBoat);
                                      setBoatStaff(prevBoat, {
                                        ...prevStaff,
                                        trainees: (prevStaff.trainees || []).filter(id => id !== traineeId)
                                      });
                                    }
                                  }
                                });
                                setBoatStaff(boat.id, { ...staff, trainees: newTrainees });
                              }}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map(id => {
                                    const trainee = allStaff.find(s => s.id === id);
                                    return trainee ? <Chip key={id} label={trainee.name} size="small" /> : null;
                                  })}
                                </Box>
                              )}
                            >
                              {trainees.map(t => (
                                <MenuItem key={t.id} value={t.id}>
                                  {t.name}
                                  {getAssignedBoatName(t.id) && (
                                    <Chip label={`On ${getAssignedBoatName(t.id)}`} size="small" color="warning" sx={{ ml: 1 }} />
                                  )}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {errors.length > 0 && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              {errors.map((err, idx) => (
                                <Box key={idx}>{err}</Box>
                              ))}
                            </Alert>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* Dive Site Assignment - Step 2 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      2. Assign Planned Dive Site
                    </Typography>
                    {(() => {
                      const boatSiteSuggestions = getBoatDiveSiteSuggestions(boat.id);
                      const selectedSiteId = getBoatDiveSite(boat.id);
                      const siteStatus = getBoatDiveSiteStatus(boat.id);
                      const selectedSite = allDiveSites.find(s => s.id === selectedSiteId);
                      
                      return (
                        <Box sx={{ mb: 2 }}>
                          {boatSiteSuggestions.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                              Suggested sites for this boat's divers: {boatSiteSuggestions.map(s => s.name).join(', ')}
                          </Typography>
                          )}
                          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                            <InputLabel>Select Dive Site</InputLabel>
                                  <Select
                              value={selectedSiteId || ''}
                              label="Select Dive Site"
                                    onChange={(e) => {
                                      const newSiteId = e.target.value;
                                        setBoatDiveSite(boat.id, newSiteId);
                                        // Reset confirmation if site changes
                                if (siteStatus.confirmed || siteStatus.completed) {
                                        setBoatDiveSiteStatusValue(boat.id, { confirmed: false, completed: false });
                                      }
                                    }}
                                  >
                              <MenuItem value="">
                                <em>None selected</em>
                                    </MenuItem>
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
                          {selectedSiteId && (
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={1}>
                              <Typography variant="caption" color="primary">
                                Planned site: {selectedSite?.name || 'Unknown site'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                (Confirmation will be done after the dive in Post-Dive Reports)
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                    
                    {/* Divers Assignment - Step 3 */}
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      3. Assign Divers (by skill level)
                    </Typography>
                    <Box display="flex" gap={1} mb={1} flexWrap="wrap">
                      {skillCounts.beginner > 0 && (
                        <Chip label={`${skillCounts.beginner} Beginner`} size="small" color="info" />
                      )}
                      {skillCounts.intermediate > 0 && (
                        <Chip label={`${skillCounts.intermediate} Intermediate`} size="small" color="warning" />
                      )}
                      {skillCounts.advanced > 0 && (
                        <Chip label={`${skillCounts.advanced} Advanced`} size="small" color="success" />
                      )}
                    </Box>
                    <List dense sx={{ maxHeight: 300, overflow: 'auto', mb: 1 }}>
                      {boatCustomers.map(c => renderDiverItem(c, true, boat.id))}
                      {boatCustomers.length === 0 && (
                        <ListItem>
                          <ListItemText primary="No divers assigned" secondary={`${remaining} spots available`} />
                        </ListItem>
                      )}
                    </List>
                    
                    {remaining > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {remaining} spot{remaining !== 1 ? 's' : ''} available
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              );
            })}
              </Grid>
            </>
          ) : (
            /* Shore Dive Preparation (No Boats) */
            <Paper sx={{ p: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Shore dive location - No boats required. All dives are from the shore.
              </Alert>
              
              {/* Staff Assignment for Shore Dive */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                1. Assign Staff
              </Typography>
              {(() => {
                const needsGuide = requiresGuide(session);
                // Guides can be divemaster, instructor, or assistant
                const guides = getAvailableStaffForBoat(null, 'divemaster')
                  .concat(getAvailableStaffForBoat(null, 'instructor'))
                  .concat(getAvailableStaffForBoat(null, 'assistant'));
                const trainees = getAvailableStaffForBoat(null, 'intern');
                const errors = [];
                
                if (needsGuide && shoreDiveStaff.guides.length === 0) {
                  errors.push('At least one guide required for morning/afternoon dives');
                }
                
                return (
                  <Box sx={{ mb: 3 }}>
                    {needsGuide && (
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Guides *</InputLabel>
                        <Select
                          multiple
                          value={shoreDiveStaff.guides || []}
                          label="Guides *"
                          onChange={(e) => setShoreDiveStaff({ ...shoreDiveStaff, guides: e.target.value })}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map(id => {
                                const guide = guides.find(g => g.id === id);
                                return guide ? <Chip key={id} label={guide.name} size="small" /> : null;
                              })}
                            </Box>
                          )}
                        >
                          {guides.map(g => (
                            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Interns/Trainees</InputLabel>
                      <Select
                        multiple
                        value={shoreDiveStaff.trainees || []}
                        label="Interns/Trainees"
                        onChange={(e) => setShoreDiveStaff({ ...shoreDiveStaff, trainees: e.target.value })}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map(id => {
                              const trainee = trainees.find(t => t.id === id);
                              return trainee ? <Chip key={id} label={trainee.name} size="small" /> : null;
                            })}
                          </Box>
                        )}
                      >
                        {trainees.map(t => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {errors.length > 0 && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {errors.map((err, idx) => (
                          <Box key={idx}>{err}</Box>
                        ))}
                      </Alert>
                    )}
                  </Box>
                );
              })()}
              
              {/* Dive Site Assignment */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                2. Assign Dive Site
              </Typography>
              <Box sx={{ mb: 3 }}>
                {shoreDiveSiteSuggestions.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Suggested sites for assigned divers: {shoreDiveSiteSuggestions.map(s => s.name).join(', ')}
                </Typography>
                )}
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Select Dive Site</InputLabel>
                  <Select
                    value={shoreDiveSiteId || ''}
                    label="Select Dive Site"
                    onChange={(e) => setShoreDiveSiteId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>None selected</em>
                    </MenuItem>
                    {diveSites
                      .filter(s => s.locationId === locationId)
                      .map(site => (
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
                {shoreDiveSiteId && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
                    Selected: {diveSites.find(s => s.id === shoreDiveSiteId)?.name || 'Unknown site'}
                  </Typography>
                )}
              </Box>
              
              {/* Divers Assignment */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                3. Assign Divers (by skill level)
              </Typography>
              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                {shoreDiveSkillCounts.beginner > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.beginner} Beginner`} size="small" color="info" />
                )}
                {shoreDiveSkillCounts.intermediate > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.intermediate} Intermediate`} size="small" color="warning" />
                )}
                {shoreDiveSkillCounts.advanced > 0 && (
                  <Chip label={`${shoreDiveSkillCounts.advanced} Advanced`} size="small" color="success" />
                )}
              </Box>
              <List dense sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {shoreDiveCustomers.map(c => {
                  const skill = getDiverSkillLevel(c);
                  const own = c.preferences?.ownEquipment;
                  const sizes = c.preferences || {};
                  const tankSize = sizes.tankSize || '12L';
                  const equipmentText = own ? 'Own equipment' : `Rental (BCD ${sizes.bcdSize || '-'}, Fins ${sizes.finsSize || '-'}, Boots ${sizes.bootsSize || '-'}, Wetsuit ${sizes.wetsuitSize || '-'})`;
                  const rest = `${skill} · Tank: ${tankSize} · ${equipmentText}`;
                  return (
                    <ListItem 
                      key={c.id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 0.5,
                        bgcolor: 'background.paper'
                      }}
                      secondaryAction={
                        <IconButton
                          size="small"
                          onClick={() => setShoreDiveAssignments(prev => prev.filter(id => id !== c.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={
                          <Box component="span">
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {c.firstName} {c.lastName}
                            </Box>
                            <Box component="span"> — {rest}</Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
                {shoreDiveCustomers.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No divers assigned yet" />
                  </ListItem>
                )}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Unassigned Divers */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1">
                  Unassigned Divers ({unassignedCustomers.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing divers with bookings for {date} - {session === '10:15' ? '10:15' : session.charAt(0).toUpperCase() + session.slice(1)} session
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Search divers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ width: 300 }}
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                  {boatsToDisplay.map(boat => (
                    <Button
                      key={boat.id}
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        const boatCustomers = getBoatCustomers(boat.id);
                        const boatStaff = getBoatStaff(boat.id);
                        const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                        const diverCapacity = boat.capacity - staffCount;
                        const unassigned = unassignedCustomers.filter(c => {
                          return boatCustomers.length < diverCapacity;
                        });
                        if (unassigned.length > 0) {
                          assignDiverToBoat(unassigned[0].id, boat.id);
                        }
                      }}
                      disabled={(() => {
                        const boatCustomers = getBoatCustomers(boat.id);
                        const boatStaff = getBoatStaff(boat.id);
                        const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                        const diverCapacity = boat.capacity - staffCount;
                        return unassignedCustomers.length === 0 || boatCustomers.length >= diverCapacity;
                      })()}
                    >
                      Add to {boat.name}
                    </Button>
                  ))}
                  {!showAllBoats && boats.length > boatsToDisplay.length && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      onClick={() => setShowAllBoats(true)}
                    >
                      Show All Boats ({boats.length})
                    </Button>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {unassignedCustomers.map(customer => (
                    <Box key={customer.id} sx={{ mb: 1 }}>
                      {renderDiverItem(customer)}
                      <Box display="flex" gap={0.5} mt={0.5} flexWrap="wrap">
                        {hasBoats ? (
                          boatsToDisplay.map(boat => {
                            const boatCustomers = getBoatCustomers(boat.id);
                            const boatStaff = getBoatStaff(boat.id);
                            const staffCount = (boatStaff.captain ? 1 : 0) + (boatStaff.guides?.length || 0) + (boatStaff.trainees?.length || 0);
                            const diverCapacity = boat.capacity - staffCount;
                            const isFull = boatCustomers.length >= diverCapacity;
                            const spotsLeft = diverCapacity - boatCustomers.length;
                            return (
                              <Button
                                key={boat.id}
                                size="small"
                                variant="outlined"
                                onClick={() => assignDiverToBoat(customer.id, boat.id)}
                                disabled={isFull}
                              >
                                {boat.name} {isFull ? '(Full)' : `(${spotsLeft} left)`}
                              </Button>
                            );
                          })
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setShoreDiveAssignments(prev => [...prev, customer.id])}
                          >
                            Add to Shore Dive Group
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {unassignedCustomers.length === 0 && (
                    <ListItem>
                      <ListItemText primary="All divers assigned" />
                    </ListItem>
                  )}
                </List>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={allocateRental} 
                    onChange={(e) => setAllocateRental(e.target.checked)} 
                  />
                } 
                label="Auto-allocate rental equipment on save" 
              />
              <Box display="flex" gap={2}>
                <Button variant="contained" onClick={handleAllocate}>
                  Allocate Equipment Now
                </Button>
                <Button variant="contained" color="primary" onClick={savePreparation}>
                  {shouldUseBoatPrep ? t('boatPrep.saveAll') : t('boatPrep.saveShore')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
        </>

  );
};

export default DivePreparationTab;
