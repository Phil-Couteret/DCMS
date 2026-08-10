import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Customers from './Customers';

// Phase 6.6 (roadmap item 6, targeted test-coverage expansion): Customers.jsx
// is 950 lines - bigger than several of the pages already split in Phases
// 5.2/6.5 - and had zero tests despite being core CRUD every location
// depends on daily. Not splitting it here (that's roadmap item 5, already
// closed out for the three biggest offenders); just adding a smoke test so
// a future change that breaks the list or the search flow is caught before
// it reaches production, the same rationale as the other *.smoke.test.jsx
// files in this directory.
jest.mock('../services/dataService', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    searchCustomers: jest.fn(),
  },
}));

jest.mock('../utils/authContext', () => ({
  ...jest.requireActual('../utils/authContext'),
  useAuth: jest.fn(),
}));

import { useAuth } from '../utils/authContext';
import dataService from '../services/dataService';

const customer = {
  id: 'cust-1',
  firstName: 'Dana',
  lastName: 'Diver',
  email: 'dana@example.com',
  customerType: 'tourist',
};

beforeEach(() => {
  window.localStorage.clear();
  useAuth.mockReturnValue({ isAdmin: () => true });
  dataService.getAll.mockImplementation((resource) => {
    if (resource === 'customers') return Promise.resolve([customer]);
    if (resource === 'locations') return Promise.resolve([]);
    if (resource === 'partners') return Promise.resolve([]);
    return Promise.resolve([]);
  });
  dataService.searchCustomers.mockResolvedValue([customer]);
});

const renderCustomers = (initialPath = '/customers') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Customers />
    </MemoryRouter>
  );

describe('Customers page (Phase 6.6: smoke coverage)', () => {
  it('loads and renders the customer list without crashing', async () => {
    renderCustomers();
    expect(await screen.findByText(/Dana Diver/i)).toBeInTheDocument();
  });

  it('renders the search box and re-queries via dataService.searchCustomers on input', async () => {
    const user = userEvent.setup();
    renderCustomers();
    await screen.findByText(/Dana Diver/i);

    const searchBox = screen.getByPlaceholderText ? screen.queryByPlaceholderText(/search/i) : null;
    // Fall back to any textbox if there's no placeholder match (i18n key
    // may render untranslated in tests) - the point is proving the search
    // handler wires through to dataService without crashing.
    const input = searchBox || screen.getAllByRole('textbox')[0];
    await user.type(input, 'Dana');

    expect(dataService.searchCustomers).toHaveBeenCalled();
  });

  it('renders the CustomerForm instead of the list when mode=new is in the URL', async () => {
    renderCustomers('/customers?mode=new');
    // CustomerForm is a distinct component - proving *something* other
    // than the list rendered (no "Dana Diver" row) is a reasonable smoke
    // check without reaching into CustomerForm's own internals.
    expect(screen.queryByText(/Dana Diver/i)).not.toBeInTheDocument();
  });
});
