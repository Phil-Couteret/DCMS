import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminLogin from './AdminLogin';
import { useAuth } from '../../utils/authContext';
import { httpClient } from '../../services/api/httpClient';
import realApiAdapter from '../../services/api/realApiAdapter';

// Covers the Phase 4.6 login flow: a plain single-tenant login, plus the
// "which center?" popup for accounts with 2+ tenants (memberships), which
// is the part of the login screen this project added most recently.
vi.mock('../../utils/authContext');
vi.mock('../../services/api/httpClient');
vi.mock('../../services/api/realApiAdapter');
vi.mock('../../config/apiConfig', () => ({
  API_CONFIG: { baseURL: 'http://api.test' },
}));

const mockLogin = vi.fn();

function jsonResponse(body, ok = true, status = ok ? 200 : 400) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ login: mockLogin });
  realApiAdapter.transformResponse.mockImplementation((_resource, data) => data);
  global.fetch = vi.fn();
});

async function fillAndSubmit(user, username = 'alice', password = 'hunter2') {
  // MUI's required-field asterisk is appended to the label's accessible
  // name ("Username *"), so an exact match on "Username" alone won't find
  // it - match the leading word instead.
  await user.type(screen.getByLabelText(/^Username/), username);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole('button', { name: /login/i }));
}

describe('AdminLogin', () => {
  it('disables the submit button until both fields are filled', () => {
    render(<AdminLogin />);
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
  });

  it('logs straight in when the account has a single tenant', async () => {
    const user = userEvent.setup();
    global.fetch.mockReturnValueOnce(
      jsonResponse({ access_token: 'jwt-1', user: { id: 'u1', username: 'alice', tenant_id: 't1' } }),
    );
    const onSuccess = vi.fn();
    render(<AdminLogin onSuccess={onSuccess} />);

    await fillAndSubmit(user);

    await waitFor(() => expect(httpClient.setAuthToken).toHaveBeenCalledWith('jwt-1'));
    expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }));
    expect(onSuccess).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/users/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows the "which center?" popup instead of logging in when the account has multiple tenants', async () => {
    const user = userEvent.setup();
    global.fetch.mockReturnValueOnce(
      jsonResponse({
        requiresTenantSelection: true,
        tenants: [
          { tenantId: 't1', name: 'Deep Blue', role: 'admin' },
          { tenantId: 't2', name: 'Coral Bay', role: 'guide' },
        ],
      }),
    );
    render(<AdminLogin />);

    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByText('Which center?')).toBeInTheDocument());
    expect(screen.getByText('Deep Blue')).toBeInTheDocument();
    expect(screen.getByText('Coral Bay')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('completes login via select-tenant once a center is chosen from the popup', async () => {
    const user = userEvent.setup();
    global.fetch
      .mockReturnValueOnce(
        jsonResponse({
          requiresTenantSelection: true,
          tenants: [{ tenantId: 't1', name: 'Deep Blue', role: 'admin' }],
        }),
      )
      .mockReturnValueOnce(
        jsonResponse({ access_token: 'jwt-2', user: { id: 'u1', username: 'alice', tenant_id: 't1' } }),
      );

    render(<AdminLogin />);
    await fillAndSubmit(user);
    await waitFor(() => screen.getByText('Deep Blue'));

    await user.click(screen.getByText('Deep Blue'));

    await waitFor(() => expect(httpClient.setAuthToken).toHaveBeenCalledWith('jwt-2'));
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://api.test/users/login/select-tenant',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'hunter2', tenantId: 't1' }),
      }),
    );
    expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }));
  });

  it('shows the server error message on invalid credentials', async () => {
    const user = userEvent.setup();
    global.fetch.mockReturnValueOnce(jsonResponse({ message: 'Invalid username or password' }, false, 401));
    render(<AdminLogin />);

    await fillAndSubmit(user);

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows a network-specific message when the API is unreachable', async () => {
    const user = userEvent.setup();
    const networkError = new TypeError('Failed to fetch');
    global.fetch.mockRejectedValueOnce(networkError);
    render(<AdminLogin />);

    await fillAndSubmit(user);

    expect(await screen.findByText(/Cannot reach the API at http:\/\/api\.test/)).toBeInTheDocument();
  });
});
