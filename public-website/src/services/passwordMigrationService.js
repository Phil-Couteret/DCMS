// Password Migration Service
// Handles migration from plaintext to hashed passwords
// Forces password change for accounts with plaintext passwords
// Deletes accounts that don't change password within 1 week

import passwordHash from '../utils/passwordHash';
import bookingService from './bookingService';
import consentService from './consentService';

const PASSWORD_CHANGE_REQUIRED_DAYS = 7; // 1 week

// Helper to get all customers (from localStorage)
const getAllCustomers = () => {
  const customersStr = localStorage.getItem('dcms_customers') || '[]';
  return JSON.parse(customersStr);
};

/**
 * Check if password is plaintext (needs migration)
 */
export const isPlaintextPassword = (storedPassword) => {
  if (!storedPassword) return false;
  return !passwordHash.isPasswordHashed(storedPassword);
};

/**
 * Mark account as requiring password change
 * Adds passwordChangeRequiredAt timestamp to customer object
 */
export const markPasswordChangeRequired = (customerEmail) => {
  const customer = bookingService.getCustomerByEmail(customerEmail);
  if (!customer) return null;

  const now = new Date().toISOString();
  
  // Only mark if not already marked
  if (!customer.passwordChangeRequiredAt) {
    bookingService.updateCustomerProfile(customerEmail, {
      passwordChangeRequiredAt: now
    });
  }
  
  return customer;
};

/**
 * Check if password change is required (account has plaintext password)
 */
export const isPasswordChangeRequired = (customer) => {
  if (!customer || !customer.password) return false;
  
  // If password is hashed, no change needed
  if (passwordHash.isPasswordHashed(customer.password)) {
    return false;
  }
  
  return true;
};

/**
 * Check if account should be deleted (password change required but not done within deadline)
 */
export const shouldDeleteAccount = (customer) => {
  if (!isPasswordChangeRequired(customer)) {
    return false;
  }
  
  if (!customer.passwordChangeRequiredAt) {
    // Mark it now if not already marked
    markPasswordChangeRequired(customer.email);
    return false; // Give them time starting now
  }
  
  const requiredDate = new Date(customer.passwordChangeRequiredAt);
  const deadline = new Date(requiredDate);
  deadline.setDate(deadline.getDate() + PASSWORD_CHANGE_REQUIRED_DAYS);
  
  const now = new Date();
  return now > deadline;
};

/**
 * Delete accounts that exceeded password change deadline
 * Returns list of deleted account emails
 */
export const cleanupExpiredAccounts = () => {
  const customers = getAllCustomers();
  const deletedEmails = [];
  
  customers.forEach(customer => {
    if (shouldDeleteAccount(customer)) {
      try {
        // Delete customer account
        bookingService.deleteCustomerAccount(customer.email);
        
        // Delete consent records
        consentService.deleteCustomerConsents(customer.id);
        
        deletedEmails.push(customer.email);
        console.log(`[Password Migration] Deleted account ${customer.email} - password change deadline exceeded`);
      } catch (error) {
        console.error(`[Password Migration] Error deleting account ${customer.email}:`, error);
      }
    }
  });
  
  return deletedEmails;
};

/**
 * Verify password (handles both plaintext legacy and hashed passwords)
 */
export const verifyPassword = async (inputPassword, storedPassword) => {
  if (!storedPassword) return false;
  
  // Check if password is hashed
  if (passwordHash.isPasswordHashed(storedPassword)) {
    // Verify hashed password
    const { hash, salt } = passwordHash.parseStoredPassword(storedPassword);
    return await passwordHash.verifyPassword(inputPassword, hash, salt);
  } else {
    // Legacy plaintext password - direct comparison
    return inputPassword === storedPassword;
  }
};

/**
 * Change password (hashes new password and clears passwordChangeRequiredAt)
 */
export const changePassword = async (customerEmail, newPassword) => {
  const customer = bookingService.getCustomerByEmail(customerEmail);
  if (!customer) {
    throw new Error('Customer not found');
  }
  
  // Hash the new password
  const hashedPassword = await passwordHash.storeHashedPassword(newPassword);
  
  // Update customer with hashed password and clear passwordChangeRequiredAt
  const updated = bookingService.updateCustomerProfile(customerEmail, {
    password: hashedPassword,
    passwordChangeRequiredAt: null // Clear the requirement
  });
  
  return updated;
};

/**
 * Get days remaining before account deletion
 * Returns null if password change not required, or number of days remaining
 */
export const getDaysUntilDeletion = (customer) => {
  if (!isPasswordChangeRequired(customer)) {
    return null;
  }
  
  if (!customer.passwordChangeRequiredAt) {
    return PASSWORD_CHANGE_REQUIRED_DAYS;
  }
  
  const requiredDate = new Date(customer.passwordChangeRequiredAt);
  const deadline = new Date(requiredDate);
  deadline.setDate(deadline.getDate() + PASSWORD_CHANGE_REQUIRED_DAYS);
  
  const now = new Date();
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

// Default export
const passwordMigrationService = {
  isPlaintextPassword,
  markPasswordChangeRequired,
  isPasswordChangeRequired,
  shouldDeleteAccount,
  cleanupExpiredAccounts,
  verifyPassword,
  changePassword,
  getDaysUntilDeletion
};

export default passwordMigrationService;

