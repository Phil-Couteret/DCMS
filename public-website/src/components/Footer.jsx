import React from 'react';
import { Box, Container, Grid, Typography, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <Box sx={{ bgcolor: '#212121', color: 'white', py: 6, mt: 'auto' }}>
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              DCMS
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              {t('platformPrice.heroSubtitle')}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              {t('footer.quickLinks')}
            </Typography>
            <Box>
              <Link href="/#/" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.home')}
              </Link>
              <Link href="/#/pricing" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('nav.pricing')}
              </Link>
              <Link href="/#/contact" color="inherit" underline="hover" sx={{ display: 'block' }}>
                {t('footer.contact')}
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              {t('footer.contactUs')}
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ display: 'block' }}>
              <Link href="mailto:contact@couteret.fr" color="inherit" underline="hover">contact@couteret.fr</Link>
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              TBD, Barcelona, Spain
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              <Link href="tel:+34678336889" color="inherit" underline="hover">+34 678 336 889</Link>
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom>
              {t('footer.legalPrivacy')}
            </Typography>
            <Box>
              <Link href="/#/privacy-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.privacyPolicy')}
              </Link>
              <Link href="/#/cookie-policy" color="inherit" underline="hover" sx={{ display: 'block', mb: 1 }}>
                {t('footer.cookiePolicy')}
              </Link>
              <Link href="/#/data-retention-policy" color="inherit" underline="hover" sx={{ display: 'block' }}>
                {t('footer.dataRetentionPolicy')}
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 4, pt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            © {new Date().getFullYear()} DCMS. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
