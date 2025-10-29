import React from 'react';
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

const Pricing = () => {
  const { t } = useTranslation();
  const pricingData = {
    caleta: [
      { dives: '1-2', tourist: 46, resident: 'TBD' },
      { dives: '3-5', tourist: 44, resident: 'TBD' },
      { dives: '6-8', tourist: 42, resident: 'TBD' },
      { dives: '9-12', tourist: 40, resident: 'TBD' },
      { dives: '13+', tourist: 38, resident: 'TBD' }
    ],
    playitas: [
      { dives: '1-2', tourist: 46, resident: 'TBD' },
      { dives: '3-5', tourist: 44, resident: 'TBD' },
      { dives: '6-8', tourist: 42, resident: 'TBD' },
      { dives: '9-12', tourist: 40, resident: 'TBD' },
      { dives: '13+', tourist: 38, resident: 'TBD' }
    ]
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
        {/* Caleta de Fuste */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary" gutterBottom>
                {t('pricing.caletaTitle')}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('pricing.numberOfDives')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('pricing.touristPrice')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pricingData.caleta.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.dives} {t('pricing.dives')}</TableCell>
                        <TableCell align="right">€{row.tourist}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('pricing.example')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Las Playitas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary" gutterBottom>
                {t('pricing.playitasTitle')}
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('pricing.numberOfDives')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('pricing.touristPrice')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pricingData.playitas.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.dives} {t('pricing.dives')}</TableCell>
                        <TableCell align="right">€{row.tourist}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('pricing.example')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
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

