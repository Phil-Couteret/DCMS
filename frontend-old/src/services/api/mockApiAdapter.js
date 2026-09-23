// Mock API Adapter - Uses localStorage (direct operations)
// This is the fallback when backend is not available

import * as mockDataService from './mockDataService';

// Initialize mock data on import
// (dataService already handles this)

// Generic CRUD operations using localStorage
const mockApiAdapter = {
  // Generic CRUD
  async getAll(resource) {
    return mockDataService.getAll(resource);
  },

  async getById(resource, id) {
    return mockDataService.getById(resource, id);
  },

  async create(resource, data) {
    return mockDataService.create(resource, data);
  },

  async update(resource, id, data) {
    return mockDataService.update(resource, id, data);
  },

  async delete(resource, id) {
    return mockDataService.remove(resource, id);
  },

  // Booking operations
  async getBookingsByDate(date) {
    return mockDataService.getBookingsByDate(date);
  },

  async getTodaysBookings() {
    return mockDataService.getTodaysBookings();
  },

  async getUpcomingBookings(days = 3) {
    return mockDataService.getUpcomingBookings(days);
  },

  async getCustomerBookings(customerId) {
    return mockDataService.getCustomerBookings(customerId);
  },

  // Customer operations
  async searchCustomers(query) {
    return mockDataService.searchCustomers(query);
  },

  // Equipment operations
  async getAvailableEquipment(category) {
    return mockDataService.getAvailableEquipment(category);
  },

  // Pricing operations
  async calculatePrice(numberOfDives, addons = {}) {
    return mockDataService.calculatePrice(numberOfDives, addons);
  },

  async getVolumeDiscountPrice(cumulativeDives) {
    return mockDataService.getVolumeDiscountPrice(cumulativeDives);
  },

  // Statistics
  async getStatistics() {
    return mockDataService.getStatistics();
  },
};

export default mockApiAdapter;

