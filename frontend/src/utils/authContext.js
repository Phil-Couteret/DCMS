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
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    'dashboard',
    'bookings',
    'customers',
    'equipment',
    'settings',
    'reports'
  ],
  [USER_ROLES.BOAT_PILOT]: [
    'dashboard',
    'bookings',
    'customers',
    'equipment'
    // No access to settings or reports
  ],
  [USER_ROLES.GUIDE]: [
    'dashboard',
    'bookings',
    'customers', // Read-only for equipment preparation, can edit equipment sizes
    'equipment'
    // No access to settings or reports
  ],
  [USER_ROLES.TRAINER]: [
    'dashboard',
    'bookings',
    'customers',
    'equipment'
    // Trainers manage courses and students
    // No access to settings or reports
  ],
  [USER_ROLES.INTERN]: [
    'dashboard',
    'bookings',
    'customers' // Read-only for equipment preparation, can edit equipment sizes
    // Interns have limited access - can view bookings and customers for prep
    // No access to settings, equipment management, or reports
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
  
  // If user has no locationAccess property, they have access to all locations (global admin)
  if (!user.locationAccess) return true;
  
  // Check if user has access to the specific location
  return user.locationAccess.includes(locationId);
};

export const getAccessibleLocations = (user) => {
  if (!user) return [];
  
  // If user has no locationAccess property, they have access to all locations
  if (!user.locationAccess) return ['all'];
  
  return user.locationAccess;
};

export const isMultiLocationUser = (user) => {
  if (!user) return false;
  
  // If user has no locationAccess property, they are a global admin
  if (!user.locationAccess) return true;
  
  // Check if user has access to multiple locations
  return user.locationAccess.length > 1;
};

