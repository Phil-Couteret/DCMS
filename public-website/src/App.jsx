import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import CookieConsentBanner from './components/CookieConsentBanner';
import Home from './pages/Home';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import DataRetentionPolicy from './pages/DataRetentionPolicy';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navigation />
          <main style={{ flexGrow: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Home />} />
              <Route path="/contact" element={<Contact />} />
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

