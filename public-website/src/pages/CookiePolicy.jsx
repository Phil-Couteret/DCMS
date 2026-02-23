import React from 'react';
import { Container, Typography, Box, Paper, Divider, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

const CookiePolicy = () => {
  useTranslation(); // i18n ready for future translation

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Cookie Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: December 2024
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. What Are Cookies?
          </Typography>
          <Typography variant="body1" paragraph>
            Cookies are small text files that are placed on your device when you visit our website. 
            They are widely used to make websites work more efficiently and provide information to 
            the website owners.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            2. How We Use Cookies
          </Typography>
          <Typography variant="body1" paragraph>
            We use cookies for the following purposes:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Essential Cookies:</strong> Required for the website to function properly. 
              These cookies enable core functionality such as security, network management, and accessibility. 
              You cannot opt-out of these cookies as they are essential for the website to work.</li>
              <li><strong>Functional Cookies:</strong> Enable enhanced functionality and personalization, 
              such as remembering your preferences (language, location). These cookies are optional.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our 
              website by collecting and reporting information anonymously. These cookies are only used 
              with your explicit consent.</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            3. Types of Cookies We Use
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Session Cookies:</strong> Temporary cookies that are deleted when you close your browser. 
            These are used to maintain your session while navigating the website.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them. 
            These are used to remember your preferences and settings.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            4. Third-Party Cookies
          </Typography>
          <Typography variant="body1" paragraph>
            We do not currently use third-party cookies for advertising or tracking purposes. If this 
            changes in the future, we will update this policy and request your consent before implementing 
            such cookies.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            5. Managing Cookies
          </Typography>
          <Typography variant="body1" paragraph>
            You can control and manage cookies in various ways:
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or accept cookies. 
              You can also configure your browser to notify you when cookies are set. However, blocking 
              essential cookies may affect website functionality.</li>
              <li><strong>Our Cookie Consent:</strong> When you first visit our website, we will ask for 
              your consent for non-essential cookies. You can change your preferences at any time through 
              your account settings or by clearing your browser cookies.</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            6. Cookies We Currently Use
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Essential Cookies (No Consent Required):</strong>
          </Typography>
          <Typography component="div" variant="body2">
            <ul>
              <li><strong>Session ID:</strong> Maintains your login session</li>
              <li><strong>Language Preference:</strong> Remembers your language selection</li>
              <li><strong>Location Preference:</strong> Remembers your selected dive location</li>
            </ul>
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            7. Changes to This Policy
          </Typography>
          <Typography variant="body1" paragraph>
            We may update this Cookie Policy from time to time to reflect changes in our practices or 
            for legal, operational, or regulatory reasons. We will notify you of any changes by posting 
            the new policy on this page and updating the "Last updated" date.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            8. More Information
          </Typography>
          <Typography variant="body1" paragraph>
            For more information about cookies, including how to see what cookies have been set and how 
            to manage and delete them, visit <Link href="https://www.allaboutcookies.org" target="_blank" rel="noopener">www.allaboutcookies.org</Link>.
          </Typography>
          <Typography variant="body1" paragraph>
            For more information about our data practices, please see our{' '}
            <Link href="/privacy-policy">Privacy Policy</Link>.
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            9. Contact Us
          </Typography>
          <Typography variant="body1" paragraph>
            If you have questions about our use of cookies, please contact us:
          </Typography>
          <Typography variant="body2">
            <strong>Email:</strong> contact@couteret.fr<br />
            <strong>Address:</strong> TBD, Barcelona, Spain<br />
            <strong>Phone:</strong> +34 678 336 889
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default CookiePolicy;

