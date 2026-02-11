import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getLocationPricing } from '../services/pricingService';

const LOCATION_IDS = {
  caleta: '550e8400-e29b-41d4-a716-446655440001',
  playitas: '550e8400-e29b-41d4-a716-446655440002'
};

const fallbackTiers = [
  { dives: '1-2', tourist: 46, resident: 'TBD' },
  { dives: '3-5', tourist: 44, resident: 'TBD' },
  { dives: '6-8', tourist: 42, resident: 'TBD' },
  { dives: '9-12', tourist: 40, resident: 'TBD' },
  { dives: '13+', tourist: 38, resident: 'TBD' }
];

const Pricing = () => {
  const { t } = useTranslation();
  const [livePricing, setLivePricing] = useState({ caleta: null, playitas: null });

  useEffect(() => {
    const caleta = getLocationPricing(LOCATION_IDS.caleta);
    const playitas = getLocationPricing(LOCATION_IDS.playitas);
    setLivePricing({ caleta: Object.keys(caleta).length ? caleta : null, playitas: Object.keys(playitas).length ? playitas : null });
  }, []);

  const getTiersForLocation = (key) => {
    const p = livePricing[key];
    const tiers = p?.customerTypes?.tourist?.diveTiers;
    if (tiers && tiers.length) {
      return tiers.sort((a, b) => a.dives - b.dives).map((t, i, arr) => ({
        dives: arr[i + 1] ? `${t.dives}-${arr[i + 1].dives - 1}` : `${t.dives}+`,
        tourist: t.price,
        resident: 'TBD'
      }));
    }
    return fallbackTiers;
  };

  const getPacksForLocation = (key) => {
    const p = livePricing[key];
    const packs = p?.divePacks;
    if (packs && packs.length) {
      return packs
        .slice()
        .sort((a, b) => a.dives - b.dives || (a.withEquipment ? 1 : 0) - (b.withEquipment ? 1 : 0))
        .map(pk => ({ dives: pk.dives, withEquipment: !!pk.withEquipment, price: pk.price }));
    }
    return [];
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('pricing.title')}
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary">
        {t('pricing.subtitle')}
      </Typography>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {(['caleta', 'playitas']).map(key => {
          const tiers = getTiersForLocation(key);
          const packs = getPacksForLocation(key);
          const title = key === 'caleta' ? t('pricing.caletaTitle') : t('pricing.playitasTitle');
          return (
            <Grid item xs={12} md={6} key={key}>
              <Card>
                <CardContent>
                  <Typography variant="h5" color="primary" gutterBottom>
                    {title}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Per-dive tiers (tourist)</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: packs.length ? 3 : 0 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>{t('pricing.numberOfDives')}</strong></TableCell>
                          <TableCell align="right"><strong>{t('pricing.touristPrice')}</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tiers.map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.dives} {t('pricing.dives')}</TableCell>
                            <TableCell align="right">€{row.tourist}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {packs.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Dive packs (fixed total)</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>Dives</strong></TableCell>
                              <TableCell><strong>Equipment</strong></TableCell>
                              <TableCell align="right"><strong>Price</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {packs.map((pk, index) => (
                              <TableRow key={index}>
                                <TableCell>{pk.dives}</TableCell>
                                <TableCell>{pk.withEquipment ? 'Yes' : 'No'}</TableCell>
                                <TableCell align="right">€{pk.price}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {t('pricing.example')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Additional Information */}
      <Box sx={{ mt: 6, bgcolor: '#f5f5f5', p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          {t('pricing.includedTitle')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included1')}</Typography>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included2')}</Typography>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included3')}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included4')}</Typography>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included5')}</Typography>
            <Typography variant="body2" gutterBottom>✓ {t('pricing.included6')}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('pricing.otherActivitiesTitle')}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>{t('pricing.snorkeling').split(':')[0]}:</strong> {t('pricing.snorkeling').split(':')[1].trim()}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>{t('pricing.discover').split(':')[0]}:</strong> {t('pricing.discover').split(':')[1].trim()}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>{t('pricing.orientation').split(':')[0]}:</strong> {t('pricing.orientation').split(':')[1].trim()}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>{t('pricing.nightDive').split(':')[0]}:</strong> {t('pricing.nightDive').split(':')[1].trim()}
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('pricing.equipmentTitle')}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>{t('pricing.completeEquipment').split(':')[0]}:</strong> {t('pricing.completeEquipment').split(':')[1].trim()}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('pricing.individualItems')}
        </Typography>
      </Box>
    </Container>
  );
};

export default Pricing;

