import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';

// Phase 6.10 (roadmap item 10): route-based code splitting. Every page was
// previously a static import, so the whole app - dashboard, bookings,
// schedule, financial, partner portal, everything - bundled into one
// 436KB gzipped chunk loaded before a user could see anything, even if
// all they needed was the login screen or a single page. React.lazy()
// gives each page its own chunk, fetched only when its route is actually
// visited; the browser then caches it, so navigating back to a page
// already loaded this session doesn't refetch it. The loading fallback
// matches the spinner ProtectedPartnerRoute already uses elsewhere in
// this app for a consistent "loading" look, rather than introducing a
// second style.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Stays = lazy(() => import('./pages/Stays'));
const Customers = lazy(() => import('./pages/Customers'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Settings = lazy(() => import('./pages/Settings'));
const BoatPrep = lazy(() => import('./pages/BoatPrep'));
const Schedule = lazy(() => import('./pages/Schedule'));
const TripDetails = lazy(() => import('./pages/TripDetails'));
const Breaches = lazy(() => import('./pages/Breaches'));
const Bill = lazy(() => import('./pages/Bill'));
const Partners = lazy(() => import('./pages/Partners'));
const PartnerInvoices = lazy(() => import('./pages/PartnerInvoices'));
const PartnerLogin = lazy(() => import('./pages/partner/PartnerLogin'));
const PartnerDashboard = lazy(() => import('./pages/partner/PartnerDashboard'));
const Bills = lazy(() => import('./pages/Bills'));
const Financial = lazy(() => import('./pages/Financial'));

import ProtectedPartnerRoute from './components/Partner/ProtectedPartnerRoute';
import { PartnerAuthProvider } from './utils/partnerAuthContext';

// Components
import Navigation from './components/Common/Navigation';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Context Providers
import { LanguageProvider } from './utils/languageContext';
import { AuthProvider } from './utils/authContext';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const PageLoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <PartnerAuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  {/* Partner Portal Routes */}
                  <Route path="/partner/login" element={<PartnerLogin />} />
                  <Route
                    path="/partner/dashboard"
                    element={
                      <ProtectedPartnerRoute>
                        <PartnerDashboard />
                      </ProtectedPartnerRoute>
                    }
                  />

                  {/* Admin Portal Routes */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                          <Navigation />
                          <Box
                            component="main"
                            sx={{
                              flexGrow: 1,
                              bgcolor: '#f5f5f5',
                              minHeight: '100vh',
                              p: 3,
                              mt: 8 // Space for top nav
                            }}
                          >
                            <Suspense fallback={<PageLoadingFallback />}>
                              <Routes>
                                <Route path="/" element={<ProtectedRoute requiredPermission="dashboard"><Dashboard /></ProtectedRoute>} />
                                <Route path="/bookings" element={<ProtectedRoute requiredPermission="bookings"><Bookings /></ProtectedRoute>} />
                                <Route path="/bookings/new" element={<ProtectedRoute requiredPermission="bookings"><Bookings /></ProtectedRoute>} />
                                <Route path="/bookings/:id" element={<ProtectedRoute requiredPermission="bookings"><Bookings /></ProtectedRoute>} />
                                <Route path="/stays" element={<ProtectedRoute requiredPermission="stays"><Stays /></ProtectedRoute>} />
                                <Route path="/customers" element={<ProtectedRoute requiredPermission="customers"><Customers /></ProtectedRoute>} />
                                <Route path="/equipment" element={<ProtectedRoute requiredPermission="equipment"><Equipment /></ProtectedRoute>} />
                                <Route path="/boat-prep" element={<ProtectedRoute requiredPermission="boatPrep"><BoatPrep /></ProtectedRoute>} />
                                <Route path="/schedule" element={<ProtectedRoute requiredPermission="boatPrep"><Schedule /></ProtectedRoute>} />
                                <Route path="/schedule/trip/:date/:type/:boatId?/:session?" element={<ProtectedRoute requiredPermission="boatPrep"><TripDetails /></ProtectedRoute>} />
                                <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><Settings /></ProtectedRoute>} />
                                <Route path="/breaches" element={<ProtectedRoute requiredPermission="settings"><Breaches /></ProtectedRoute>} />
                                <Route path="/bill" element={<ProtectedRoute requiredPermission="stays"><Bill /></ProtectedRoute>} />
                                <Route path="/partners" element={<ProtectedRoute requiredPermission="settings"><Partners /></ProtectedRoute>} />
                                <Route path="/partner-invoices" element={<ProtectedRoute requiredPermission="settings"><PartnerInvoices /></ProtectedRoute>} />
                                <Route path="/bills" element={<ProtectedRoute requiredPermission="stays"><Bills /></ProtectedRoute>} />
                                <Route path="/financial" element={<ProtectedRoute requiredPermission="settings"><Financial /></ProtectedRoute>} />
                              </Routes>
                            </Suspense>
                          </Box>
                        </Box>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </Router>
          </ThemeProvider>
        </PartnerAuthProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
