import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link
} from '@mui/material';
import { Facebook, Instagram, YouTube } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
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
              {t('footer.brandName')}
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              {t('footer.tagline')}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              {t('footer.quickLinks')}
            </Typography>
            <Box>
              <Link href="/" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.home')}
              </Link>
              <Link href="/book-dive" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.bookDive')}
              </Link>
              <Link href="/about" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.aboutUs')}
              </Link>
              <Link href="/contact" color="inherit" underline="hover" sx={{ display: 'block' }}>
                {t('footer.contact')}
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              {t('footer.locations')}
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
              {t('footer.followUs')}
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
              {t('footer.legalPrivacy')}
            </Typography>
            <Box>
              <Link href="/privacy-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.privacyPolicy')}
              </Link>
              <Link href="/cookie-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.cookiePolicy')}
              </Link>
              <Link href="/data-retention-policy" color="inherit" underline="hover" sx={{ display: 'block' }}>
                {t('footer.dataRetentionPolicy')}
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 4, pt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            {t('footer.copyright')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

