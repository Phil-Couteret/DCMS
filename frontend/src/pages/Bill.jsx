import React from 'react';
import { Box, Typography } from '@mui/material';
import useBillData from '../hooks/useBillData';
import BillActions from '../components/Bill/BillActions';
import BillDocument from '../components/Bill/BillDocument';

/**
 * Phase 6.5c (roadmap item 5): split out of the original 1,196-line
 * Bill.jsx. Unlike BoatPrep/Financial/Equipment/Schedule, this page has no
 * tabs or view modes - it's a single printable invoice - so the split here
 * is: all state/effects/handlers into useBillData(), and the render output
 * into a small header actions bar (BillActions) plus the printable
 * document itself (BillDocument), both under components/Bill/.
 */
const Bill = () => {
  const data = useBillData();
  const { loading, calculatedBill } = data;

  if (loading || !calculatedBill) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading bill...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header with actions */}
      <BillActions {...data} />

      {/* Bill Content */}
      <BillDocument {...data} />
    </Box>
  );
};

export default Bill;
