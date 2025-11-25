// Utility to create a superadmin account from an existing admin account
// This can be run in the browser console or called programmatically

import dataService from '../services/dataService';
import { USER_ROLES } from './authContext';

/**
 * Creates a superadmin account by duplicating an existing admin user
 * @param {string} sourceAdminId - ID of the admin user to duplicate (optional, uses first admin if not provided)
 * @param {object} overrides - Optional overrides for username, name, email
 * @returns {object} The created superadmin user
 */
export const createSuperadminFromAdmin = (sourceAdminId = null, overrides = {}) => {
  const users = dataService.getAll('users') || [];
  
  // Find the source admin user
  let sourceAdmin;
  if (sourceAdminId) {
    sourceAdmin = users.find(u => u.id === sourceAdminId && u.role === USER_ROLES.ADMIN);
  } else {
    // Use the first admin user found
    sourceAdmin = users.find(u => u.role === USER_ROLES.ADMIN);
  }
  
  if (!sourceAdmin) {
    throw new Error('No admin user found to duplicate. Please create an admin user first.');
  }
  
  // Check if superadmin already exists
  const existingSuperadmin = users.find(u => u.role === USER_ROLES.SUPERADMIN);
  if (existingSuperadmin) {
    console.warn('Superadmin already exists:', existingSuperadmin);
    return existingSuperadmin;
  }
  
  // Create superadmin based on admin
  const superadmin = {
    ...sourceAdmin,
    id: `superadmin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: overrides.username || `superadmin_${sourceAdmin.username}`,
    name: overrides.name || `Super ${sourceAdmin.name}`,
    email: overrides.email || `superadmin.${sourceAdmin.email}`,
    role: USER_ROLES.SUPERADMIN,
    password: overrides.password || sourceAdmin.password || 'superadmin123',
    createdAt: new Date().toISOString(),
    // Preserve locationAccess if it exists, otherwise global access
    locationAccess: sourceAdmin.locationAccess || []
  };
  
  // Remove the old id to ensure a new one is generated
  delete superadmin.id;
  
  // Create the superadmin user
  const created = dataService.create('users', superadmin);
  
  console.log('✅ Superadmin created successfully:', created);
  console.log('📧 Username:', created.username);
  console.log('🔑 Default password:', created.password || 'superadmin123');
  console.log('⚠️  Please change the password after first login!');
  
  return created;
};

/**
 * Run this in browser console to create superadmin:
 * 
 * import { createSuperadminFromAdmin } from './utils/createSuperadmin';
 * createSuperadminFromAdmin();
 * 
 * Or with custom values:
 * createSuperadminFromAdmin(null, {
 *   username: 'superadmin',
 *   name: 'Super Administrator',
 *   email: 'superadmin@example.com',
 *   password: 'your-secure-password'
 * });
 */

export default createSuperadminFromAdmin;

