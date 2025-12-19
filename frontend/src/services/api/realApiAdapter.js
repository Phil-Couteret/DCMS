// Real API Adapter - Makes HTTP calls to backend
// This will be used when backend is ready

import { httpClient } from './httpClient';

// Real API Adapter - HTTP calls to backend
const realApiAdapter = {
  // Generic CRUD operations
  async getAll(resource) {
    const response = await httpClient.get(`/${resource}`);
    return response.data || response;
  },

  async getById(resource, id) {
    const response = await httpClient.get(`/${resource}/${id}`);
    return response.data || response;
  },

  async create(resource, data) {
    const response = await httpClient.post(`/${resource}`, data);
    return response.data || response;
  },

  async update(resource, id, data) {
    const response = await httpClient.put(`/${resource}/${id}`, data);
    return response.data || response;
  },

  async delete(resource, id) {
    const response = await httpClient.delete(`/${resource}/${id}`);
    return response.data || response;
  },

  // Booking operations
  async getBookingsByDate(date) {
    const response = await httpClient.get('/bookings', { date });
    return response.data || response;
  },

  async getTodaysBookings() {
    const today = new Date().toISOString().split('T')[0];
    return this.getBookingsByDate(today);
  },

  async getUpcomingBookings(days = 3) {
    const response = await httpClient.get('/bookings/upcoming', { days });
    return response.data || response;
  },

  async getCustomerBookings(customerId) {
    const response = await httpClient.get(`/customers/${customerId}/bookings`);
    return response.data || response;
  },

  // Customer operations
  async searchCustomers(query) {
    const response = await httpClient.get('/customers/search', { q: query });
    return response.data || response;
  },

  // Equipment operations
  async getAvailableEquipment(category) {
    const params = category ? { category } : {};
    const response = await httpClient.get('/equipment/available', params);
    return response.data || response;
  },

  // Pricing operations
  async calculatePrice(numberOfDives, addons = {}) {
    const response = await httpClient.post('/pricing/calculate', {
      numberOfDives,
      addons,
    });
    return response.data || response.price;
  },

  async getVolumeDiscountPrice(cumulativeDives) {
    const response = await httpClient.get('/pricing/volume-discount', {
      dives: cumulativeDives,
    });
    return response.data || response.price;
  },

  // Statistics
  async getStatistics() {
    const response = await httpClient.get('/statistics');
    return response.data || response;
  },
};

export default realApiAdapter;

