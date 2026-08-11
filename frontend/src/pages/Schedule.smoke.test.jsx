import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Schedule from './Schedule';

// Schedule (via useScheduleData) calls useNavigate(), which throws outside
// a Router context - wrap every render in MemoryRouter.
const renderSchedule = () => render(<Schedule />, { wrapper: MemoryRouter });

// Phase 6.5b (roadmap item 5, "split Equipment.jsx/Schedule.jsx/Bill.jsx")
// split the former ~1,588-line Schedule.jsx into a shared useScheduleData()
// hook, three view components (MonthView/DailyView/WeekView, switched via
// plain Buttons rather than MUI Tabs), and two detail-view subcomponents
// (DayDetailView/SlotDetailView) that were already separate top-level
// consts in the original file, just relocated to their own files.
//
// The extraction surfaced two real, pre-existing bugs where those two
// subcomponents referenced identifiers that were never actually in their
// scope (they're separate components, not nested closures, so nothing
// from the main Schedule component's local scope was ever visible to
// them): `navigate` in DayDetailView's Mole "Trip Details" button (live -
// this component is always invoked with slot.type: 'day', so this path
// runs every time the day-detail dialog opens), and `onRemoveBoatAssignment`
// in SlotDetailView's boat-slot assigned-customer Chip delete handler
// (also live - the boat call site passes this prop, but the component
// never declared it, so referencing it inside the component hit the
// undefined outer scope). Both fixed during extraction; see the comments
// in DayDetailView.jsx/SlotDetailView.jsx.
//
// Note: CRA's Jest config sets resetMocks: true, so mock return values are
// (re)configured in beforeEach - see Financial.smoke.test.jsx for the
// gotcha this works around.
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

import dataService from '../services/dataService';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('dcms_current_location', 'loc-1');
  dataService.getAll.mockImplementation((resource) => {
    if (resource === 'boats') {
      return Promise.resolve([{ id: 'boat-1', name: 'White', locationId: 'loc-1', isActive: true }]);
    }
    return Promise.resolve([]);
  });
});

describe('Schedule page (Phase 6.5b: shared hook + view split)', () => {
  it('renders the Month view by default without crashing', async () => {
    renderSchedule();
    expect(await screen.findByText(/Add New Dive Trip/i)).toBeInTheDocument();
    // Month view shows the day-of-week header row as a concrete marker.
    expect(await screen.findByText('Mon')).toBeInTheDocument();
  });

  it('switches to the Daily Summary view without crashing', async () => {
    const user = userEvent.setup();
    renderSchedule();
    await screen.findByText(/Add New Dive Trip/i);
    await user.click(screen.getByRole('button', { name: /Daily Summary/i }));
    expect(await screen.findByText(/Daily Summary for/i)).toBeInTheDocument();
  });

  it('switches to the Week view without crashing', async () => {
    const user = userEvent.setup();
    renderSchedule();
    await screen.findByText(/Add New Dive Trip/i);
    // Week view toggle button label comes from an untranslated i18n key in
    // tests ("schedule.week"); target it via the view-toggle button group
    // rather than by visible text.
    const buttons = screen.getAllByRole('button');
    const weekButton = buttons.find((b) => /schedule\.week/i.test(b.textContent));
    expect(weekButton).toBeTruthy();
    await user.click(weekButton);
    // Week view renders a "Mole" rectangle for every displayed day
    // regardless of bookings (boat rectangles only render when there are
    // dive bookings, which this test doesn't seed) - a concrete marker
    // that the 4-week grid rendered without crashing.
    expect(await screen.findAllByText(/Mole/i)).not.toHaveLength(0);
  });
});
