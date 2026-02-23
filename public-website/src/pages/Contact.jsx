import React from 'react';
import { Box, Container, Typography, Card, CardContent } from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Contact = () => {
  const { t } = useTranslation();
  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        {t('contact.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('contact.contactIntro')}
      </Typography>

      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <EmailIcon color="primary" />
            <Typography variant="h6">{t('nav.contact')}</Typography>
          </Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:contact@couteret.fr" style={{ color: 'inherit', fontWeight: 600 }}>
              contact@couteret.fr
            </a>
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Address:</strong> TBD, Barcelona, Spain
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Phone:</strong>{' '}
            <a href="tel:+34678336889" style={{ color: 'inherit', fontWeight: 600 }}>
              +34 678 336 889
            </a>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('contact.contactIntro')}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Contact;
