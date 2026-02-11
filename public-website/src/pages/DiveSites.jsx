import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Tabs,
  Tab,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  AccessTime as TimeIcon, 
  Water as DepthIcon, 
  ExpandMore as ExpandMoreIcon,
  Waves as WavesIcon,
  Speed as CurrentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const DiveSites = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = React.useState(0);

  const caletaSites = [
    // Castillo Reef Sites
    {
      key: 'anfiteatro',
      reef: 'Castillo Reef',
      name: 'Anfiteatro',
      type: 'Reef',
      depthRange: '12-21m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '5-10 min',
      image: '/images/deepblue/castillo-reef/Anfiteatro.jpg'
    },
    {
      key: 'barranco',
      reef: 'Castillo Reef',
      name: 'Barranco',
      type: 'Reef',
      depthRange: '12-23m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '5-10 min',
      image: '/images/deepblue/castillo-reef/Barranco.jpg'
    },
    {
      key: 'fortaleza',
      reef: 'Castillo Reef',
      name: 'Fortaleza',
      type: 'Reef',
      depthRange: '3-24m',
      difficulty: 'Beginner',
      current: 'Little - Medium',
      waves: 'Unprotected',
      travelTime: '3-8 min',
      image: '/images/deepblue/castillo-reef/Fortaleza.jpg'
    },
    {
      key: 'mole',
      reef: 'Castillo Reef',
      name: 'Mole (cementerio de barco)',
      type: 'Reef',
      depthRange: '7m',
      difficulty: 'Beginner',
      current: 'Very Little',
      waves: 'Protected',
      travelTime: '2 min',
      image: '/images/deepblue/castillo-reef/Mole.jpg'
    },
    
    // Salinas Reef Sites
    {
      key: 'la_emboscada',
      reef: 'Salinas Reef',
      name: 'La Emboscada',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate - Strong (drift)',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      image: '/images/deepblue/salinas-reef/La-Emboscada.jpg'
    },
    {
      key: 'camino_de_altura',
      reef: 'Salinas Reef',
      name: 'Camino de altura',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      image: '/images/deepblue/salinas-reef/Camino-de-altura.jpg'
    },
    {
      key: 'el_muellito',
      reef: 'Salinas Reef',
      name: 'El Muellito',
      type: 'Reef',
      depthRange: '7-40m',
      difficulty: 'Beginner',
      current: 'Moderate - Strong',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Muellito.jpg'
    },
    {
      key: 'el_tazar',
      reef: 'Salinas Reef',
      name: 'El Tazar',
      type: 'Reef',
      depthRange: '12-35m',
      difficulty: 'Beginner',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Tazar.jpg'
    },
    {
      key: 'tesoro_negro',
      reef: 'Salinas Reef',
      name: 'Tesoro negro',
      type: 'Reef',
      depthRange: '12-30m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/Tesoro-negro.jpg'
    },
    {
      key: 'el_portal',
      reef: 'Salinas Reef',
      name: 'El Portal',
      type: 'Reef',
      depthRange: '12-35m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Portal.jpg'
    },
    {
      key: 'el_mirador',
      reef: 'Salinas Reef',
      name: 'El Mirador',
      type: 'Reef',
      depthRange: '12-38m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Mirador.jpg'
    },
    {
      key: 'el_laberinto',
      reef: 'Salinas Reef',
      name: 'El Laberinto',
      type: 'Reef',
      depthRange: '12-38m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Laberinto.jpg'
    },
    {
      key: 'la_piramide',
      reef: 'Salinas Reef',
      name: 'La Pirámide',
      type: 'Reef',
      depthRange: '14-39m',
      difficulty: 'Advanced',
      current: 'Moderate - Strong',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/La-Piramide.jpg'
    },
    {
      key: 'el_monasterio',
      reef: 'Salinas Reef',
      name: 'El Monasterio',
      type: 'Reef',
      depthRange: '14-36m',
      difficulty: 'Advanced',
      current: 'Moderate',
      waves: 'Unprotected',
      travelTime: '10-15 min',
      image: '/images/deepblue/salinas-reef/El-Monasterio.jpg'
    },
    
    // Nuevo Horizonte Reef Sites
    {
      key: 'nuevo_horizonte',
      reef: 'Nuevo Horizonte Reef',
      name: 'Nuevo Horizonte',
      type: 'Reef',
      depthRange: '24-39m',
      difficulty: 'Advanced',
      current: 'Moderate - Strong (drift)',
      waves: 'Unprotected',
      travelTime: '15-20 min',
      image: '/images/deepblue/nuevo-horizonte/Nuevo-Horizonte.jpg'
    }
  ];

  const playitasSites = [
    {
      key: 'playitas_reef',
      name: 'Las Playitas Reef',
      type: 'Reef',
      maxDepth: '18m',
      difficulty: 'Beginner',
      duration: '45-60 min'
    }
  ];

  const SiteCard = ({ site }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {site.image && (
        <CardMedia
          component="img"
          height="200"
          image={site.image}
          alt={site.name}
          sx={{
            objectFit: 'cover',
            backgroundColor: 'grey.200'
          }}
          onError={(e) => {
            // Hide image if it fails to load
            e.target.style.display = 'none';
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom color="primary">
          {site.name}
        </Typography>
        {site.reef && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {site.reef}
          </Typography>
        )}
        <Box sx={{ mb: 2 }}>
          <Chip label={t(`diveSites.types.${site.type.toLowerCase()}`)} size="small" sx={{ mr: 1 }} />
          <Chip 
            label={t(`diveSites.types.${site.difficulty.toLowerCase()}`)} 
            size="small" 
            color={site.difficulty === 'Advanced' ? 'error' : site.difficulty === 'Intermediate' ? 'warning' : 'success'} 
          />
        </Box>
        {site.depthRange && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <DepthIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">{t('diveSites.details.depth')}: {site.depthRange}</Typography>
          </Box>
        )}
        {site.current && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CurrentIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">{t('diveSites.details.current')}: {site.current}</Typography>
          </Box>
        )}
        {site.waves && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <WavesIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">{t('diveSites.details.waves')}: {site.waves}</Typography>
          </Box>
        )}
        {site.travelTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TimeIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">{t('diveSites.details.travel')}: {site.travelTime}</Typography>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">
          {site.key ? t(`diveSites.siteDescriptions.${site.key}`) : site.description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('diveSites.title')}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label={t('booking.locations.caleta')} />
          <Tab label={t('booking.locations.playitas')} />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            {t('diveSites.caletaTitle')}
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            {t('diveSites.caletaDesc')}
          </Typography>
          
          {/* Group sites by reef */}
          {['Castillo Reef', 'Salinas Reef', 'Nuevo Horizonte Reef'].map((reefName) => {
            const reefSites = caletaSites.filter(site => site.reef === reefName);
            return (
              <Accordion key={reefName} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {reefName} ({reefSites.length} {t('diveSites.sites')})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    {reefSites.map((site, index) => (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <SiteCard site={site} />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            {t('diveSites.playitasTitle')}
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            {t('diveSites.playitasDesc')}
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {playitasSites.map((site, index) => (
              <Grid item xs={12} md={6} key={index}>
                <SiteCard site={site} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default DiveSites;

