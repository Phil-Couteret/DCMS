import React from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import {
  Print as PrintIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

/**
 * Phase 6.5c extraction: header action bar (back/email/print/download),
 * split out of Bill.jsx. Presentational only - state/handlers come from
 * useBillData() via props.
 */
export default function BillActions(props) {
  const { navigate, calculatedBill, emailBill, stay, printBill, downloadBill, stayBilled } = props;

  return (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/stays')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Invoice {calculatedBill.billNumber}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={emailBill}
            disabled={!stay.customer.email}
          >
            Email Bill
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printBill}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={downloadBill}
          >
            Download
          </Button>
          {stayBilled && (
            <Button
              variant="contained"
              color="success"
              disabled
            >
              Stay Closed
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/stays')}
          >
            Back to Stays
          </Button>
        </Box>
      </Box>
  );
}
