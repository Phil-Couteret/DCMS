// Authentication Context - User roles and permissions
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  BOAT_PILOT: 'boat_pilot',
  GUIDE: 'guide',
  TRAINER: 'trainer',
  INTERN: 'intern'
};

// Role permissions - which pages each role can access
// Based on actual workflow:
// - ADMIN: Customer service team (bookings, customers, stays)
// - BOAT_PILOT/OWNER: Equipment management, boat operations, specialized training
// - GUIDE: Equipment allocation, dive preparation
// - TRAINER: Specialized training (similar to owners)
// - INTERN: Assist guides with equipment

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'dashboard',      // Customer service focused dashboard
    'bookings',       // Full access - create/edit/cancel
    'customers',      // Full access - customer service
    'stays',          // Customer stays management
    'settings'        // Limited - customer service settings
    // No equipment or boat prep - not their responsibility
  ],
  [USER_ROLES.BOAT_PILOT]: [
    'dashboard',      // Operational overview
    'bookings',       // View only - see what's coming
    'customers',      // View only - see who's diving
    'equipment',      // Full CRUD - equipment management
    'boatPrep',       // Full access - boat/dive preparation
    'settings'        // Equipment-related settings
    // No customer stays - admin responsibility
  ],
  [USER_ROLES.GUIDE]: [
    'dashboard',      // Daily operations
    'bookings',       // View only - see schedule
    'customers',      // View + edit equipment sizes
    'equipment',      // View + allocate (no CRUD)
    'boatPrep'        // Full access - dive preparation
    // No customer stays or settings
  ],
  [USER_ROLES.TRAINER]: [
    'dashboard',      // Operational overview (similar to owners)
    'bookings',       // View only
    'customers',      // View only
    'equipment',      // Full CRUD - equipment management
    'boatPrep',       // Full access - for specialized training dives
    'settings'        // Equipment-related settings
  ],
  [USER_ROLES.INTERN]: [
    'dashboard',      // Today's operations
    'bookings',       // View only - see schedule
    'customers',      // View + edit equipment sizes
    'equipment',      // View + allocate (no CRUD)
    'boatPrep'        // Assist mode - limited actions
    // No customer stays or settings
  ]
};

// Check if user has permission to access a route
export const hasPermission = (userRole, route) => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(route);
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
  
  const isAdmin = () => currentUser?.role === USER_ROLES.ADMIN;
  
  const isGuide = () => currentUser?.role === USER_ROLES.GUIDE;

  const canAccess = (route) => {
    if (!currentUser) return false;
    // Settings are only visible/accessible to global admins (no or empty locationAccess)
    if (route === 'settings') {
      const isGlobal = !currentUser.locationAccess || (Array.isArray(currentUser.locationAccess) && currentUser.locationAccess.length === 0);
      return currentUser.role === USER_ROLES.ADMIN && isGlobal;
    }
    return hasPermission(currentUser.role, route);
  };

  const value = {
    currentUser,
    login,
    logout,
    isAuthenticated,
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

