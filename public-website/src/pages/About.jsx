import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import { Settings as EquipmentIcon, Stars as AwardIcon, Groups as CrewIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('about.title')}
      </Typography>

      {/* Philosophy Section */}
      <Box sx={{ my: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom color="primary">
          {t('about.philosophyTitle')}
        </Typography>
        <Typography variant="h6" sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 4 }}>
          "{t('about.philosophyQuote')}"
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: '800px', mx: 'auto' }}>
          {t('about.philosophyDesc')}
        </Typography>
      </Box>

      {/* Features */}
      <Grid container spacing={4} sx={{ my: 6 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent sx={{ p: 4 }}>
              <CrewIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('about.crewTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('about.crewDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent sx={{ p: 4 }}>
              <EquipmentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('about.equipmentTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('about.equipmentDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent sx={{ p: 4 }}>
              <AwardIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('about.awardsTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('about.awardsDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Crew */}
      <Box sx={{ my: 8 }}>
        <Typography variant="h4" gutterBottom>
          {t('about.teamTitle')}
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ textAlign: 'center', p: 2 }}>
              <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Deep Blue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('about.ownerTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('about.certified')}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Awards & Certifications */}
      <Box sx={{ my: 8, bgcolor: '#f5f5f5', p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          {t('about.certificationsTitle')}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" color="primary">SSI</Typography>
              <Typography variant="body2">Scuba Schools International</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" color="primary">PADI</Typography>
              <Typography variant="body2">Professional Association</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" color="primary">CMAS</Typography>
              <Typography variant="body2">Confédération Mondiale</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" color="primary">VDST</Typography>
              <Typography variant="body2">German Federation</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default About;

