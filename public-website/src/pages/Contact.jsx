import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button
} from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Contact = () => {
  const { t } = useTranslation();
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('contact.title')}
      </Typography>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Caleta de Fuste */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                {t('contact.caletaTitle')}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Muelle Deportivo / Calle Teneriffe
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      E - 35610 Caleta de Fuste<br />
                      Fuerteventura, Spain
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{t('contact.phone')}</Typography>
                    <Typography variant="body2">+34.928 163 712</Typography>
                    <Typography variant="body2">+34.606 275 468</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start' }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{t('contact.email')}</Typography>
                    <Typography variant="body2">info@deep-blue-diving.com</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Las Playitas */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary">
                {t('contact.playitasTitle')}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <LocationIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Hotel Gran Resort Las Playitas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Las Playitas<br />
                      Fuerteventura, Spain
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{t('contact.phone')}</Typography>
                    <Typography variant="body2">+34.653 512 638</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'start' }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{t('contact.email')}</Typography>
                    <Typography variant="body2">playitas@deep-blue-diving.com</Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Contact Form */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom>
          {t('contact.sendMessage')}
        </Typography>
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField label={t('contact.yourName')} fullWidth required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label={t('contact.email')} type="email" fullWidth required />
              </Grid>
              <Grid item xs={12}>
                <TextField label={t('contact.subject')} fullWidth required />
              </Grid>
              <Grid item xs={12}>
                <TextField label={t('contact.message')} multiline rows={6} fullWidth required />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" size="large">
                  {t('contact.sendMessageButton')}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Contact;

