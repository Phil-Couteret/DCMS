// Certification Verification tab of Settings - configure verification
// portal URLs for certification agencies. Extracted from the former
// monolithic Settings.jsx (Phase 5.2).
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as VerifiedUserIcon,
} from '@mui/icons-material';
import dataService from '../../services/dataService';
import { useTranslation } from '../../utils/languageContext';

const DEFAULT_CERTIFICATION_URLS = {
  SSI: 'https://www.divessi.com/en/verify-certification',
  PADI: 'https://www.padi.com/verify',
  CMAS: 'https://www.cmas.org/certification-verification',
  VDST: 'https://www.vdst.de/zertifikatspruefung'
};

const CertificationVerification = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({ certificationUrls: DEFAULT_CERTIFICATION_URLS });
  const [settingsId, setSettingsId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadSettings().catch((err) => console.error('Error loading settings:', err));
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await dataService.getAll('settings') || [];
      if (Array.isArray(savedSettings) && savedSettings.length > 0) {
        const loadedSettings = savedSettings[0];
        setSettings((prev) => ({ ...prev, ...loadedSettings }));
        setSettingsId(loadedSettings.id);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleUrlChange = (agency, url) => {
    setSettings(prev => ({
      ...prev,
      certificationUrls: {
        ...prev.certificationUrls,
        [agency]: url
      }
    }));
  };

  const handleSave = async () => {
    try {
      if (settingsId) {
        await dataService.update('settings', settingsId, settings);
      } else {
        const newSettings = await dataService.create('settings', settings);
        setSettingsId(newSettings.id);
      }
      setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'Error saving settings', severity: 'error' });
    }
  };

  const handleTestUrl = (agency, url) => {
    if (url) {
      const popup = window.open(
        url,
        'certification-verification',
        'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setSnackbar({ open: true, message: 'Popup blocked. Please allow popups for this site.', severity: 'warning' });
      } else {
        setSnackbar({ open: true, message: `${agency} verification URL opened successfully`, severity: 'success' });
      }
    } else {
      setSnackbar({ open: true, message: 'Please enter a URL first', severity: 'warning' });
    }
  };

  return (
    <Box>
      <Accordion defaultExpanded sx={{ mb: 3 }}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            '&:before': { display: 'none' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <VerifiedUserIcon color="primary" />
            <Box>
              <Typography variant="h6">{t('settings.cert.title') || 'Certification Verification'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.cert.subtitle') || 'Configure verification portal URLs for certification agencies'}
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
              {t('settings.cert.description') || 'Configure the verification portal URLs for each certification agency. These URLs will be opened in popup windows when verifying customer certifications.'}
            </Typography>

            <Grid container spacing={3}>
              {Object.entries(settings.certificationUrls).map(([agency, url]) => (
                <Grid item xs={12} md={6} key={agency}>
                  <TextField
                    fullWidth
                    label={`${agency} ${t('settings.cert.verificationUrl') || 'Verification URL'}`}
                    value={url}
                    onChange={(e) => handleUrlChange(agency, e.target.value)}
                    placeholder={`${t('settings.cert.enterUrl') || 'Enter'} ${agency} ${t('settings.cert.portalUrl') || 'verification portal URL'}`}
                    variant="outlined"
                    size="small"
                  />
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleTestUrl(agency, url)}
                      disabled={!url}
                    >
                      {t('settings.cert.test') || 'Test URL'}
                    </Button>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                {t('settings.cert.save') || 'Save Certification Settings'}
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>{t('settings.tip') || 'Tip'}:</strong> {t('settings.tipText') || 'Make sure the URLs are correct and accessible. You can test each URL using the "Test URL" button. If a popup is blocked, check your browser\'s popup blocker settings.'}
        </Typography>
      </Alert>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default CertificationVerification;
