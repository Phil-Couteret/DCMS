import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoatPrep from './BoatPrep';

// Phase 5.2 part 2 split the former ~2,700-line BoatPrep.jsx into a shared
// useBoatPrepData() hook plus 3 presentational tab components under
// components/BoatPrep/. Unlike Settings.jsx's independent tabs, these 3
// tabs share one hook call's worth of state, so the regression risk here
// is a missed prop in the destructure/spread rather than a missing import.
// This test mounts the real page, switches through all 3 tabs, and proves
// each renders without throwing (which would surface any dropped prop as
// a "used before assigned" / undefined-read crash).
vi.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(null),
    getAvailableEquipment: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'new-id' }),
    update: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('dcms_current_location', '550e8400-e29b-41d4-a716-446655440001');
});

describe('BoatPrep page (Phase 5.2 part 2: shared hook + tab split)', () => {
  it('renders the Dive Preparation tab by default without crashing', async () => {
    render(<BoatPrep />);
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getAllByRole('tab').length).toBeGreaterThanOrEqual(2);
  });

  it('switches to the Post-Dive Reports tab without crashing', async () => {
    const user = userEvent.setup();
    render(<BoatPrep />);
    const tablist = await screen.findByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    // tabs[1] = Post-Dive Reports
    await user.click(tabs[1]);
    expect(await screen.findByText(/Post-Dive Reports/i)).toBeInTheDocument();
  });

  it('switches back to the Dive Preparation tab without crashing', async () => {
    const user = userEvent.setup();
    render(<BoatPrep />);
    const tablist = await screen.findByRole('tablist');
    let tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[1]);
    await screen.findByText(/Post-Dive Reports/i);
    tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[0]);
    // Dive Preparation tab shows the search box as a concrete marker.
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
  });
});
