import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Financial from './Financial';

// Phase 5.2 part 3 split the former ~2,370-line Financial.jsx into a shared
// useFinancialData() hook plus 4 presentational tabs + a dialogs component
// under components/Financial/ - the same "shared hook" pattern used for
// BoatPrep.jsx, since its tabs share state and even shift which numeric
// tab index means what depending on isBikeRental. This test mounts the
// real page, switches through the tabs, and proves each renders without
// throwing (which would surface any dropped prop or missing import as a
// crash instead of only showing up when a person happens to click that
// tab in the browser).
//
// Note: CRA's Jest config sets resetMocks: true, which clears any
// .mockResolvedValue()/.mockReturnValue() set inside a jest.mock() factory
// before each test runs - the factory only establishes that the export IS
// a jest.fn(). Return values must be (re)configured in beforeEach, which
// is why every mocked method below is set there rather than in the
// jest.mock() calls themselves.
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

jest.mock('../services/financialService', () => ({
  __esModule: true,
  default: {
    getAllExpenses: jest.fn(),
    getAllManualIncome: jest.fn(),
    addExpense: jest.fn(),
    addManualIncome: jest.fn(),
    deleteExpense: jest.fn(),
    deleteManualIncome: jest.fn(),
    getDailyFinancialSummary: jest.fn(),
  },
}));

jest.mock('../utils/authContext', () => ({
  ...jest.requireActual('../utils/authContext'),
  useAuth: jest.fn(),
}));

import { useAuth } from '../utils/authContext';
import dataService from '../services/dataService';
import financialService from '../services/financialService';

beforeEach(() => {
  window.localStorage.clear();
  useAuth.mockReturnValue({ currentUser: { role: 'admin' } });
  dataService.getAll.mockResolvedValue([]);
  financialService.getAllExpenses.mockReturnValue([]);
  financialService.getAllManualIncome.mockReturnValue([]);
  financialService.getDailyFinancialSummary.mockResolvedValue({
    date: '2026-08-10',
    bookingIncome: { diving: 0, discovery: 0, snorkeling: 0, total: 0, details: [] },
    manualIncome: { entries: [], total: 0 },
    // Include one expense entry so the CurrentFinancialTab exercises the
    // getExpenseCategories() lookup this refactor caught (the original
    // code referenced an undeclared `expenseCategories` variable here).
    expenses: { entries: [{ id: 'exp-1', description: 'Fuel', category: 'gasoline', amount: 20, notes: '' }], total: 20 },
    totalIncome: 0,
    netProfit: -20,
  });
});

describe('Financial page (Phase 5.2 part 3: shared hook + tab split)', () => {
  it('renders the Current Financial tab by default without crashing', async () => {
    render(<Financial />);
    expect(await screen.findByRole('tablist')).toBeInTheDocument();
    // Proves the expense entry rendered via getExpenseCategories() rather
    // than crashing on the old undeclared `expenseCategories` reference.
    // This tab's mount fires two independent effects (customers/locations/
    // settings load, plus the tab-index effect loading the financial
    // summary). Checking document.body.textContent rather than a
    // getByText query sidesteps any "text split across elements" query
    // fragility and just proves the expense row rendered.
    await waitFor(
      () => {
        expect(document.body.textContent).toContain('Fuel');
      },
      { timeout: 8000 }
    );
  });

  it('switches to the Historical Bills tab without crashing', async () => {
    const user = userEvent.setup();
    render(<Financial />);
    const tablist = await screen.findByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    // Diving location (isBikeRental=false since no location selected):
    // 0=Current Financial, 1=Closed Days, 2=Historical Bills, 3=IGIC.
    await user.click(tabs[2]);
    expect(await screen.findByText(/Historical Bills/i)).toBeInTheDocument();
  });

  it('switches to the Quarterly Tax Declaration tab without crashing', async () => {
    const user = userEvent.setup();
    render(<Financial />);
    const tablist = await screen.findByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[3]);
    // Scope to headings: the tab button's own (untranslated-in-test) label
    // key "financial.quarterlyTaxDeclaration" also matches /Quarterly/i.
    expect(await screen.findByRole('heading', { name: /Quarterly/i })).toBeInTheDocument();
  });

  it('switches to the Previous Closed Days tab without crashing', async () => {
    const user = userEvent.setup();
    render(<Financial />);
    const tablist = await screen.findByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    await user.click(tabs[1]);
    expect(await screen.findByText(/Previous Closed Days/i)).toBeInTheDocument();
  });
});
