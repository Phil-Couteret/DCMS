import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';

const MyAccount = () => {
  const [tabValue, setTabValue] = useState(0);

  const mockBookings = [
    { id: 1, date: '2024-12-20', location: 'Caleta de Fuste', dives: 2, status: 'confirmed', total: 88 },
    { id: 2, date: '2024-12-22', location: 'Caleta de Fuste', dives: 1, status: 'confirmed', total: 46 }
  ];

  const mockCertifications = [
    { agency: 'SSI', level: 'Open Water Diver', certificationNumber: '123456', date: '2020-05-15' },
    { agency: 'PADI', level: 'Advanced Open Water', certificationNumber: '789012', date: '2021-08-22' }
  ];

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        My Account
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Bookings" />
          <Tab label="Profile" />
          <Tab label="Certifications" />
        </Tabs>
      </Box>

      {/* Bookings Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">My Bookings</Typography>
            <Button variant="contained" startIcon={<AddIcon />} href="/book-dive">
              Book a Dive
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Location</strong></TableCell>
                  <TableCell align="right"><strong>Dives</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="right"><strong>Total</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.location}</TableCell>
                    <TableCell align="right">{booking.dives}</TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.status} 
                        color={booking.status === 'confirmed' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">€{booking.total}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<EditIcon />}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Profile Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5">Personal Information</Typography>
              <Button variant="outlined" startIcon={<EditIcon />}>
                Edit Profile
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">First Name</Typography>
                <Typography variant="body1" gutterBottom>John</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Last Name</Typography>
                <Typography variant="body1" gutterBottom>Doe</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1" gutterBottom>john.doe@example.com</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1" gutterBottom>+34 123 456 789</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Certifications Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">My Certifications</Typography>
            <Button variant="outlined" startIcon={<AddIcon />}>
              Add Certification
            </Button>
          </Box>

          <Grid container spacing={3}>
            {mockCertifications.map((cert, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {cert.agency} - {cert.level}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cert. Number: {cert.certificationNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date: {cert.date}
                    </Typography>
                    <Button size="small" sx={{ mt: 2 }}>
                      Verify
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default MyAccount;

