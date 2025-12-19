import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScubaDiving as DiveIcon, BeachAccess as LocationIcon, Groups as GroupIcon } from '@mui/icons-material';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          py: 15,
          textAlign: 'center'
        }}
      >
        <Container>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, fontWeight: 'bold', mb: 3 }}>
            {t('home.title').split('\n').map((line, i, arr) => (
              <React.Fragment key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: 'rgba(255,255,255,0.9)' }}>
            {t('home.tagline')}
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, color: 'rgba(255,255,255,0.8)' }}>
            {t('home.subtitle')}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/book-dive')}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.2rem',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            {t('common.bookYourDive')}
          </Button>
        </Container>
      </Box>

      {/* Key Features */}
      <Container sx={{ py: 8 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <DiveIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  {t('home.feature1Title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('home.feature1Desc')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <LocationIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  {t('home.feature2Title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('home.feature2Desc')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <GroupIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  {t('home.feature3Title')}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t('home.feature3Desc')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Dive Locations */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 8 }}>
        <Container>
          <Typography variant="h3" sx={{ mb: 6, textAlign: 'center' }}>
            {t('home.locationsTitle')}
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h4" gutterBottom color="primary">
                    {t('home.caletaTitle')}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {t('home.caletaDesc')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {t('home.caletaAddress').split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < t('home.caletaAddress').split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/dive-sites')}>
                    {t('common.viewDiveSites')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h4" gutterBottom color="primary">
                    {t('home.playitasTitle')}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {t('home.playitasDesc')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {t('home.playitasAddress').split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < t('home.playitasAddress').split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/dive-sites')}>
                    {t('common.viewDiveSites')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            {t('home.ctaTitle')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            {t('home.ctaSubtitle')}
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/book-dive')}
            sx={{ px: 6, py: 2, fontSize: '1.2rem' }}
          >
            {t('common.bookNow')}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;

