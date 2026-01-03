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

const CookieConsentBanner = () => {
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
              Cookie Consent
            </Typography>
            <Typography variant="body2" paragraph>
              We use essential cookies to ensure our website functions properly. These cookies are necessary 
              for the website to work and cannot be disabled. We do not use tracking or analytics cookies 
              without your explicit consent.
            </Typography>
            <Typography variant="body2" paragraph>
              By clicking "Accept All", you consent to our use of essential cookies. You can learn more about 
              our cookie practices in our{' '}
              <Link href="/cookie-policy" target="_blank" underline="always">
                Cookie Policy
              </Link>
              {' '}and{' '}
              <Link href="/privacy-policy" target="_blank" underline="always">
                Privacy Policy
              </Link>.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAccept}
                size="small"
              >
                Accept All
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleReject}
                size="small"
              >
                Essential Only
              </Button>
              <Button
                variant="text"
                color="primary"
                onClick={handleCustomize}
                size="small"
              >
                Learn More
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default CookieConsentBanner;

