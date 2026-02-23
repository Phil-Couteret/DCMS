import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Check as CheckIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Euro as EuroIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Price = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const plans = [
    {
      id: 'starter',
      price: 49,
      nameKey: 'platformPrice.starter',
      descKey: 'platformPrice.starterDesc',
      popular: false,
      features: [
        'platformPrice.locations1',
        'platformPrice.diveSites10',
        'platformPrice.boats5',
        'platformPrice.users5',
        'platformPrice.customers200',
        'platformPrice.storage2gb',
        'platformPrice.partners1',
        'platformPrice.supportEmail'
      ]
    },
    {
      id: 'professional',
      price: 99,
      nameKey: 'platformPrice.professional',
      descKey: 'platformPrice.professionalDesc',
      popular: true,
      features: [
        'platformPrice.locations3',
        'platformPrice.diveSites30',
        'platformPrice.boats15',
        'platformPrice.users15',
        'platformPrice.customers1000',
        'platformPrice.storage5gb',
        'platformPrice.partners5',
        'platformPrice.supportEmailWhatsapp'
      ]
    },
    {
      id: 'enterprise',
      price: 159,
      nameKey: 'platformPrice.enterprise',
      descKey: 'platformPrice.enterpriseDesc',
      popular: false,
      features: [
        'platformPrice.locationsUnlimited',
        'platformPrice.diveSitesUnlimited',
        'platformPrice.boatsUnlimited',
        'platformPrice.usersUnlimited',
        'platformPrice.customersUnlimited',
        'platformPrice.storage10gb',
        'platformPrice.partnersUnlimited',
        'platformPrice.supportPriority'
      ]
    }
  ];

  const paymentOptions = [
    { cycle: 'platformPrice.monthly', discount: 0, label: 'platformPrice.noDiscount' },
    { cycle: 'platformPrice.quarterly', discount: 5, label: 'platformPrice.discount5' },
    { cycle: 'platformPrice.semester', discount: 8, label: 'platformPrice.discount8' },
    { cycle: 'platformPrice.yearly', discount: 15, label: 'platformPrice.discount15' }
  ];

  const differentiators = [
    { icon: SecurityIcon, key: 'platformPrice.diffGdpr', highlight: true },
    { icon: StorageIcon, key: 'platformPrice.diffFrance', highlight: true },
    { icon: ScheduleIcon, key: 'platformPrice.diffSeasonal', highlight: false },
    { icon: EuroIcon, key: 'platformPrice.diffStorage', highlight: false }
  ];

  return (
    <Box>
      {/* Hero */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container>
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            {t('platformPrice.heroTitle')}
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.95 }}>
            {t('platformPrice.heroSubtitle')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Chip
              icon={<SecurityIcon />}
              label={t('platformPrice.badgeGdpr')}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
            />
            <Chip
              icon={<StorageIcon />}
              label={t('platformPrice.badgeFrance')}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
            />
          </Box>
        </Container>
      </Box>

      {/* Differentiators */}
      <Container sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom textAlign="center" fontWeight="bold">
          {t('platformPrice.whyChooseUs')}
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4, maxWidth: 700, mx: 'auto' }}>
          {t('platformPrice.whyChooseUsDesc')}
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {differentiators.map(({ icon: Icon, key, highlight }) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderColor: highlight ? 'primary.main' : 'divider',
                  borderWidth: highlight ? 2 : 1,
                  bgcolor: highlight ? 'rgba(25, 118, 210, 0.08)' : undefined
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Icon sx={{ fontSize: 48, color: highlight ? 'primary.main' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" fontWeight={highlight ? 600 : 400}>
                    {t(key)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Plans */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 8 }}>
        <Container>
          <Typography variant="h4" gutterBottom textAlign="center" fontWeight="bold">
            {t('platformPrice.plansTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
            {t('platformPrice.plansSubtitle')}
          </Typography>

          <Grid container spacing={4} justifyContent="center">
            {plans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: plan.popular ? '2px solid' : undefined,
                    borderColor: plan.popular ? 'primary.main' : undefined
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label={t('platformPrice.mostPopular')}
                      color="primary"
                      size="small"
                      sx={{ position: 'absolute', top: 16, right: 16 }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" gutterBottom fontWeight="bold">
                      {t(plan.nameKey)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t(plan.descKey)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                      <Typography variant="h3" component="span" fontWeight="bold">
                        €{plan.price}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ ml: 1 }}>
                        /{t('platformPrice.month')}
                      </Typography>
                    </Box>
                    <List dense disablePadding>
                      {plan.features.map((fKey) => (
                        <ListItem key={fKey} disableGutters sx={{ py: 0.25 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={t(fKey)} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      variant={plan.popular ? 'contained' : 'outlined'}
                      fullWidth
                      onClick={() => navigate('/contact')}
                    >
                      {t('platformPrice.contactUs')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Payment options */}
      <Container sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          {t('platformPrice.paymentOptionsTitle')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {t('platformPrice.paymentOptionsDesc')}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: 500 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>{t('platformPrice.billingCycle')}</strong></TableCell>
                <TableCell align="right"><strong>{t('platformPrice.effectiveMonthly')}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paymentOptions.map((opt) => (
                <TableRow key={opt.cycle}>
                  <TableCell>{t(opt.cycle)}</TableCell>
                  <TableCell align="right">{t(opt.label)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Seasonal option */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 6 }}>
        <Container>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {t('platformPrice.seasonalTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('platformPrice.seasonalDesc')}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('platformPrice.seasonal6moMonthly')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('platformPrice.seasonal6moMonthlyDesc')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('platformPrice.seasonal6moOnce')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('platformPrice.seasonal6moOnceDesc')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    {t('platformPrice.storageOffSeason')}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary.main" gutterBottom>
                    €2 / 5 GB / {t('platformPrice.month')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('platformPrice.storageOffSeasonDesc')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Feature comparison */}
      <Container sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          {t('platformPrice.compareTitle')}
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>{t('platformPrice.feature')}</strong></TableCell>
                <TableCell align="center"><strong>Starter</strong></TableCell>
                <TableCell align="center"><strong>Professional</strong></TableCell>
                <TableCell align="center"><strong>Enterprise</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{t('platformPrice.locations')}</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center">3</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.diveSites')}</TableCell>
                <TableCell align="center">10</TableCell>
                <TableCell align="center">30</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.boats')}</TableCell>
                <TableCell align="center">5</TableCell>
                <TableCell align="center">15</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.users')}</TableCell>
                <TableCell align="center">5</TableCell>
                <TableCell align="center">15</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.customers')}</TableCell>
                <TableCell align="center">200</TableCell>
                <TableCell align="center">1 000</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.storage')}</TableCell>
                <TableCell align="center">2 GB</TableCell>
                <TableCell align="center">5 GB</TableCell>
                <TableCell align="center">10 GB</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.partners')}</TableCell>
                <TableCell align="center">1</TableCell>
                <TableCell align="center">5</TableCell>
                <TableCell align="center">∞</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('platformPrice.support')}</TableCell>
                <TableCell align="center">Email</TableCell>
                <TableCell align="center">Email + WhatsApp</TableCell>
                <TableCell align="center">{t('platformPrice.prioritySupport')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* Extra storage */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 4 }}>
        <Container>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('platformPrice.extraStorageTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {t('platformPrice.extraStorageDesc')}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <li><Typography component="span">{t('platformPrice.storageTier10')}</Typography></li>
            <li><Typography component="span">{t('platformPrice.storageTier25')}</Typography></li>
            <li><Typography component="span">{t('platformPrice.storageTier50')}</Typography></li>
          </Box>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Container>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            {t('platformPrice.ctaTitle')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('platformPrice.ctaDesc')}
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/contact')}>
            {t('platformPrice.contactUs')}
          </Button>
        </Container>
      </Box>
    </Box>
  );
};

export default Price;
