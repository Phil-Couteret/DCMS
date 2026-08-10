import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Bill from './Bill';

// Phase 6.5c (roadmap item 5, "split Equipment.jsx/Schedule.jsx/Bill.jsx")
// split the former ~1,196-line Bill.jsx into a shared useBillData() hook
// plus a small header actions bar (BillActions) and the printable
// document itself (BillDocument) under components/Bill/. Unlike the other
// three splits, Bill has no tabs/views to switch between - it's a single
// invoice - so this test just mounts the page (with a stay passed via
// router location state, like the real navigation from the Stays page)
// and proves the calculated bill renders without crashing.
//
// Note: CRA's Jest config sets resetMocks: true, so mock return values are
// (re)configured in beforeEach - see Financial.smoke.test.jsx for the
// gotcha this works around.
jest.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../services/stayService', () => ({
  __esModule: true,
  getCustomerStayBookings: jest.fn(),
  default: {
    getCustomerStayBookings: jest.fn(),
  },
}));

jest.mock('../services/stayCostsService', () => ({
  __esModule: true,
  default: {
    getStayCosts: jest.fn(),
  },
}));

import dataService from '../services/dataService';
import stayService, { getCustomerStayBookings } from '../services/stayService';
import stayCostsService from '../services/stayCostsService';

const stay = {
  customer: {
    id: 'cust-1',
    firstName: 'Dana',
    lastName: 'Diver',
    email: 'dana@example.com',
  },
  stayStartDate: '2026-08-01',
  stayBookings: [{ id: 'booking-1', locationId: 'loc-1' }],
};

const booking = {
  id: 'booking-1',
  bookingDate: '2026-08-01',
  activityType: 'diving',
  numberOfDives: 1,
  locationId: 'loc-1',
  totalPrice: 50,
};

beforeEach(() => {
  window.localStorage.clear();
  dataService.getAll.mockImplementation((resource) => {
    if (resource === 'settings') {
      return Promise.resolve([{ organisation: { name: 'Test Dive Center' }, prices: { tax: { igic_rate: 0.07 } } }]);
    }
    if (resource === 'locations') {
      return Promise.resolve([{ id: 'loc-1', pricing: {} }]);
    }
    return Promise.resolve([]);
  });
  stayService.getCustomerStayBookings.mockResolvedValue([booking]);
  getCustomerStayBookings.mockResolvedValue([booking]);
  stayCostsService.getStayCosts.mockReturnValue([]);
});

describe('Bill page (Phase 6.5c: shared hook + document split)', () => {
  it('renders the calculated invoice without crashing', async () => {
    // Explicit 10s test timeout (3rd arg below): several effects chain
    // sequentially here (init bill data, then calculate, then partner
    // invoices - each a real Promise tick), which the waitFor's own 8s
    // budget can exceed Jest's 5s per-test default before it settles.
    render(
      <MemoryRouter initialEntries={[{ pathname: '/bill', state: { stay } }]}>
        <Bill />
      </MemoryRouter>
    );

    // Loading guard shows first ("Loading bill..."), then the real
    // invoice once useBillData finishes calculating.
    await waitFor(
      () => {
        expect(document.body.textContent).toMatch(/Invoice BILL-/i);
      },
      { timeout: 8000 }
    );
    expect(screen.getByText('Test Dive Center')).toBeInTheDocument();
  }, 10000);
});
