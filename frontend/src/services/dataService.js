// Data Service Layer - Backward compatibility wrapper
// Maintains synchronous interface for mock mode (current behavior)
// When switching to API mode, components will need to use async/await

import { isMockMode } from '../config/apiConfig';
import * as mockDataService from './api/mockDataService';
import apiService from './apiService';
import { initializeMockData } from '../data/mockData';

// Initialize mock data on first load (only needed for mock mode)
initializeMockData();

// Export functions - synchronous for mock mode, async for API mode
// Components currently expect synchronous behavior, so we maintain that for mock mode

export const getAll = (resource) => {
  if (isMockMode()) {
    // Synchronous call for mock mode (current behavior)
    return mockDataService.getAll(resource);
  } else {
    // For API mode, return Promise (components will need async/await)
    return apiService.getAll(resource);
  }
};

export const getById = (resource, id) => {
  if (isMockMode()) {
    return mockDataService.getById(resource, id);
  } else {
    return apiService.getById(resource, id);
  }
};

export const create = (resource, data) => {
  if (isMockMode()) {
    return mockDataService.create(resource, data);
  } else {
    return apiService.create(resource, data);
  }
};

export const update = (resource, id, data) => {
  if (isMockMode()) {
    return mockDataService.update(resource, id, data);
  } else {
    return apiService.update(resource, id, data);
  }
};

export const remove = (resource, id) => {
  if (isMockMode()) {
    return mockDataService.remove(resource, id);
  } else {
    return apiService.remove(resource, id);
  }
};

// Booking specific operations
export const getBookingsByDate = (date) => {
  if (isMockMode()) {
    return mockDataService.getBookingsByDate(date);
  } else {
    return apiService.getBookingsByDate(date);
  }
};

export const getTodaysBookings = () => {
  if (isMockMode()) {
    return mockDataService.getTodaysBookings();
  } else {
    return apiService.getTodaysBookings();
  }
};

export const getUpcomingBookings = (days = 3) => {
  if (isMockMode()) {
    return mockDataService.getUpcomingBookings(days);
  } else {
    return apiService.getUpcomingBookings(days);
  }
};

export const getCustomerBookings = (customerId) => {
  if (isMockMode()) {
    return mockDataService.getCustomerBookings(customerId);
  } else {
    return apiService.getCustomerBookings(customerId);
  }
};

// Customer specific operations
export const searchCustomers = (query) => {
  if (isMockMode()) {
    return mockDataService.searchCustomers(query);
  } else {
    return apiService.searchCustomers(query);
  }
};

// Equipment specific operations
export const getAvailableEquipment = (category) => {
  if (isMockMode()) {
    return mockDataService.getAvailableEquipment(category);
  } else {
    return apiService.getAvailableEquipment(category);
  }
};

// Pricing operations
export const calculatePrice = (numberOfDives, addons = {}) => {
  if (isMockMode()) {
    return mockDataService.calculatePrice(numberOfDives, addons);
  } else {
    return apiService.calculatePrice(numberOfDives, addons);
  }
};

export const getVolumeDiscountPrice = (cumulativeDives) => {
  if (isMockMode()) {
    return mockDataService.getVolumeDiscountPrice(cumulativeDives);
  } else {
    return apiService.getVolumeDiscountPrice(cumulativeDives);
  }
};

// Statistics
export const getStatistics = () => {
  if (isMockMode()) {
    return mockDataService.getStatistics();
  } else {
    return apiService.getStatistics();
  }
};

// Default export for backward compatibility
export default {
  create,
  getAll,
  getById,
  update,
  remove,
  getTodaysBookings,
  getUpcomingBookings,
  getCustomerBookings,
  searchCustomers,
  getAvailableEquipment,
  calculatePrice,
  getVolumeDiscountPrice,
  getStatistics
};
