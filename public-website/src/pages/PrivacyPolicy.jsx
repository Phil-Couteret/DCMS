import React from 'react';
import { Container, Typography, Box, Paper, Divider, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
  useTranslation(); // i18n ready for future translation

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Privacy Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: December 2024
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. Introduction
          </Typography>
          <Typography variant="body1" paragraph>
            We ("we", "our", "us") are committed to protecting your privacy and personal data. 
            This Privacy Policy explains how we collect, use, store, and protect your personal information 
            in accordance with the General Data Protection Regulation (GDPR) and other applicable data 
            protection laws.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2. Data Controller
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Data Controller:</strong> DCMS<br />
            <strong>Location:</strong> Spain (EU)<br />
            <strong>Address:</strong> TBD, Barcelona, Spain<br />
            <strong>Email:</strong> contact@couteret.fr<br />
            <strong>Phone:</strong> +34 678 336 889
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            3. Personal Data We Collect
          </Typography>
          <Typography variant="body1" paragraph>
            We collect the following types of personal data:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Identity Data:</strong> First name, last name, date of birth, nationality</li>
              <li><strong>Contact Data:</strong> Email address, phone number, address</li>
              <li><strong>Booking Data:</strong> Dive bookings, dates, activity preferences</li>
              <li><strong>Health Data:</strong> Medical conditions, medical certificates, diving insurance documents</li>
              <li><strong>Certification Data:</strong> Diving certifications, certification numbers, agencies</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information (if logged)</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            4. How We Use Your Data
          </Typography>
          <Typography variant="body1" paragraph>
            We use your personal data for the following purposes:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Service Provision:</strong> To process and manage your dive bookings and provide diving services</li>
              <li><strong>Safety:</strong> To ensure your safety during dives by reviewing medical certificates and diving experience</li>
              <li><strong>Legal Obligations:</strong> To comply with Spanish maritime regulations and safety requirements</li>
              <li><strong>Communication:</strong> To send booking confirmations, important safety information, and service updates</li>
              <li><strong>Marketing:</strong> Only with your explicit consent - to send promotional offers and newsletters</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            5. Legal Basis for Processing
          </Typography>
          <Typography variant="body1" paragraph>
            We process your personal data based on the following legal grounds:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Contract (Article 6(1)(b)):</strong> Necessary to fulfill dive booking contracts</li>
              <li><strong>Legal Obligation (Article 6(1)(c)):</strong> Required by Spanish maritime and safety regulations</li>
              <li><strong>Consent (Article 6(1)(a)):</strong> For marketing communications (you can withdraw at any time)</li>
              <li><strong>Legitimate Interests (Article 6(1)(f)):</strong> For business operations and service improvement</li>
            </ul>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Special Category Data (Medical):</strong> We process your medical information based on your explicit consent 
            and for the substantial public interest of ensuring diving safety (Article 9(2)(a) and (g) GDPR).
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            6. Data Sharing and Disclosure
          </Typography>
          <Typography variant="body1" paragraph>
            We do not sell your personal data. We currently do not use third-party data processors for automated data processing. 
            We may share your data with:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Maritime Authorities:</strong> As required by Spanish regulations for dive log reporting</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect safety</li>
            </ul>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Note:</strong> If we begin using third-party data processors (such as payment processors, hosting providers, 
            or email services) in the future, we will update this Privacy Policy to disclose their identities, purposes, 
            and locations, and ensure appropriate data processing agreements are in place.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            7. Data Retention
          </Typography>
          <Typography variant="body1" paragraph>
            We retain your personal data only for as long as necessary, in accordance with GDPR Article 5(1)(e). 
            Our data retention policies are automatically enforced:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Customer Personal Data:</strong> Retained for 5 years (1,825 days) after your last activity 
              (last login, booking, or profile update). After this period, your personal information will be automatically 
              anonymized (names, emails, phone numbers, addresses removed, but transaction records kept for tax compliance).</li>
              <li><strong>Financial Records (Invoices/Bills):</strong> Retained for 7 years (2,555 days) from the invoice date 
              to comply with Spanish tax law requirements. Personal identifiers are anonymized after 5 years, but financial 
              amounts and transaction dates are preserved.</li>
              <li><strong>Booking Records:</strong> Retained for 5 years from the booking date. After this period, personal 
              data is anonymized, but aggregate statistics may be kept for business analysis.</li>
              <li><strong>Medical Certificates:</strong> Retained for 3 years (1,095 days) after the certificate expiry date. 
              Expired certificates are automatically anonymized after the retention period.</li>
              <li><strong>Marketing Consent:</strong> Remains active until you withdraw it, or expires after 3 years of account 
              inactivity. You can withdraw marketing consent at any time through your account settings.</li>
              <li><strong>Communication Data:</strong> Retained for 3 years (1,095 days) after the communication date.</li>
            </ul>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Data Anonymization:</strong> Instead of deleting data, we anonymize personal identifiers (names, emails, 
            phone numbers, addresses) while preserving anonymized transaction records for tax compliance and business statistics. 
            This allows us to comply with both GDPR requirements and Spanish tax law (7-year retention of financial records).
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Automated Cleanup:</strong> Our system automatically runs data retention cleanup processes to ensure 
            data is anonymized according to these policies. You will not receive individual notifications when your data 
            is anonymized due to retention policies, but you can request your data at any time before anonymization.
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
            For more details, see our <Link href="/data-retention-policy">Data Retention Policy</Link>.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            8. Your Rights Under GDPR
          </Typography>
          <Typography variant="body1" paragraph>
            You have the following rights regarding your personal data:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Right to Access (Article 15):</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification (Article 16):</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure (Article 17):</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restrict Processing (Article 18):</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability (Article 20):</strong> Receive your data in a structured format</li>
              <li><strong>Right to Object (Article 21):</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent (Article 7):</strong> Withdraw consent at any time</li>
            </ul>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            To exercise these rights, please contact us or use the "Privacy Settings" in your account. 
            We will respond within 30 days.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            9. Data Security
          </Typography>
          <Typography variant="body1" paragraph>
            We implement appropriate technical and organizational measures to protect your personal data:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li>Encryption of data in transit (HTTPS)</li>
              <li>Secure password storage (hashed passwords)</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
              <li>Secure data backup procedures</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            10. Cookies and Tracking
          </Typography>
          <Typography variant="body1" paragraph>
            We use essential cookies for the functioning of the website. We do not use tracking cookies 
            or analytics without your explicit consent. For more information, please see our{' '}
            <Link href="/cookie-policy">Cookie Policy</Link>.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            10a. Automated Decision-Making
          </Typography>
          <Typography variant="body1" paragraph>
            We do not use automated decision-making or profiling that produces legal effects concerning you 
            or similarly significantly affects you. All decisions regarding your bookings, services, and 
            account are made by our staff or through manual processes.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            11. Children's Privacy
          </Typography>
          <Typography variant="body1" paragraph>
            Our services are not intended for children under 16 years of age. If we become aware that 
            we have collected personal data from a child under 16, we will take steps to delete such 
            information promptly.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            12. Changes to This Policy
          </Typography>
          <Typography variant="body1" paragraph>
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new policy on this page and updating the "Last updated" date.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            13. Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> contact@couteret.fr<br />
            <strong>Address:</strong> TBD, Barcelona, Spain<br />
            <strong>Phone:</strong> +34 678 336 889
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            14. Complaints
          </Typography>
          <Typography variant="body1" paragraph>
            If you believe we have not handled your personal data in accordance with GDPR, you have the 
            right to lodge a complaint with the Spanish Data Protection Authority (AEPD):
          </Typography>
          <Typography variant="body2">
            <strong>Agencia Española de Protección de Datos (AEPD)</strong><br />
            Website: <Link href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</Link><br />
            Email: internacional@aepd.es
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;

