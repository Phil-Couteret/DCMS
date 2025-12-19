// API Service Layer - Unified interface for mock and real API
// Switch between mock (localStorage) and real API via config

import { API_CONFIG, isMockMode } from '../config/apiConfig';
import mockApiAdapter from './api/mockApiAdapter';
import realApiAdapter from './api/realApiAdapter';

// Select adapter based on config
const adapter = isMockMode() ? mockApiAdapter : realApiAdapter;

// Unified API Service Interface
// This maintains the same interface as the old dataService
// so existing components don't need to change

const apiService = {
  // Generic CRUD operations
  getAll: async (resource) => {
    try {
      return await adapter.getAll(resource);
    } catch (error) {
      console.error(`Error getting ${resource}:`, error);
      throw error;
    }
  },

  getById: async (resource, id) => {
    try {
      return await adapter.getById(resource, id);
    } catch (error) {
      console.error(`Error getting ${resource} by id ${id}:`, error);
      throw error;
    }
  },

  create: async (resource, data) => {
    try {
      return await adapter.create(resource, data);
    } catch (error) {
      console.error(`Error creating ${resource}:`, error);
      throw error;
    }
  },

  update: async (resource, id, data) => {
    try {
      return await adapter.update(resource, id, data);
    } catch (error) {
      console.error(`Error updating ${resource} ${id}:`, error);
      throw error;
    }
  },

  remove: async (resource, id) => {
    try {
      return await adapter.delete(resource, id);
    } catch (error) {
      console.error(`Error deleting ${resource} ${id}:`, error);
      throw error;
    }
  },

  // Booking operations
  getBookingsByDate: async (date) => {
    try {
      return await adapter.getBookingsByDate(date);
    } catch (error) {
      console.error('Error getting bookings by date:', error);
      throw error;
    }
  },

  getTodaysBookings: async () => {
    try {
      return await adapter.getTodaysBookings();
    } catch (error) {
      console.error('Error getting today\'s bookings:', error);
      throw error;
    }
  },

  getUpcomingBookings: async (days = 3) => {
    try {
      return await adapter.getUpcomingBookings(days);
    } catch (error) {
      console.error('Error getting upcoming bookings:', error);
      throw error;
    }
  },

  getCustomerBookings: async (customerId) => {
    try {
      return await adapter.getCustomerBookings(customerId);
    } catch (error) {
      console.error('Error getting customer bookings:', error);
      throw error;
    }
  },

  // Customer operations
  searchCustomers: async (query) => {
    try {
      return await adapter.searchCustomers(query);
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  },

  // Equipment operations
  getAvailableEquipment: async (category) => {
    try {
      return await adapter.getAvailableEquipment(category);
    } catch (error) {
      console.error('Error getting available equipment:', error);
      throw error;
    }
  },

  // Pricing operations
  calculatePrice: async (numberOfDives, addons = {}) => {
    try {
      return await adapter.calculatePrice(numberOfDives, addons);
    } catch (error) {
      console.error('Error calculating price:', error);
      throw error;
    }
  },

  getVolumeDiscountPrice: async (cumulativeDives) => {
    try {
      return await adapter.getVolumeDiscountPrice(cumulativeDives);
    } catch (error) {
      console.error('Error getting volume discount price:', error);
      throw error;
    }
  },

  // Statistics
  getStatistics: async () => {
    try {
      return await adapter.getStatistics();
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  },

  // Utility: Get current mode
  getMode: () => API_CONFIG.mode,

  // Utility: Check if mock mode
  isMockMode: () => isMockMode(),
};

// Export default for backward compatibility
export default apiService;

// Also export individual functions for convenience
export const {
  getAll,
  getById,
  create,
  update,
  remove,
  getTodaysBookings,
  getUpcomingBookings,
  getCustomerBookings,
  searchCustomers,
  getAvailableEquipment,
  calculatePrice,
  getVolumeDiscountPrice,
  getStatistics,
} = apiService;

