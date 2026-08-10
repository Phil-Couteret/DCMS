import React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Grid,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalGasStation as TankIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

/**
 * Phase 6.5 extraction: Tanks/Cylinders testing tracker tab, split out of
 * Equipment.jsx. Presentational only - all state and handlers come from
 * useEquipmentData() via props.
 */
export default function TanksTab(props) {
  const {
    canManageEquipment,
    isGlobalAdmin,
    locations,
    dueSoonTanks,
    overdueTanks,
    editingTank,
    getTestStatus,
    handleAddTank,
    handleBulkImportTanks,
    handleDeleteTank,
    handleEditTank,
    handleSaveTank,
    handleTankSort,
    setTankBulkDialogOpen,
    setTankDialogOpen,
    setTankFilter,
    setTankFormData,
    setTankSizeFilter,
    sortedTanks,
    tankBulkDialogOpen,
    tankDialogOpen,
    tankFilter,
    tankFormData,
    tankOrder,
    tankOrderBy,
    tankSizeFilter,
  } = props;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tanks / Cylinders Testing Tracker</Typography>
        {canManageEquipment && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setTankBulkDialogOpen(true)}
            >
              Bulk Import
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTank}
            >
              Add Tank
            </Button>
          </Box>
        )}
      </Box>

      {(overdueTanks > 0 || dueSoonTanks > 0) && (
        <Box sx={{ mb: 3 }}>
          {overdueTanks > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {overdueTanks} tank(s) have overdue tests
            </Alert>
          )}
          {dueSoonTanks > 0 && (
            <Alert severity="warning">
              {dueSoonTanks} tank(s) need testing within 30 days
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Size</InputLabel>
          <Select
            value={tankSizeFilter}
            label="Filter by Size"
            onChange={(e) => setTankSizeFilter(e.target.value)}
          >
            <MenuItem value="all">All Sizes</MenuItem>
            <MenuItem value="6">6 Liters</MenuItem>
            <MenuItem value="7">7 Liters</MenuItem>
            <MenuItem value="10">10 Liters</MenuItem>
            <MenuItem value="12">12 Liters</MenuItem>
            <MenuItem value="15">15 Liters</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Test Status</InputLabel>
          <Select
            value={tankFilter}
            label="Filter by Test Status"
            onChange={(e) => setTankFilter(e.target.value)}
          >
            <MenuItem value="all">All Tanks</MenuItem>
            <MenuItem value="overdue">Overdue Tests</MenuItem>
            <MenuItem value="dueSoon">Due Soon (30 days)</MenuItem>
            <MenuItem value="ok">All Tests OK</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {sortedTanks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TankIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tanks found
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'size' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'size'}
                    direction={tankOrderBy === 'size' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('size')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Size (L)
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'number' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'number'}
                    direction={tankOrderBy === 'number' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('number')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    #
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'lastVisualTest' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'lastVisualTest'}
                    direction={tankOrderBy === 'lastVisualTest' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('lastVisualTest')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Last Visual Test
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'nextVisualTest' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'nextVisualTest'}
                    direction={tankOrderBy === 'nextVisualTest' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('nextVisualTest')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Next Visual Test
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'lastHydrostaticTest' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'lastHydrostaticTest'}
                    direction={tankOrderBy === 'lastHydrostaticTest' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('lastHydrostaticTest')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Last Hydrostatic Test
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'nextHydrostaticTest' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'nextHydrostaticTest'}
                    direction={tankOrderBy === 'nextHydrostaticTest' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('nextHydrostaticTest')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Next Hydrostatic Test
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'serialNumber' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'serialNumber'}
                    direction={tankOrderBy === 'serialNumber' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('serialNumber')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Serial Number
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'netColour' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'netColour'}
                    direction={tankOrderBy === 'netColour' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('netColour')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Net Colour
                  </TableSortLabel>
                </TableCell>
                <TableCell 
                  sx={{ color: 'white', fontWeight: 'bold' }}
                  sortDirection={tankOrderBy === 'remarks' ? tankOrder : false}
                >
                  <TableSortLabel
                    active={tankOrderBy === 'remarks'}
                    direction={tankOrderBy === 'remarks' ? tankOrder : 'asc'}
                    onClick={() => handleTankSort('remarks')}
                    sx={{ color: 'white', '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                  >
                    Remarks
                  </TableSortLabel>
                </TableCell>
                {canManageEquipment && <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedTanks.map((tank) => {
                // Tank data is already enriched by loadTanks() using tankService
                const tankNumber = tank.number || '-';
                const tankSize = tank.size || '-';
                const serialNumber = tank.serialNumber || tank.serial_number || '-';
                const netColour = tank.netColour || '';
                const lastVisualTest = tank.lastVisualTest;
                const nextVisualTest = tank.nextVisualTest;
                const lastHydrostaticTest = tank.lastHydrostaticTest;
                const nextHydrostaticTest = tank.nextHydrostaticTest;
                const remarks = tank.remarks || tank.notes || '-';

                const visualStatus = getTestStatus(nextVisualTest);
                const hydroStatus = getTestStatus(nextHydrostaticTest);
                const getRowBgColor = () => {
                  if (visualStatus === 'overdue' || hydroStatus === 'overdue') return '#ffebee';
                  if (visualStatus === 'dueSoon' || hydroStatus === 'dueSoon') return '#fff3e0';
                  return 'white';
                };
                
                return (
                  <TableRow key={tank.id} sx={{ bgcolor: getRowBgColor() }}>
                    <TableCell>{tankSize}</TableCell>
                    <TableCell>{tankNumber}</TableCell>
                    <TableCell>
                      {lastVisualTest 
                        ? format(parseISO(lastVisualTest), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {nextVisualTest 
                          ? format(parseISO(nextVisualTest), 'dd/MM/yyyy')
                          : '-'}
                        {visualStatus === 'overdue' && <Chip label="OVERDUE" color="error" size="small" />}
                        {visualStatus === 'dueSoon' && <Chip label="DUE SOON" color="warning" size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {lastHydrostaticTest 
                        ? format(parseISO(lastHydrostaticTest), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {nextHydrostaticTest 
                          ? format(parseISO(nextHydrostaticTest), 'dd/MM/yyyy')
                          : '-'}
                        {hydroStatus === 'overdue' && <Chip label="OVERDUE" color="error" size="small" />}
                        {hydroStatus === 'dueSoon' && <Chip label="DUE SOON" color="warning" size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>{serialNumber}</TableCell>
                    <TableCell>
                      {netColour && (
                        <Chip 
                          label={netColour} 
                          size="small"
                          sx={{ 
                            bgcolor: netColour.toLowerCase() === 'black' ? '#424242' :
                                    netColour.toLowerCase() === 'blue' ? '#2196f3' :
                                    netColour.toLowerCase() === 'yellow' ? '#ffeb3b' :
                                    netColour.toLowerCase() === 'white' ? '#f5f5f5' : 'default',
                            color: netColour.toLowerCase() === 'yellow' || netColour.toLowerCase() === 'white' ? '#000' : '#fff'
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>{remarks}</TableCell>
                    {canManageEquipment && (
                      <TableCell>
                        <IconButton size="small" onClick={() => handleEditTank(tank)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteTank(tank.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tank Add/Edit Dialog */}
      <Dialog open={tankDialogOpen} onClose={() => setTankDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTank ? 'Edit Tank' : 'Add Tank'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Size (Liters)</InputLabel>
                <Select
                  value={tankFormData.size}
                  label="Size (Liters)"
                  onChange={(e) => setTankFormData({ ...tankFormData, size: e.target.value })}
                >
                  <MenuItem value="6">6</MenuItem>
                  <MenuItem value="7">7</MenuItem>
                  <MenuItem value="10">10</MenuItem>
                  <MenuItem value="12">12</MenuItem>
                  <MenuItem value="15">15</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Number"
                value={tankFormData.number}
                onChange={(e) => setTankFormData({ ...tankFormData, number: e.target.value })}
                placeholder="Sequential number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Serial Number"
                value={tankFormData.serialNumber}
                onChange={(e) => setTankFormData({ ...tankFormData, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Net Colour</InputLabel>
                <Select
                  value={tankFormData.netColour}
                  label="Net Colour"
                  onChange={(e) => setTankFormData({ ...tankFormData, netColour: e.target.value })}
                >
                  <MenuItem value="Black">Black</MenuItem>
                  <MenuItem value="Blue">Blue</MenuItem>
                  <MenuItem value="Yellow">Yellow</MenuItem>
                  <MenuItem value="White">White</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Visual Test"
                type="date"
                value={tankFormData.lastVisualTest}
                onChange={(e) => setTankFormData({ ...tankFormData, lastVisualTest: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Next Visual Test"
                type="date"
                value={tankFormData.nextVisualTest}
                onChange={(e) => setTankFormData({ ...tankFormData, nextVisualTest: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Hydrostatic Test"
                type="date"
                value={tankFormData.lastHydrostaticTest}
                onChange={(e) => setTankFormData({ ...tankFormData, lastHydrostaticTest: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Next Hydrostatic Test"
                type="date"
                value={tankFormData.nextHydrostaticTest}
                onChange={(e) => setTankFormData({ ...tankFormData, nextHydrostaticTest: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={3}
                value={tankFormData.remarks}
                onChange={(e) => setTankFormData({ ...tankFormData, remarks: e.target.value })}
                placeholder="Location, painted dates, test status, etc."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTankDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTank} variant="contained">
            {editingTank ? 'Update' : 'Add'} Tank
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tank Bulk Import Dialog */}
      <Dialog open={tankBulkDialogOpen} onClose={() => setTankBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Import Tanks</DialogTitle>
        <DialogContent>
          {isGlobalAdmin && locations.length > 0 && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Location *</InputLabel>
              <Select
                value={tankFormData.locationId || ''}
                label="Location *"
                onChange={(e) => setTankFormData({ ...tankFormData, locationId: e.target.value })}
                required
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a CSV file with tank data. The file should have the following columns:
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
              SIZE, NUMBER, SERIAL NUMBER, NET COLOUR, LAST TEST (VISUAL), NEXT TEST (VISUAL), LAST TEST (HYDROSTATIC), NEXT TEST (HYDROSTATIC), REMARKS
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Example:
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
              7, 1, 12431042, Black, 30/04/2020, 30/03/2026, 01/03/2028, 01/03/2028, basement
              10, 2, 2027/159, Blue, 31/01/2026, 01/04/2021, 01/02/2028, 01/04/2021, Painted feb 2024
              12, 3, D24374, Yellow, 01/05/2025, 01/05/2027, 30/05/2027, 01/05/2027, Las playitas 230923
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Required fields:</strong> SIZE, NUMBER, SERIAL NUMBER<br/>
            <strong>Date formats:</strong> DD/MM/YYYY or YYYY-MM-DD (leave empty or use "-" for missing dates)<br/>
            <strong>Note:</strong> Dates can be left empty if not available
          </Typography>
          <input
            type="file"
            accept=".csv"
            onChange={handleBulkImportTanks}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTankBulkDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
