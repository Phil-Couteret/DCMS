import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { TrendingDown as TrendingDownIcon } from '@mui/icons-material';

const VolumeDiscountCalculator = ({ numberOfDives, addons = {}, bono }) => {
  const [tiers, setTiers] = useState([]);
  const [currentTier, setCurrentTier] = useState(null);
  const [addonTotal, setAddonTotal] = useState(0);

  useEffect(() => {
    loadTiers();
    calculateCurrentTier();
    calculateAddons();
  }, [numberOfDives, addons]);

  const loadTiers = () => {
    // This would normally come from dataService
    const config = JSON.parse(localStorage.getItem('dcms_pricingConfig')) || [{
      tiers: [
        { dives: 1, price: 46 },
        { dives: 2, price: 44 },
        { dives: 3, price: 44 },
        { dives: 4, price: 42 },
        { dives: 5, price: 42 },
        { dives: 6, price: 42 },
        { dives: 7, price: 40 },
        { dives: 8, price: 40 },
        { dives: 9, price: 38 }
      ],
      addons: {
        nightDive: 20,
        personalInstructor: 100
      }
    }];
    setTiers(config[0].tiers);
  };

  const calculateCurrentTier = () => {
    const config = JSON.parse(localStorage.getItem('dcms_pricingConfig')) || [{
      tiers: [
        { dives: 1, price: 46 },
        { dives: 2, price: 44 },
        { dives: 3, price: 44 },
        { dives: 4, price: 42 },
        { dives: 5, price: 42 },
        { dives: 6, price: 42 },
        { dives: 7, price: 40 },
        { dives: 8, price: 40 },
        { dives: 9, price: 38 }
      ]
    }];
    
    const tier = config[0].tiers.find(t => t.dives >= numberOfDives) || config[0].tiers[config[0].tiers.length - 1];
    setCurrentTier(tier);
  };

  const calculateAddons = () => {
    let total = 0;
    if (addons && addons.nightDive) total += 20;
    if (addons && addons.personalInstructor) total += 100;
    setAddonTotal(total);
  };

  const getDiscountPercentage = (price) => {
    const basePrice = 46; // First tier price
    return Math.round(((basePrice - price) / basePrice) * 100);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TrendingDownIcon sx={{ mr: 1, color: 'success.main' }} />
        <Typography variant="h6">
          Volume Discount Pricing System
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        The more dives you book, the lower the price per dive. Discount is calculated automatically.
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Number of Dives</TableCell>
              <TableCell align="right">Price per Dive</TableCell>
              <TableCell align="right">Total Price</TableCell>
              <TableCell align="center">Discount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tiers.map((tier, index) => {
              const isCurrent = tier.dives >= numberOfDives && (!index || tiers[index - 1].dives < numberOfDives);
              const total = tier.price * numberOfDives;
              const discount = getDiscountPercentage(tier.price);
              
              return (
                <TableRow 
                  key={tier.dives}
                  sx={{ 
                    bgcolor: isCurrent ? 'primary.50' : 'transparent',
                    '& .MuiTableCell-root': { fontWeight: isCurrent ? 'bold' : 'normal' }
                  }}
                >
                  <TableCell>
                    {tier.dives} {tier.dives === 1 ? 'dive' : 'dives'}
                  </TableCell>
                  <TableCell align="right">€{tier.price.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    €{(tier.price * numberOfDives).toFixed(2)}
                    {isCurrent && ' ✓'}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`-${discount}%`}
                      size="small"
                      color={isCurrent ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {currentTier && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Calculation:
          </Typography>
          <Typography variant="body2">
            <strong>{numberOfDives} dives</strong> × <strong>€{currentTier.price.toFixed(2)}</strong> = <strong>€{(currentTier.price * numberOfDives).toFixed(2)}</strong>
          </Typography>
          {addonTotal > 0 && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              + Addons: <strong>€{addonTotal.toFixed(2)}</strong>
            </Typography>
          )}
          {bono && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
              + Bono discount: <strong>-{bono.discountPercentage}%</strong>
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default VolumeDiscountCalculator;

