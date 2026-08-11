import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Equipment from './Equipment';

// Phase 6.5 (roadmap item 5, "split Equipment.jsx/Schedule.jsx/Bill.jsx")
// split the former ~2,240-line Equipment.jsx into a shared useEquipmentData()
// hook plus 2 presentational tabs (EquipmentTab, TanksTab) under
// components/Equipment/ - same pattern as BoatPrep.jsx/Financial.jsx in
// Phase 5.2. This test mounts the real page and switches tabs to prove
// each renders without throwing, which would surface a dropped prop or
// missing import as a crash rather than only on click in the browser.
//
// Note: CRA's Jest config sets resetMocks: true, so mock return values are
// (re)configured in beforeEach rather than inside vi.mock() factories -
// see Financial.smoke.test.jsx for the gotcha this works around.
vi.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/tankService', () => ({
  __esModule: true,
  default: {
    enrichTankWithMetadata: vi.fn((tank) => tank),
    getTankMetadata: vi.fn(() => ({})),
    saveTankMetadata: vi.fn(),
    deleteTankMetadata: vi.fn(),
  },
}));

vi.mock('../utils/authContext', async () => ({
  ...(await vi.importActual('../utils/authContext')),
  useAuth: vi.fn(),
}));

import { useAuth } from '../utils/authContext';
import dataService from '../services/dataService';

beforeEach(() => {
  window.localStorage.clear();
  // Global admin (empty locationAccess) so both tabs are enabled/visible
  // regardless of which location, if any, is selected.
  useAuth.mockReturnValue({ user: { role: 'admin', locationAccess: [] } });
  dataService.getAll.mockImplementation((resource) => {
    if (resource === 'equipment') {
      return Promise.resolve([
        { id: 'eq-1', name: 'BCD Mares', category: 'diving', type: 'standard', isAvailable: true, locationId: 'loc-1' },
      ]);
    }
    if (resource === 'locations') {
      return Promise.resolve([{ id: 'loc-1', name: 'Test Bay', type: 'diving' }]);
    }
    return Promise.resolve([]);
  });
});

describe('Equipment page (Phase 6.5: shared hook + tab split)', () => {
  it('renders the Equipment tab by default without crashing', async () => {
    render(<Equipment />);
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getAllByRole('tab').length).toBe(2);
    // Proves the equipment list loaded via dataService rather than crashing.
    expect(await screen.findByText('BCD Mares')).toBeInTheDocument();
  });

  it('switches to the Tanks / Cylinders tab without crashing', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    const tablist = await screen.findByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[1]);
    expect(await screen.findByText(/Tanks \/ Cylinders Testing Tracker/i)).toBeInTheDocument();
  });

  it('switches back to the Equipment tab without crashing', async () => {
    const user = userEvent.setup();
    render(<Equipment />);
    const tablist = await screen.findByRole('tablist');
    let tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[1]);
    await screen.findByText(/Tanks \/ Cylinders Testing Tracker/i);
    tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[0]);
    expect(await screen.findByText('BCD Mares')).toBeInTheDocument();
  });
});
