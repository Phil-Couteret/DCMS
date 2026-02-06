import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Link,
  Stack
} from '@mui/material';
import { Cookie as CookieIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const CookieConsentBanner = () => {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem('cookie-consent');
    if (!consentGiven) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    // Store consent
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
  };

  const handleReject = () => {
    // Store rejection (only essential cookies)
    localStorage.setItem('cookie-consent', 'rejected');
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
  };

  const handleCustomize = () => {
    // For now, just accept all (can be enhanced later with cookie categories)
    handleAccept();
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        p: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Paper
        elevation={6}
        sx={{
          maxWidth: 800,
          width: '100%',
          p: 3,
          backgroundColor: 'background.paper'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <CookieIcon sx={{ fontSize: 40, color: 'primary.main', mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {t('cookieBanner.title')}
            </Typography>
            <Typography variant="body2" paragraph>
              {t('cookieBanner.intro')}
            </Typography>
            <Typography variant="body2" paragraph>
              {t('cookieBanner.byClicking')}{' '}
              <Link href="/cookie-policy" target="_blank" underline="always">
                {t('cookieBanner.cookiePolicy')}
              </Link>
              {' '}{t('cookieBanner.and')}{' '}
              <Link href="/privacy-policy" target="_blank" underline="always">
                {t('cookieBanner.privacyPolicy')}
              </Link>.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAccept}
                size="small"
              >
                {t('cookieBanner.acceptAll')}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleReject}
                size="small"
              >
                {t('cookieBanner.essentialOnly')}
              </Button>
              <Button
                variant="text"
                color="primary"
                onClick={handleCustomize}
                size="small"
              >
                {t('cookieBanner.learnMore')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CookieConsentBanner;

