import React from 'react';
import { Container, Typography, Box, Paper, Divider, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useTranslation } from 'react-i18next';

const DataRetentionPolicy = () => {
  const { t } = useTranslation();

  const retentionData = [
    {
      dataType: 'Customer Personal Data',
      retentionPeriod: '5 years after last activity',
      details: 'Names, emails, phone numbers, addresses, date of birth, nationality',
      action: 'Anonymized (personal identifiers removed)',
      legalBasis: 'GDPR Article 5(1)(e) - Storage limitation'
    },
    {
      dataType: 'Financial Records (Invoices/Bills)',
      retentionPeriod: '7 years from invoice date',
      details: 'Invoice amounts, payment records, transaction dates',
      action: 'Personal data anonymized after 5 years, financial data kept for tax compliance',
      legalBasis: 'Spanish tax law requirement'
    },
    {
      dataType: 'Booking Records',
      retentionPeriod: '5 years from booking date',
      details: 'Booking dates, activities, equipment, dive sites',
      action: 'Personal data anonymized after 5 years',
      legalBasis: 'GDPR Article 5(1)(e) - Storage limitation'
    },
    {
      dataType: 'Medical Certificates',
      retentionPeriod: '3 years after expiry',
      details: 'Medical certificates, expiry dates, verification status',
      action: 'Anonymized after retention period',
      legalBasis: 'GDPR Article 9 - Special category data'
    },
    {
      dataType: 'Communication Data',
      retentionPeriod: '3 years from communication date',
      details: 'Email communications, customer service notes',
      action: 'Deleted after retention period',
      legalBasis: 'GDPR Article 5(1)(e) - Storage limitation'
    },
    {
      dataType: 'Marketing Consent',
      retentionPeriod: 'Until withdrawn or 3 years inactive',
      details: 'Marketing preferences, consent records',
      action: 'Withdrawn after 3 years of inactivity',
      legalBasis: 'GDPR Article 7 - Consent'
    },
    {
      dataType: 'Consent Records (Audit)',
      retentionPeriod: '5 years after withdrawal',
      details: 'Historical consent records for compliance',
      action: 'Deleted after retention period',
      legalBasis: 'GDPR compliance and audit requirements'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Data Retention Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: December 2024
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Typography variant="body1" paragraph>
            This Data Retention Policy explains how long we retain different types of personal data, 
            in accordance with the General Data Protection Regulation (GDPR) and Spanish tax law requirements.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Key Principle:</strong> We retain personal data only for as long as necessary for 
            the purposes for which it was collected (GDPR Article 5(1)(e) - Storage Limitation).
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Retention Periods by Data Type
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Data Type</strong></TableCell>
                  <TableCell><strong>Retention Period</strong></TableCell>
                  <TableCell><strong>What is Retained</strong></TableCell>
                  <TableCell><strong>Action After Period</strong></TableCell>
                  <TableCell><strong>Legal Basis</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {retentionData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.dataType}</TableCell>
                    <TableCell>{row.retentionPeriod}</TableCell>
                    <TableCell>{row.details}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.legalBasis}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Data Anonymization vs. Deletion
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Anonymization (Preferred Method):</strong>
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Personal identifiers (names, emails, phone numbers, addresses) are removed</li>
              <li>Anonymized transaction records are preserved for tax compliance (7-year requirement)</li>
              <li>Business statistics and aggregate data can be maintained without personal identifiers</li>
              <li>GDPR-compliant while maintaining legal and business requirements</li>
            </ul>
          </Typography>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            <strong>Deletion:</strong>
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Used when no legal requirement exists to retain data</li>
              <li>Complete removal of personal data from our systems</li>
              <li>Applied to communication data and certain consent records</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Financial Records Exception
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Important:</strong> Spanish tax law requires us to retain financial records (invoices, 
            bills, payment records) for 7 years. However, GDPR requires us to minimize personal data retention.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Our Solution:</strong> We anonymize personal identifiers (names, emails, addresses) 
            after 5 years, but preserve anonymized financial transaction data (amounts, dates, transaction 
            IDs) for the full 7-year tax requirement period.
          </Typography>
          <Typography variant="body1" paragraph>
            This approach:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Complies with GDPR (minimizes personal data retention)</li>
              <li>Complies with Spanish tax law (maintains financial records for 7 years)</li>
              <li>Preserves business statistics and accounting records</li>
              <li>Protects your privacy while meeting legal obligations</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Automated Data Retention Management
          </Typography>
          <Typography variant="body1" paragraph>
            Our system automatically manages data retention through:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Scheduled Cleanup Jobs:</strong> Automated processes that identify data past 
              retention periods and anonymize or delete it accordingly</li>
              <li><strong>Last Activity Tracking:</strong> We track your last activity (login, booking, 
              profile update) to determine retention periods accurately</li>
              <li><strong>Financial Record Checks:</strong> Before anonymization, we check if financial 
              records exist and handle them appropriately</li>
            </ul>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Note:</strong> You will not receive individual notifications when your data is 
            anonymized due to retention policies, but you can request your data at any time before 
            anonymization (see Your Rights section below).
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Your Rights
          </Typography>
          <Typography variant="body1" paragraph>
            You have the right to:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Request Access:</strong> See what data we hold about you and how long it will be retained</li>
              <li><strong>Request Early Deletion:</strong> Request deletion of your data before the retention period ends 
              (subject to legal requirements)</li>
              <li><strong>Request Data Export:</strong> Receive a copy of your data in a structured format</li>
              <li><strong>Object to Processing:</strong> Object to certain types of data processing</li>
            </ul>
          </Typography>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            To exercise these rights, please contact us or use the "Privacy Settings" in your account. 
            We will respond within 30 days as required by GDPR.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Changes to This Policy
          </Typography>
          <Typography variant="body1" paragraph>
            We may update this Data Retention Policy from time to time to reflect changes in legal 
            requirements, our practices, or for operational reasons. We will notify you of any material 
            changes by posting the new policy on this page and updating the "Last updated" date.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Related Policies
          </Typography>
          <Typography variant="body1" paragraph>
            For more information, please see:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><Link href="/privacy-policy">Privacy Policy</Link> - How we collect, use, and protect your data</li>
              <li><Link href="/cookie-policy">Cookie Policy</Link> - How we use cookies</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            If you have questions about our data retention practices, please contact us:
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> [To be added]<br />
            <strong>Address:</strong> [To be added]<br />
            <strong>Phone:</strong> [To be added]
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default DataRetentionPolicy;

