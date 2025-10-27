import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { AccessTime as TimeIcon, Water as DepthIcon } from '@mui/icons-material';

const DiveSites = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const caletaSites = [
    {
      name: 'Castillo Reef',
      type: 'Reef',
      maxDepth: '18m',
      difficulty: 'Beginner',
      duration: '45-60 min',
      description: 'Beautiful reef with varied marine life'
    },
    {
      name: 'Salinas Reef',
      type: 'Reef',
      maxDepth: '20m',
      difficulty: 'Intermediate',
      duration: '50-60 min',
      description: 'Rich biodiversity with schools of fish'
    },
    {
      name: 'Nuevo Horizonte Reef',
      type: 'Reef',
      maxDepth: '25m',
      difficulty: 'Intermediate',
      duration: '55-60 min',
      description: 'Underwater cliffs and caves'
    }
  ];

  const playitasSites = [
    {
      name: 'Las Playitas Reef',
      type: 'Reef',
      maxDepth: '18m',
      difficulty: 'Beginner',
      duration: '45-60 min',
      description: 'Stunning reef perfect for beginners'
    }
  ];

  const SiteCard = ({ site }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom color="primary">
          {site.name}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Chip label={site.type} size="small" sx={{ mr: 1 }} />
          <Chip label={site.difficulty} size="small" color="primary" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <DepthIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Max Depth: {site.maxDepth}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimeIcon sx={{ mr: 1, fontSize: 20 }} />
          <Typography variant="body2">Duration: {site.duration}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {site.description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Our Dive Sites
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Caleta de Fuste" />
          <Tab label="Las Playitas" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Caleta de Fuste Dive Sites
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            Discover the stunning reefs and diverse marine life of Caleta de Fuste. 
            From beginner-friendly sites to intermediate challenges, there's something for everyone.
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            {caletaSites.map((site, index) => (
              <Grid item xs={12} md={6} key={index}>
                <SiteCard site={site} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Las Playitas Dive Sites
          </Typography>
          <Typography variant="body1" paragraph color="text.secondary">
            The Las Playitas location offers excellent diving conditions with crystal clear waters 
            and abundant marine life.
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

