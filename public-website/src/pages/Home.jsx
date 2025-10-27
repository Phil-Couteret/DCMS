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
import { ScubaDiving as DiveIcon, BeachAccess as LocationIcon, Groups as GroupIcon } from '@mui/icons-material';

const Home = () => {
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
            Welcome to<br />
            Deep Blue Fuerteventura
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: 'rgba(255,255,255,0.9)' }}>
            The Atlantic is the Safari!
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, color: 'rgba(255,255,255,0.8)' }}>
            Years of diving experience in the Atlantic - One of the most established dive centers on Fuerteventura
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
            Book Your Dive Now
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
                  Professional Diving
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Years of experience in the Atlantic waters. SSI and PADI certified instructors.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <LocationIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Two Locations
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Caleta de Fuste and Las Playitas. Choose your perfect dive site.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <GroupIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  All Experience Levels
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  From beginners to advanced divers. Discover, Open Water, Advanced, and more.
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
            Our Dive Locations
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h4" gutterBottom color="primary">
                    Caleta de Fuste
                  </Typography>
                  <Typography variant="body1" paragraph>
                    The yacht harbour, which is also the location of our dive centre, has a flair that is all its own. 
                    Transatlantic sailing boats and other yachts regularly make port here.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Muelle Deportivo / Calle Teneriffe<br />
                    E - 35610 Caleta de Fuste - Fuerteventura
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/dive-sites')}>
                    View Dive Sites
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h4" gutterBottom color="primary">
                    Las Playitas
                  </Typography>
                  <Typography variant="body1" paragraph>
                    The hotel and dive base are designed for sports-minded people. 
                    Las Playitas Resort is known in the sporting world as a training destination for professional athletes.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Hotel Gran Resort Las Playitas<br />
                    Las Playitas - Fuerteventura
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/dive-sites')}>
                    View Dive Sites
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
            Ready for an Adventure?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Book your dive today and discover the Atlantic waters of Fuerteventura
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/book-dive')}
            sx={{ px: 6, py: 2, fontSize: '1.2rem' }}
          >
            Book Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;

