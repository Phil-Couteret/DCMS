import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../../utils/authContext';
import { isMockMode } from '../../config/apiConfig';

// ProtectedRoute is the single gate every authenticated page in the app
// renders behind, so these tests exercise its branching directly rather
// than through AdminLogin/UserSelector's own (separately tested) internals.
vi.mock('../../utils/authContext');
vi.mock('../../config/apiConfig');
// Vitest's ESM-based mocking (unlike Jest's CJS interop) needs the factory
// to return the module's real export shape, not just the component itself.
vi.mock('./AdminLogin', () => ({ default: () => <div data-testid="admin-login">AdminLogin</div> }));
vi.mock('./UserSelector', () => ({ default: () => <div data-testid="user-selector">UserSelector</div> }));

const setAuth = (overrides = {}) => {
  useAuth.mockReturnValue({
    isAuthenticated: () => false,
    canAccess: () => true,
    loading: false,
    ...overrides,
  });
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    isMockMode.mockReturnValue(false); // matches the real app: API_CONFIG.mode is hardcoded to 'api'
  });

  it('shows a loading state and renders nothing else while auth is being resolved', () => {
    setAuth({ loading: true });
    render(<ProtectedRoute>Secret content</ProtectedRoute>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders the login form (API mode) when there is no authenticated user', () => {
    setAuth({ isAuthenticated: () => false });
    render(<ProtectedRoute>Secret content</ProtectedRoute>);
    expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders the user selector prompt in mock mode when there is no authenticated user', () => {
    isMockMode.mockReturnValue(true);
    setAuth({ isAuthenticated: () => false });
    render(<ProtectedRoute>Secret content</ProtectedRoute>);
    expect(screen.getByText('Please select a user to continue')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-login')).not.toBeInTheDocument();
  });

  it('still shows the login form when currentUser exists but no JWT is stored (API mode)', () => {
    // Regression guard: a stale/partial localStorage user object without a
    // real auth_token must not be treated as a valid session.
    setAuth({ isAuthenticated: () => true });
    render(<ProtectedRoute>Secret content</ProtectedRoute>);
    expect(screen.getByTestId('admin-login')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders children once authenticated with a stored JWT and no permission is required', () => {
    window.localStorage.setItem('auth_token', 'a.b.c');
    setAuth({ isAuthenticated: () => true });
    render(<ProtectedRoute>Secret content</ProtectedRoute>);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('blocks access with "Access Denied" when a required permission is missing', () => {
    window.localStorage.setItem('auth_token', 'a.b.c');
    setAuth({ isAuthenticated: () => true, canAccess: () => false });
    render(<ProtectedRoute requiredPermission="settings">Secret content</ProtectedRoute>);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders children when the required permission is present', () => {
    window.localStorage.setItem('auth_token', 'a.b.c');
    setAuth({ isAuthenticated: () => true, canAccess: () => true });
    render(<ProtectedRoute requiredPermission="settings">Secret content</ProtectedRoute>);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
