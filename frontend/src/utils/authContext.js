// Authentication Context - Permission-based access control
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// User roles (kept for backward compatibility, but permissions are now primary)
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  BOAT_PILOT: 'boat_pilot',
  GUIDE: 'guide',
  TRAINER: 'trainer',
  INTERN: 'intern'
};

// Available permissions - granular access control
export const AVAILABLE_PERMISSIONS = {
  dashboard: 'Dashboard',
  bookings: 'Bookings',
  customers: 'Customers',
  stays: 'Current Customers',
  equipment: 'Equipment',
  boatPrep: 'Boat Preparation',
  settings: 'Settings'
};

// Get all permission keys
export const ALL_PERMISSIONS = Object.keys(AVAILABLE_PERMISSIONS);

// Check if user has permission to access a route
export const hasPermission = (user, route) => {
  if (!user) return false;
  
  // Superadmin has access to everything
  if (user.role === USER_ROLES.SUPERADMIN) {
    return true;
  }
  
  // Check if user has the permission in their permissions array
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(route);
  }
  
  // Fallback: if no permissions array, check role (for backward compatibility)
  // This should be removed once all users are migrated to permission-based
  return false;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load current user from localStorage
    const savedUser = localStorage.getItem('dcms_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
    setLoading(false);
  }, []);

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('dcms_current_user', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dcms_current_user');
  };

  const isAuthenticated = () => !!currentUser;
  
  const isSuperAdmin = () => currentUser?.role === USER_ROLES.SUPERADMIN;
  
  const isAdmin = () => currentUser?.role === USER_ROLES.ADMIN || isSuperAdmin();
  
  const isGuide = () => currentUser?.role === USER_ROLES.GUIDE;

  const canAccess = (route) => {
    if (!currentUser) return false;
    // Superadmin has access to everything
    if (isSuperAdmin()) {
      return true;
    }
    // Settings are only visible/accessible to global admins (no or empty locationAccess)
    if (route === 'settings') {
      const isGlobal = !currentUser.locationAccess || (Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length === 0);
      // Check if user has settings permission
      if (hasPermission(currentUser, 'settings')) {
        return isGlobal;
      }
      return false;
    }
    return hasPermission(currentUser, route);
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isGuide,
    canAccess,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Location-based access control functions
export const hasLocationAccess = (user, locationId) => {
  if (!user) return false;
  
  // Global access when locationAccess is undefined OR empty array
  if (!user.locationAccess || (Array.isArray(user.locationAccess) && user.locationAccess.length === 0)) {
    return true;
  }
  
  // Check if user has access to the specific location
  return user.locationAccess.includes(locationId);
};

export const getAccessibleLocations = (user) => {
  if (!user) return [];
  
  // If user has no locationAccess property OR an empty array, they have access to all locations
  if (!user.locationAccess || (Array.isArray(user.locationAccess) && user.locationAccess.length === 0)) {
    return ['all'];
  }
  
  return user.locationAccess;
};

export const isMultiLocationUser = (user) => {
  if (!user) return false;
  
  // If user has no locationAccess property OR an empty array, they are a global admin
  if (!user.locationAccess || (Array.isArray(user.locationAccess) && user.locationAccess.length === 0)) return true;
  
  // Check if user has access to multiple locations
  return user.locationAccess.length > 1;
};
