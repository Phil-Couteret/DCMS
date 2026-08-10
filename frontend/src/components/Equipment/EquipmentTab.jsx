import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import {
  ScubaDiving as DivingEquipmentIcon,
  DirectionsBike as BikeEquipmentIcon,
  Surfing as SurfEquipmentIcon,
  Search as SearchIcon,
  CheckCircle as AvailableIcon,
  Cancel as UnavailableIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

/**
 * Phase 6.5 extraction: Equipment/rental inventory tab, split out of
 * Equipment.jsx. Presentational only - all state and handlers come from
 * useEquipmentData() via props.
 */
export default function EquipmentTab(props) {
  const {
    t,
    canManageEquipment,
    isGlobalAdmin,
    isBikeRental,
    isSurfRental,
    isKiteSurfRental,
    locations,
    searchQuery,
    filterType, setFilterType,
    addDialogOpen, setAddDialogOpen,
    bulkDialogOpen, setBulkDialogOpen,
    editingEquipment,
    formData, setFormData,
    handleSearch,
    handleAddEquipment,
    handleEditEquipment,
    handleToggleAvailability,
    handleSaveEquipment,
    handleDeleteEquipment,
    handleBulkImport,
    getRevisionStatus,
    getConditionColor,
    filteredEquipment,
    availableCount,
    totalCount,
    overdueCount,
    dueSoonCount,
  } = props;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isGlobalAdmin ? 'Global Equipment Inventory' : t('equipment.title')}
        </Typography>
        {canManageEquipment && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isGlobalAdmin && (
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setBulkDialogOpen(true)}
              >
                {t('common.bulkImport')}
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddEquipment}
            >
              {t('equipment.add') || 'Add Equipment'}
            </Button>
          </Box>
        )}
        {!canManageEquipment && (
          <Alert severity="info" sx={{ maxWidth: 400 }}>
            You can view equipment and update availability status. Equipment management is restricted to owners and administrators.
          </Alert>
        )}
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.total')}</Typography>
              <Typography variant="h4" color="primary">
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.available')}</Typography>
              <Typography variant="h4" color="success.main">
                {availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={isGlobalAdmin ? 3 : 4}>
          <Card>
            <CardContent>
              <Typography variant="h6">{t('equipment.inUse')}</Typography>
              <Typography variant="h4" color="warning.main">
                {totalCount - availableCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {isGlobalAdmin && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Revision Due/Overdue</Typography>
                <Typography variant="h4" color={overdueCount > 0 ? "error.main" : "warning.main"}>
                  {overdueCount + dueSoonCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {isGlobalAdmin && (overdueCount > 0 || dueSoonCount > 0) && (
        <Box sx={{ mb: 3 }}>
          {overdueCount > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {overdueCount} equipment item(s) have overdue revisions
            </Alert>
          )}
          {dueSoonCount > 0 && (
            <Alert severity="warning">
              {dueSoonCount} equipment item(s) need revision within 3 months
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder={t('equipment.search')}
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
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {isSurfRental ? (
              <>
                <MenuItem value="surf_type">Board Types</MenuItem>
                <MenuItem value="surf_accessory">Accessories</MenuItem>
              </>
            ) : isKiteSurfRental ? (
              <>
                <MenuItem value="kite_type">Equipment Types</MenuItem>
                <MenuItem value="kite_accessory">Accessories</MenuItem>
              </>
            ) : isBikeRental ? (
              <>
                <MenuItem value="bike_type">Bike Types</MenuItem>
                <MenuItem value="rental_equipment">Rental Equipment</MenuItem>
              </>
            ) : (
              <>
                <MenuItem value="BCD">BCD</MenuItem>
                <MenuItem value="Regulator">Regulator</MenuItem>
                <MenuItem value="Mask">Mask</MenuItem>
                <MenuItem value="Fins">Fins</MenuItem>
                <MenuItem value="Boots">Boots</MenuItem>
                <MenuItem value="Wetsuit">Wetsuit</MenuItem>
                <MenuItem value="Semi-Dry">Semi-Dry</MenuItem>
                <MenuItem value="Dry Suit">Dry Suit</MenuItem>
                <MenuItem value="Computer">Computer</MenuItem>
                <MenuItem value="Torch">Torch</MenuItem>
                <MenuItem value="Accessory">Accessory</MenuItem>
              </>
            )}
          </Select>
        </FormControl>
      </Box>

      {filteredEquipment.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          {isSurfRental ? (
            <SurfEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          ) : isKiteSurfRental ? (
            <SurfEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          ) : isBikeRental ? (
            <BikeEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          ) : (
            <DivingEquipmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          )}
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchQuery ? (t('equipment.noResults') || 'No equipment found') : (t('equipment.noEquipment') || 'No equipment registered')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredEquipment.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6">
                      {(isSurfRental && (item.category === 'surf_type' || item.category === 'surf_accessory')) || (isBikeRental && (item.isBikeType || item.isRentalEquipment))
                        ? item.name
                        : `${item.brand || ''} ${item.model || ''}`.trim() || item.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                      {item.isAvailable ? (
                        <Chip
                          icon={<AvailableIcon />}
                          label={t('equipment.available')}
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<UnavailableIcon />}
                          label={t('equipment.inUse')}
                          color="error"
                          size="small"
                        />
                      )}
                      {isGlobalAdmin && getRevisionStatus(item.nextRevisionDate) && (
                        <Chip
                          icon={<WarningIcon />}
                          label={getRevisionStatus(item.nextRevisionDate) === 'overdue' ? 'Overdue' : 'Due Soon'}
                          color={getRevisionStatus(item.nextRevisionDate) === 'overdue' ? 'error' : 'warning'}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>

                  {(isSurfRental && (item.category === 'surf_type' || item.category === 'surf_accessory')) || (isKiteSurfRental && (item.category === 'kite_type' || item.category === 'kite_accessory')) ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.description || (item.surfTypeKey ? 'Board type' : item.kiteTypeKey ? 'Equipment type' : 'Accessory')}
                      </Typography>
                      {item.price != null && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {typeof item.price === 'number' ? `€${item.price.toFixed(2)}/day` : item.description}
                        </Typography>
                      )}
                    </>
                  ) : isBikeRental && (item.isBikeType || item.isRentalEquipment) ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {item.description || `Type: ${item.type}`}
                      </Typography>
                      {item.price && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Price: €{item.price.toFixed(2)}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type: {item.type} {item.size ? `(${item.size})` : ''}
                    </Typography>
                  )}
                  {item.serialNumber && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Serial: {item.serialNumber}
                    </Typography>
                  )}
                  {isGlobalAdmin && (
                    <>
                      {item.locationId && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Location: {locations.find(l => l.id === item.locationId)?.name || 'Unknown'}
                        </Typography>
                      )}
                      {item.purchaseDate && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Purchase: {item.purchaseDate} {item.warranty ? `(Warranty: ${item.warranty})` : ''}
                        </Typography>
                      )}
                      {item.nextRevisionDate && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Next Revision: {item.nextRevisionDate}
                        </Typography>
                      )}
                      {item.type === 'Regulator' && item.firstStageBrand && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" display="block">1st: {item.firstStageBrand} {item.firstStageModel}</Typography>
                          <Typography variant="caption" display="block">2nd: {item.secondStageBrand} {item.secondStageModel}</Typography>
                          <Typography variant="caption" display="block">Oct: {item.octopusBrand} {item.octopusModel}</Typography>
                        </Box>
                      )}
                    </>
                  )}
                  {!((isBikeRental && (item.isBikeType || item.isRentalEquipment)) || (isSurfRental && (item.category === 'surf_type' || item.category === 'surf_accessory')) || (isKiteSurfRental && (item.category === 'kite_type' || item.category === 'kite_accessory'))) ? (
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={item.condition || 'excellent'}
                        color={getConditionColor(item.condition)}
                        size="small"
                      />
                    </Box>
                  ) : null}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    {/* Rental equipment from pricing is read-only */}
                    {(isSurfRental && (item.category === 'surf_type' || item.category === 'surf_accessory')) || (isKiteSurfRental && (item.category === 'kite_type' || item.category === 'kite_accessory')) || (isBikeRental && (item.isBikeType || item.isRentalEquipment)) ? (
                      <Alert severity="info" sx={{ width: '100%', py: 0.5 }}>
                        {isSurfRental ? 'Pricing configured in Settings > Prices' : (item.isBikeType ? 'Bike type configured in Settings > Prices' : 'Pricing configured in Settings > Prices')}
                      </Alert>
                    ) : canManageEquipment ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditEquipment(item)}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteEquipment(item.id)}
                        >
                          {t('common.delete')}
                        </Button>
                      </>
                    ) : (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={item.isAvailable}
                            onChange={() => handleToggleAvailability(item)}
                            color="success"
                          />
                        }
                        label={item.isAvailable ? "Available" : "In Use"}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Equipment Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingEquipment ? (t('equipment.editTitle') || 'Edit Equipment') : (t('equipment.addTitle') || 'Add New Equipment')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={(t('equipment.form.name') || 'Equipment Name') + ' *'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('equipment.form.category') || 'Category'}</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="diving">{t('equipment.categories.diving') || 'Diving'}</MenuItem>
                  <MenuItem value="snorkeling">{t('equipment.categories.snorkeling') || 'Snorkeling'}</MenuItem>
                  <MenuItem value="safety">{t('equipment.categories.safety') || 'Safety'}</MenuItem>
                  <MenuItem value="maintenance">{t('equipment.categories.maintenance') || 'Maintenance'}</MenuItem>
                  <MenuItem value="own_equipment">{t('equipment.categories.ownEquipment') || 'Own Equipment'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>{t('equipment.form.type') || 'Type'}</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="BCD">BCD</MenuItem>
                  <MenuItem value="Regulator">Regulator</MenuItem>
                  <MenuItem value="Mask">Mask</MenuItem>
                  <MenuItem value="Fins">Fins</MenuItem>
                  <MenuItem value="Boots">Boots</MenuItem>
                  <MenuItem value="Wetsuit">Wetsuit</MenuItem>
                  <MenuItem value="Semi-Dry">Semi-Dry</MenuItem>
                  <MenuItem value="Dry Suit">Dry Suit</MenuItem>
                  <MenuItem value="Tank">Tank</MenuItem>
                  <MenuItem value="Computer">Computer</MenuItem>
                  <MenuItem value="Torch">Torch</MenuItem>
                  <MenuItem value="Accessory">Accessory</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.size') || 'Size'}
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="e.g., M, L, XL, 12L"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.serial') || 'Serial Number'}
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.brand') || 'Brand'}
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Mares, Cressi, Aqualung"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.model') || 'Model'}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Avant Quattro, Pro Light"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.thickness') || 'Thickness (for wetsuits)'}
                value={formData.thickness}
                onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                placeholder="e.g., 3mm, 5mm, 7mm"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.style') || 'Style (for wetsuits)'}
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                placeholder="e.g., Shorty, Full, Semi-Dry"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('equipment.form.hood') || 'Hood (for wetsuits)'}
                value={formData.hood}
                onChange={(e) => setFormData({ ...formData, hood: e.target.value })}
                placeholder="e.g., Yes, No"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>{t('equipment.form.condition') || 'Condition'}</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <MenuItem value="excellent">{t('equipment.condition.excellent') || 'Excellent'}</MenuItem>
                  <MenuItem value="good">{t('equipment.condition.good') || 'Good'}</MenuItem>
                  <MenuItem value="fair">{t('equipment.condition.fair') || 'Fair'}</MenuItem>
                  <MenuItem value="poor">{t('equipment.condition.poor') || 'Poor'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {isGlobalAdmin && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Location *</InputLabel>
                    <Select
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    >
                      {locations.map(loc => (
                        <MenuItem key={loc.id} value={loc.id}>{loc.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Purchase Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Warranty"
                    value={formData.warranty}
                    onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                    placeholder="e.g., 2 years, 3 years"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Revision Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.lastRevisionDate}
                    onChange={(e) => setFormData({ ...formData, lastRevisionDate: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Next Revision Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.nextRevisionDate}
                    onChange={(e) => setFormData({ ...formData, nextRevisionDate: e.target.value })}
                  />
                </Grid>

                {formData.type === 'Regulator' && (
                  <>
                    <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 2 }}>Regulator Details</Typography></Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="1st Stage Brand"
                        value={formData.firstStageBrand}
                        onChange={(e) => setFormData({ ...formData, firstStageBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="1st Stage Model"
                        value={formData.firstStageModel}
                        onChange={(e) => setFormData({ ...formData, firstStageModel: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="2nd Stage Brand"
                        value={formData.secondStageBrand}
                        onChange={(e) => setFormData({ ...formData, secondStageBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="2nd Stage Model"
                        value={formData.secondStageModel}
                        onChange={(e) => setFormData({ ...formData, secondStageModel: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Octopus Brand"
                        value={formData.octopusBrand}
                        onChange={(e) => setFormData({ ...formData, octopusBrand: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Octopus Model"
                        value={formData.octopusModel}
                        onChange={(e) => setFormData({ ...formData, octopusModel: e.target.value })}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('equipment.form.notes') || 'Notes'}
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this equipment..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSaveEquipment} variant="contained">
            {editingEquipment ? t('common.update') : t('common.add')} {t('nav.equipment')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('equipment.bulk.title') || 'Bulk Import Equipment'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('equipment.bulk.description') || 'Upload a CSV file with equipment data. The file should have the following columns:'}
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre">
              name,category,type,size,serialNumber,condition,notes
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('equipment.bulk.example') || 'Example:'}
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" component="pre">
              BCD Mares, diving, standard, M, BCD001, excellent, Good condition
              Regulator Aqualung, diving, premium, -, REG001, good, Recently serviced
              Mask Cressi, diving, standard, -, MASK001, excellent, New
            </Typography>
          </Box>
          <input
            type="file"
            accept=".csv"
            onChange={handleBulkImport}
            style={{ marginTop: 16 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

    </>
  );
}
