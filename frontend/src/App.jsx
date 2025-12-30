import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Pages
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Stays from './pages/Stays';
import Customers from './pages/Customers';
import Equipment from './pages/Equipment';
import Settings from './pages/Settings';
import BoatPrep from './pages/BoatPrep';
import Schedule from './pages/Schedule';
import Breaches from './pages/Breaches';
import Bill from './pages/Bill';
import Partners from './pages/Partners';
import PartnerInvoices from './pages/PartnerInvoices';
import PartnerLogin from './pages/partner/PartnerLogin';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import ProtectedPartnerRoute from './components/Partner/ProtectedPartnerRoute';
import Bills from './pages/Bills';
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

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <PartnerAuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
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
                            <Route path="/settings" element={<ProtectedRoute requiredPermission="settings"><Settings /></ProtectedRoute>} />
                            <Route path="/breaches" element={<ProtectedRoute requiredPermission="settings"><Breaches /></ProtectedRoute>} />
                            <Route path="/bill" element={<ProtectedRoute requiredPermission="stays"><Bill /></ProtectedRoute>} />
                            <Route path="/partners" element={<ProtectedRoute requiredPermission="settings"><Partners /></ProtectedRoute>} />
                            <Route path="/partner-invoices" element={<ProtectedRoute requiredPermission="settings"><PartnerInvoices /></ProtectedRoute>} />
                            <Route path="/bills" element={<ProtectedRoute requiredPermission="stays"><Bills /></ProtectedRoute>} />
                          </Routes>
                        </Box>
                      </Box>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ThemeProvider>
        </PartnerAuthProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
