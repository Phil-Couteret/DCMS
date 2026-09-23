import React from 'react';
import { Box, Tabs, Tab, Alert, Snackbar } from '@mui/material';
import { ScubaDiving as DivingEquipmentIcon, LocalGasStation as TankIcon } from '@mui/icons-material';
import useEquipmentData from '../hooks/useEquipmentData';
import EquipmentTab from '../components/Equipment/EquipmentTab';
import TanksTab from '../components/Equipment/TanksTab';

/**
 * Phase 6.5 (roadmap item 5): split out of the original 2,240-line
 * Equipment.jsx using the same shared-hook + presentational-tabs pattern as
 * BoatPrep.jsx/Financial.jsx (Phase 5.2) - all state/effects/handlers live
 * in useEquipmentData(), this file is just the tab router + shared Snackbar.
 */
const Equipment = () => {
  const data = useEquipmentData();
  const { activeTab, setActiveTab, isBikeRental, isSurfRental, isKiteSurfRental, snackbar, setSnackbar } = data;

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Equipment" icon={<DivingEquipmentIcon />} iconPosition="start" />
        <Tab label="Tanks / Cylinders" icon={<TankIcon />} iconPosition="start" disabled={isBikeRental || isSurfRental || isKiteSurfRental} />
      </Tabs>

      {activeTab === 0 && <EquipmentTab {...data} />}
      {activeTab === 1 && !isBikeRental && <TanksTab {...data} />}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Equipment;
