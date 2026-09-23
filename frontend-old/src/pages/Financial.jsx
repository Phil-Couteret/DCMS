import React from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import useFinancialData from '../hooks/useFinancialData';
import CurrentFinancialTab from '../components/Financial/CurrentFinancialTab';
import PreviousClosedDaysTab from '../components/Financial/PreviousClosedDaysTab';
import QuarterlyTaxDeclarationTab from '../components/Financial/QuarterlyTaxDeclarationTab';
import HistoricalBillsTab from '../components/Financial/HistoricalBillsTab';
import FinancialDialogs from '../components/Financial/FinancialDialogs';

const Financial = () => {
  const data = useFinancialData();
  const { activeTab, setActiveTab, isBikeRental, t, taxName } = data;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          {t('financial.title')}
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label={t('financial.currentFinancial')} icon={<MoneyIcon />} iconPosition="start" />
          {!isBikeRental && (
            <Tab label={t('financial.closedDays')} icon={<HistoryIcon />} iconPosition="start" />
          )}
          <Tab label={t('financial.historicalBills')} icon={<ReceiptIcon />} iconPosition="start" />
          <Tab label={t('financial.quarterlyTaxDeclaration').replace('{tax}', taxName)} icon={<DescriptionIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {activeTab === 0 && <CurrentFinancialTab {...data} />}
      {activeTab === 1 && !isBikeRental && <PreviousClosedDaysTab {...data} />}
      {((activeTab === 3 && !isBikeRental) || (activeTab === 2 && isBikeRental)) && <QuarterlyTaxDeclarationTab {...data} />}
      {((activeTab === 2 && !isBikeRental) || (activeTab === 1 && isBikeRental)) && <HistoricalBillsTab {...data} />}

      <FinancialDialogs {...data} />
    </Box>
  );
};

export default Financial;
