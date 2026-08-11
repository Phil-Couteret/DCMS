import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';
import { useAuth } from '../utils/authContext';

// Phase 5.2 split the former ~3,500-line Settings.jsx into one component
// per tab under components/Settings/. This is a regression guard for that
// refactor: it mounts the real page and clicks through every tab, so a
// broken import, a prop mismatch, or a JSX slip introduced while moving
// each section into its own file would fail here instead of only showing
// up when a person happens to click that particular tab in the browser.
vi.mock('../utils/authContext', async () => ({
  ...(await vi.importActual('../utils/authContext')),
  useAuth: vi.fn(),
}));

vi.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'new-id' }),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  },
}));

describe('Settings page (Phase 5.2 tab split)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      isAdmin: () => true,
      isSuperAdmin: () => false,
    });
  });

  it('renders the Organisation tab by default without crashing', async () => {
    render(<Settings />);
    expect(await screen.findByText('Organisation', { selector: 'h5' })).toBeInTheDocument();
  });

  it('renders every tenant-admin tab (Locations, Location Types, Prices, Dive Sites, Boats, Users, Partners, Certification) without crashing', async () => {
    const user = userEvent.setup();
    render(<Settings />);

    // Tab labels use `t('key') || 'Fallback'` - in this test environment
    // (no translation bundle loaded) t() returns the raw key rather than a
    // falsy value, so the || fallback never kicks in. Match loosely enough
    // to catch either form rather than asserting the languageContext's
    // internals.
    const tabNamePatterns = [
      /^Locations$/,
      /^Location Types$/,
      /prices/i,
      /^Dive Sites$/,
      /^Boats$/,
      /users/i,
      /^Partners$/,
      /certification/i,
    ];

    const tablist = await screen.findByRole('tablist');
    for (const pattern of tabNamePatterns) {
      const tab = within(tablist).getByRole('tab', { name: pattern });
      await user.click(tab);
      // Just proving the tab switched and its component mounted without
      // throwing is the point.
    }

    // Spot-check one concrete result of the last tab (Certification
    // Verification) actually mounting: its default PADI URL, a hardcoded
    // constant rather than translated text, so it's unambiguous.
    expect(screen.getByDisplayValue('https://www.padi.com/verify')).toBeInTheDocument();
  });

  it('renders Tenant Management instead of tabs for superadmin', async () => {
    useAuth.mockReturnValue({
      isAdmin: () => true,
      isSuperAdmin: () => true,
    });
    // TenantManagement.jsx (unchanged by this refactor) talks to httpClient
    // directly - stub fetch so it doesn't throw on mount.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<Settings />);
    expect(await screen.findByText('Tenant Management', { selector: 'h4' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
