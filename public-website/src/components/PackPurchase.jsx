import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Alert
} from '@mui/material';
import { ShoppingCart as CartIcon } from '@mui/icons-material';
import packPurchaseService from '../services/packPurchaseService';

const LOCATION_IDS = {
  caleta: '550e8400-e29b-41d4-a716-446655440001',
  playitas: '550e8400-e29b-41d4-a716-446655440002'
};

const LOCATION_LABELS = {
  caleta: 'Caleta de Fuste',
  playitas: 'Las Playitas'
};

const PackPurchase = ({ customer, onPackPurchased }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [location, setLocation] = useState('caleta');
  const [selectedPack, setSelectedPack] = useState(null);
  const [availablePacks, setAvailablePacks] = useState([]);

  const locationId = LOCATION_IDS[location] || LOCATION_IDS.caleta;

  const refreshPacks = useCallback(async () => {
    if (!locationId) return;
    const packs = await packPurchaseService.getAvailablePacksAsync(locationId);
    setAvailablePacks(packs);
    setSelectedPack(packs.length ? packs[0] : null);
  }, [locationId]);

  useEffect(() => {
    if (open && locationId) refreshPacks();
  }, [open, locationId, refreshPacks]);

  useEffect(() => {
    const handler = () => { if (open) refreshPacks(); };
    window.addEventListener('dcms_locations_synced', handler);
    return () => window.removeEventListener('dcms_locations_synced', handler);
  }, [open, refreshPacks]);

  const handleOpen = () => {
    setOpen(true);
    setError(null);
    setSuccess(false);
    setLocation('caleta');
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
      if (success && onPackPurchased) onPackPurchased();
    }
  };

  const handlePurchase = async () => {
    if (!customer?.id || !selectedPack) return;
    setError(null);
    setLoading(true);
    try {
      packPurchaseService.createPackPurchase({
        customerId: customer.id,
        locationId,
        dives: selectedPack.dives,
        withEquipment: !!selectedPack.withEquipment,
        price: selectedPack.price
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to purchase pack.');
    } finally {
      setLoading(false);
    }
  };

  if (!customer) return null;

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<CartIcon />}
        onClick={handleOpen}
      >
        {t('myAccount.purchasePack')}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('myAccount.packPurchase.title')}</DialogTitle>
        <DialogContent>
          {success ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              {t('myAccount.packPurchase.success')}
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('myAccount.packPurchase.location')}</InputLabel>
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  label={t('myAccount.packPurchase.location')}
                >
                  <MenuItem value="caleta">{LOCATION_LABELS.caleta}</MenuItem>
                  <MenuItem value="playitas">{LOCATION_LABELS.playitas}</MenuItem>
                </Select>
              </FormControl>
              {availablePacks.length === 0 ? (
                <Typography color="text.secondary">{t('myAccount.packPurchase.noPacks')}</Typography>
              ) : (
                <Box sx={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}>
                  <Grid container spacing={2}>
                    {availablePacks.map((pack, idx) => (
                      <Grid item xs={12} key={`${pack.dives}-${!!pack.withEquipment}-${idx}`}>
                      <Card
                        variant={selectedPack === pack ? 'elevation' : 'outlined'}
                        elevation={selectedPack === pack ? 2 : 0}
                        sx={{
                          cursor: 'pointer',
                          border: selectedPack === pack ? 2 : 1,
                          borderColor: selectedPack === pack ? 'primary.main' : 'divider'
                        }}
                        onClick={() => setSelectedPack(pack)}
                      >
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                          <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
                            {pack.withEquipment ? t('myAccount.packPurchase.divesWithEquipment', { dives: pack.dives }) : t('myAccount.packPurchase.divesOwnEquipment', { dives: pack.dives })}
                          </Typography>
                          <Typography variant="h5" color="primary" sx={{ mt: 0.5 }}>
                            €{pack.price}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{success ? t('common.close') : t('common.cancel')}</Button>
          {!success && availablePacks.length > 0 && (
            <Button
              variant="contained"
              onClick={handlePurchase}
              disabled={loading || !selectedPack}
              startIcon={loading ? <CircularProgress size={16} /> : null}
            >
              {loading ? t('common.loading') : t('myAccount.packPurchase.purchaseButton')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PackPurchase;
