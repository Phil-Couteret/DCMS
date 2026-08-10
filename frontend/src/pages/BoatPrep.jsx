import React from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import useBoatPrepData from '../hooks/useBoatPrepData';
import DivePreparationTab from '../components/BoatPrep/DivePreparationTab';
import PostDiveReportsTab from '../components/BoatPrep/PostDiveReportsTab';
import ComplianceReportsTab from '../components/BoatPrep/ComplianceReportsTab';

const BoatPrep = () => {
  const data = useBoatPrepData();
  const { activeTab, setActiveTab, t, isComplianceReportsEnabled } = data;

  return (
    <Box>
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label={t('boatPrep.divePreparation')} />
        <Tab label={t('boatPrep.postDiveReports')} />
        {isComplianceReportsEnabled && <Tab label="Compliance Reports" />}
      </Tabs>

      {activeTab === 0 && <DivePreparationTab {...data} />}
      {activeTab === 1 && <PostDiveReportsTab {...data} />}
      {isComplianceReportsEnabled && activeTab === 2 && <ComplianceReportsTab {...data} />}
    </Box>
  );
};

export default BoatPrep;
