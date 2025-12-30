import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link
} from '@mui/material';
import { Facebook, Instagram, YouTube } from '@mui/icons-material';

const Footer = () => {
  return (
    <Box
      sx={{
        bgcolor: '#212121',
        color: 'white',
        py: 6,
        mt: 'auto'
      }}
    >
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Deep Blue Fuerteventura
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              Years of diving experience in the Atlantic
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Quick Links
            </Typography>
            <Box>
              <Link href="/" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                Home
              </Link>
              <Link href="/book-dive" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                Book a Dive
              </Link>
              <Link href="/about" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                About Us
              </Link>
              <Link href="/contact" color="inherit" underline="hover" sx={{ display: 'block' }}>
                Contact
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Locations
            </Typography>
            <Box>
              <Typography variant="body2" color="rgba(255,255,255,0.7)">
                Caleta de Fuste<br />
                +34.928 163 712
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mt: 2 }}>
                Las Playitas<br />
                +34.653 512 638
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Follow Us
            </Typography>
            <Box>
              <Link href="#" color="inherit" sx={{ mr: 2 }}>
                <Facebook />
              </Link>
              <Link href="#" color="inherit" sx={{ mr: 2 }}>
                <Instagram />
              </Link>
              <Link href="#" color="inherit">
                <YouTube />
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              Legal & Privacy
            </Typography>
            <Box>
              <Link href="/privacy-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                Cookie Policy
              </Link>
              <Link href="/data-retention-policy" color="inherit" underline="hover" sx={{ display: 'block' }}>
                Data Retention Policy
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 4, pt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            © 2024 Deep Blue Fuerteventura. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

