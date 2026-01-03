import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import CookieConsentBanner from './components/CookieConsentBanner';
import Home from './pages/Home';
import BookDive from './pages/BookDive';
import DiveSites from './pages/DiveSites';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import Login from './pages/Login';
import MyAccount from './pages/MyAccount';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import DataRetentionPolicy from './pages/DataRetentionPolicy';
import passwordMigrationService from './services/passwordMigrationService';
import dataRetentionService from './services/dataRetentionService';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#1565c0'
    },
    secondary: {
      main: '#ff5722'
    }
  }
});

function App() {
  // Clean up expired accounts and run data retention on app startup
  useEffect(() => {
    // Clean up accounts that exceeded password change deadline
    passwordMigrationService.cleanupExpiredAccounts();
    
    // Run data retention cleanup (checks for inactive customers, old bookings, etc.)
    // Run with a slight delay to avoid blocking app startup
    const cleanupTimer = setTimeout(() => {
      dataRetentionService.runDataRetentionCleanup();
    }, 2000); // Wait 2 seconds after app loads
    
    return () => clearTimeout(cleanupTimer);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation />
          <main style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/book-dive" element={<BookDive />} />
              <Route path="/dive-sites" element={<DiveSites />} />
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/my-account" element={<MyAccount />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/data-retention-policy" element={<DataRetentionPolicy />} />
            </Routes>
          </main>
          <Footer />
          <PWAInstallPrompt />
          <CookieConsentBanner />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

