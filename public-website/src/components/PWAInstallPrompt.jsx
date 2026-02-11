import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as GetAppIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Apple as AppleIcon
} from '@mui/icons-material';

const PWAInstallPrompt = () => {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated (registered diver)
    const checkAuthentication = () => {
      const userEmail = localStorage.getItem('dcms_user_email');
      const authenticated = !!userEmail && userEmail.trim() !== '';
      setIsAuthenticated(authenticated);
      return authenticated;
    };

    // Initial check
    checkAuthentication();

    // Listen for authentication changes (when user logs in)
    // REMOVED: storage event listener causing too many refreshes
    // Use custom events instead
    // const handleStorageChange = () => {
    //   checkAuthentication();
    // };
    // window.addEventListener('storage', handleStorageChange);
    
    // Also check on custom events (for same-tab updates)
    const handleCustomerUpdate = () => {
      checkAuthentication();
    };
    window.addEventListener('dcms_customer_updated', handleCustomerUpdate);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed on iOS
    if (iOS && (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches)) {
      setIsInstalled(true);
      setIsStandalone(true);
      return;
    }

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show prompt on /my-account page AND if user is authenticated
      const currentPath = location.pathname;
      const authenticated = checkAuthentication();
      
      if (currentPath === '/my-account' && authenticated) {
        // Check if user has dismissed before (stored in localStorage)
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setTimeout(() => {
            // Double-check authentication before showing
            if (checkAuthentication()) {
              setShowPrompt(true);
            }
          }, 3000); // Show after 3 seconds
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Re-check when route changes
    if (location.pathname === '/my-account') {
      const authenticated = checkAuthentication();
      if (authenticated && deferredPrompt) {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (!dismissed) {
          setTimeout(() => {
            if (checkAuthentication()) {
              setShowPrompt(true);
            }
          }, 3000);
        }
      }
    } else {
      // Hide prompt if user navigates away from /my-account
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      // window.removeEventListener('storage', handleStorageChange); // Removed - was causing refreshes
      window.removeEventListener('dcms_customer_updated', handleCustomerUpdate);
    };
  }, [location.pathname, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if:
  // - Already installed
  // - Not authenticated (not a registered diver)
  // - Not on /my-account page
  // - Prompt was dismissed
  if (isInstalled || isStandalone || !showPrompt || !isAuthenticated || location.pathname !== '/my-account') {
    return null;
  }

  // iOS installation instructions
  if (isIOS && !isStandalone) {
    return (
      <Dialog open={showPrompt} onClose={handleDismiss} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Install Deep Blue Diver App</Typography>
            <IconButton onClick={handleDismiss} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              To install this app on your iOS device:
            </Typography>
          </Alert>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" paragraph>
              1. Tap the <AppleIcon sx={{ verticalAlign: 'middle', fontSize: 20 }} /> Share button at the bottom
            </Typography>
            <Typography variant="body2" paragraph>
              2. Scroll down and tap "Add to Home Screen"
            </Typography>
            <Typography variant="body2">
              3. Tap "Add" to confirm
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismiss}>Maybe Later</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Android/Chrome installation prompt
  return (
    <Dialog open={showPrompt} onClose={handleDismiss} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Install Deep Blue Diver App</Typography>
          <IconButton onClick={handleDismiss} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ py: 2 }}>
          <GetAppIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Install our app for a better experience
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Get quick access to book dives, manage your profile, and view your bookings - even offline!
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismiss}>Maybe Later</Button>
        <Button
          variant="contained"
          onClick={handleInstallClick}
          startIcon={<PhoneAndroidIcon />}
        >
          Install App
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PWAInstallPrompt;

