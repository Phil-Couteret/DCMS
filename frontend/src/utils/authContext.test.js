import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  AuthProvider,
  useAuth,
  USER_ROLES,
  hasPermission,
  hasLocationAccess,
  getAccessibleLocations,
  isMultiLocationUser,
} from './authContext';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

const adminUser = {
  id: 'u1',
  name: 'Alice Admin',
  role: USER_ROLES.ADMIN,
  permissions: ['dashboard', 'bookings', 'settings'],
  locationAccess: [],
};

const staffUser = {
  id: 'u2',
  name: 'Bob Staff',
  role: USER_ROLES.GUIDE,
  permissions: ['dashboard', 'bookings'],
  locationAccess: ['loc-1'],
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('AuthProvider / useAuth', () => {
  it('starts with no user and clears loading once the initial localStorage check runs', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it('restores currentUser from localStorage on mount', async () => {
    window.localStorage.setItem('dcms_current_user', JSON.stringify(adminUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).toEqual(adminUser);
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it('does not crash and just skips restoring if localStorage holds invalid JSON', async () => {
    window.localStorage.setItem('dcms_current_user', '{not valid json');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).toBeNull();
  });

  it('login() sets currentUser and persists it to localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.login(adminUser);
    });

    expect(result.current.currentUser).toEqual(adminUser);
    expect(JSON.parse(window.localStorage.getItem('dcms_current_user'))).toEqual(adminUser);
  });

  it('login() also stores the tenant slug when the user has one (multi-tenant)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.login({ ...adminUser, tenantSlug: 'deepblue' });
    });

    expect(window.localStorage.getItem('dcms_tenant_slug')).toBe('deepblue');
  });

  it('login() does not touch the tenant slug key when the user has none', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.login(adminUser);
    });

    expect(window.localStorage.getItem('dcms_tenant_slug')).toBeNull();
  });

  it('logout() clears currentUser and all auth-related localStorage keys', async () => {
    window.localStorage.setItem('dcms_current_user', JSON.stringify(adminUser));
    window.localStorage.setItem('dcms_tenant_slug', 'deepblue');
    window.localStorage.setItem('auth_token', 'some.jwt.token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentUser).not.toBeNull();

    act(() => {
      result.current.logout();
    });

    expect(result.current.currentUser).toBeNull();
    expect(result.current.isAuthenticated()).toBe(false);
    expect(window.localStorage.getItem('dcms_current_user')).toBeNull();
    expect(window.localStorage.getItem('dcms_tenant_slug')).toBeNull();
    expect(window.localStorage.getItem('auth_token')).toBeNull();
  });

  it('isSuperAdmin()/isAdmin() reflect role, and superadmin counts as admin too', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.login({ ...adminUser, role: USER_ROLES.SUPERADMIN }));
    expect(result.current.isSuperAdmin()).toBe(true);
    expect(result.current.isAdmin()).toBe(true);

    act(() => result.current.login(staffUser));
    expect(result.current.isSuperAdmin()).toBe(false);
    expect(result.current.isAdmin()).toBe(false);
  });

  describe('canAccess()', () => {
    it('superadmin can access everything regardless of permissions array', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.login({ ...staffUser, role: USER_ROLES.SUPERADMIN, permissions: [] }));
      expect(result.current.canAccess('settings')).toBe(true);
      expect(result.current.canAccess('anything-not-in-permissions')).toBe(true);
    });

    it('non-settings routes: gated purely by the permissions array', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.login(staffUser));
      expect(result.current.canAccess('bookings')).toBe(true);
      expect(result.current.canAccess('settings')).toBe(false); // not in staffUser.permissions
    });

    it('settings route additionally requires global (no/empty locationAccess) even if permitted', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Has the 'settings' permission but is scoped to a specific location -> denied.
      act(() => result.current.login({ ...staffUser, permissions: ['settings'], locationAccess: ['loc-1'] }));
      expect(result.current.canAccess('settings')).toBe(false);

      // Same permission, but global (empty locationAccess) -> allowed.
      act(() => result.current.login({ ...adminUser, permissions: ['settings'], locationAccess: [] }));
      expect(result.current.canAccess('settings')).toBe(true);
    });

    it('returns false for every route when there is no current user', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.canAccess('dashboard')).toBe(false);
    });
  });

  it('useAuth() throws when used outside an AuthProvider', () => {
    // Swallow the expected React error-boundary console noise for this one case.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});

describe('pure permission/location helpers (no context needed)', () => {
  it('hasPermission: false for no user, true for superadmin regardless of permissions, else checks the array', () => {
    expect(hasPermission(null, 'dashboard')).toBe(false);
    expect(hasPermission({ role: USER_ROLES.SUPERADMIN, permissions: [] }, 'dashboard')).toBe(true);
    expect(hasPermission({ role: USER_ROLES.ADMIN, permissions: ['dashboard'] }, 'dashboard')).toBe(true);
    expect(hasPermission({ role: USER_ROLES.ADMIN, permissions: ['dashboard'] }, 'settings')).toBe(false);
    expect(hasPermission({ role: USER_ROLES.ADMIN }, 'dashboard')).toBe(false); // no permissions array at all
  });

  it('hasLocationAccess: no user -> false; empty/missing locationAccess -> global access to any location', () => {
    expect(hasLocationAccess(null, 'loc-1')).toBe(false);
    expect(hasLocationAccess({ locationAccess: [] }, 'loc-1')).toBe(true);
    expect(hasLocationAccess({}, 'loc-1')).toBe(true);
    expect(hasLocationAccess({ locationAccess: ['loc-1'] }, 'loc-1')).toBe(true);
    expect(hasLocationAccess({ locationAccess: ['loc-2'] }, 'loc-1')).toBe(false);
  });

  it('getAccessibleLocations: returns ["all"] for global users, else their explicit list', () => {
    expect(getAccessibleLocations(null)).toEqual([]);
    expect(getAccessibleLocations({ locationAccess: [] })).toEqual(['all']);
    expect(getAccessibleLocations({ locationAccess: ['loc-1', 'loc-2'] })).toEqual(['loc-1', 'loc-2']);
  });

  it('isMultiLocationUser: global users and users with 2+ locations count as multi-location', () => {
    expect(isMultiLocationUser(null)).toBe(false);
    expect(isMultiLocationUser({ locationAccess: [] })).toBe(true); // global
    expect(isMultiLocationUser({ locationAccess: ['loc-1'] })).toBe(false);
    expect(isMultiLocationUser({ locationAccess: ['loc-1', 'loc-2'] })).toBe(true);
  });
});
