import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import {
  Settings as SettingsIcon,
  VerifiedUser as VerifiedUserIcon,
  Domain as DomainIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  AttachMoney as PricesIcon,
  DirectionsBoat as BoatIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useAuth } from '../utils/authContext';
import { useTranslation } from '../utils/languageContext';
import Prices from '../components/Settings/Prices';
import TenantManagement from '../components/Settings/TenantManagement';
import OrganisationSettings from '../components/Settings/OrganisationSettings';
import LocationsManagement from '../components/Settings/LocationsManagement';
import LocationTypesManagement from '../components/Settings/LocationTypesManagement';
import DiveSitesManagement from '../components/Settings/DiveSitesManagement';
import BoatsManagement from '../components/Settings/BoatsManagement';
import UserManagement from '../components/Settings/UserManagement';
import PartnersManagement from '../components/Settings/PartnersManagement';
import CertificationVerification from '../components/Settings/CertificationVerification';

/**
 * Settings page - a thin tab router. Each tab's content, state, and data
 * loading lives in its own self-contained component under
 * components/Settings/ (same pattern Prices.jsx and TenantManagement.jsx
 * already used before this refactor - Phase 5.2 split the remaining tabs
 * out of what used to be a single ~3,500-line file).
 */
const Settings = () => {
  const { isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      {isSuperAdmin() ? (
        /* Superadmin: Tenant Management only - define tenants (name, locations, type, structure). */
        /* Prices, boats, partners, users, financials are managed by each tenant's admin. */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <DomainIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                Tenant Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create and configure tenants. Define company name, number of locations, location type (diving/bike rental). Operational settings (prices, boats, partners, users) are managed by each tenant&apos;s admin.
              </Typography>
            </Box>
          </Box>
          <TenantManagement />
        </>
      ) : (
        /* Tenant admin: Organisation, locations, prices, boats, partners, users, financials */
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <SettingsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" gutterBottom>
                {t('settings.title') || 'Settings'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('settings.subtitle') || 'Configure system settings and preferences'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
              <Tab icon={<DomainIcon />} label="Organisation" iconPosition="start" />
              <Tab icon={<LocationIcon />} label="Locations" iconPosition="start" />
              <Tab icon={<CategoryIcon />} label="Location Types" iconPosition="start" />
              <Tab icon={<PricesIcon />} label={t('settings.tabs.prices') || 'Prices'} iconPosition="start" />
              <Tab icon={<LocationIcon />} label="Dive Sites" iconPosition="start" />
              <Tab icon={<BoatIcon />} label="Boats" iconPosition="start" />
              <Tab icon={<PeopleIcon />} label={t('settings.tabs.users') || 'User Management'} iconPosition="start" />
              <Tab icon={<BusinessIcon />} label="Partners" iconPosition="start" />
              <Tab icon={<VerifiedUserIcon />} label={t('settings.tabs.certification') || 'Certification Verification'} iconPosition="start" />
            </Tabs>
          </Box>

          {activeTab === 0 && <OrganisationSettings />}
          {activeTab === 1 && <LocationsManagement />}
          {activeTab === 2 && <LocationTypesManagement />}
          {activeTab === 3 && (
            <Box>
              {/* Prices Settings */}
              <Prices />
            </Box>
          )}
          {activeTab === 4 && <DiveSitesManagement />}
          {activeTab === 5 && <BoatsManagement />}
          {activeTab === 6 && <UserManagement />}
          {activeTab === 7 && <PartnersManagement />}
          {activeTab === 8 && <CertificationVerification />}
        </>
      )}

      {/* Version Information */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          DCMS v1.6.6 - Dive Center Management System
        </Typography>
      </Box>
    </Box>
  );
};

export default Settings;
