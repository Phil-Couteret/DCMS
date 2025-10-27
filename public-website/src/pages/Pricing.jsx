import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

const Pricing = () => {
  const pricingData = {
    caleta: [
      { dives: 1, tourist: 46, resident: 'TBD' },
      { dives: 2, tourist: 44, resident: 'TBD' },
      { dives: 3, tourist: 42, resident: 'TBD' },
      { dives: 4, tourist: 38, resident: 'TBD' },
      { dives: '5+', tourist: 36, resident: 'TBD' }
    ],
    playitas: [
      { dives: 1, tourist: 46, resident: 'TBD' },
      { dives: 2, tourist: 44, resident: 'TBD' },
      { dives: 3, tourist: 42, resident: 'TBD' },
      { dives: 4, tourist: 38, resident: 'TBD' },
      { dives: '5+', tourist: 36, resident: 'TBD' }
    ]
  };

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom>
        Pricing
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary">
        Volume discounts apply automatically. The more you dive, the more you save!
      </Typography>

      <Grid container spacing={4} sx={{ mt: 2 }}>
        {/* Caleta de Fuste */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary" gutterBottom>
                Caleta de Fuste
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Number of Dives</strong></TableCell>
                      <TableCell align="right"><strong>Tourist (€/dive)</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pricingData.caleta.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.dives} {row.dives === 1 ? 'dive' : 'dives'}</TableCell>
                        <TableCell align="right">€{row.tourist}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Example: 3 dives = 3 × €42 = €126 total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Las Playitas */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" color="primary" gutterBottom>
                Las Playitas
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Number of Dives</strong></TableCell>
                      <TableCell align="right"><strong>Tourist (€/dive)</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pricingData.playitas.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.dives} {row.dives === 1 ? 'dive' : 'dives'}</TableCell>
                        <TableCell align="right">€{row.tourist}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Example: 3 dives = 3 × €42 = €126 total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Additional Information */}
      <Box sx={{ mt: 6, bgcolor: '#f5f5f5', p: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          What's Included
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>✓ Professional guide/instructor</Typography>
            <Typography variant="body2" gutterBottom>✓ Tanks and weights</Typography>
            <Typography variant="body2" gutterBottom>✓ Boat trip</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" gutterBottom>✓ Dive briefing</Typography>
            <Typography variant="body2" gutterBottom>✓ Insurance coverage</Typography>
            <Typography variant="body2" gutterBottom>✓ Equipment rental available (extra)</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Equipment Rental
        </Typography>
        <Typography variant="body2" paragraph>
          Full equipment set: €15 per dive
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Individual items available upon request
        </Typography>
      </Box>
    </Container>
  );
};

export default Pricing;

