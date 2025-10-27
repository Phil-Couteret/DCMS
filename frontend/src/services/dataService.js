// Data Service Layer - Simulates API calls using localStorage
// All data persists in browser localStorage

import { initializeMockData } from '../data/mockData';

// Initialize data on first load
initializeMockData();

// Generic CRUD operations
export const create = (resource, data) => {
  const items = getAll(resource);
  const newItem = { ...data, id: generateId() };
  items.push(newItem);
  saveAll(resource, items);
  return newItem;
};

export const getAll = (resource) => {
  const key = `dcms_${resource}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const getById = (resource, id) => {
  const items = getAll(resource);
  return items.find(item => item.id === id);
};

export const update = (resource, id, data) => {
  const items = getAll(resource);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...data };
    saveAll(resource, items);
    return items[index];
  }
  return null;
};

export const remove = (resource, id) => {
  const items = getAll(resource);
  const filtered = items.filter(item => item.id !== id);
  saveAll(resource, filtered);
  return true;
};

// Helper functions
const saveAll = (resource, data) => {
  const key = `dcms_${resource}`;
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Booking specific operations
export const getBookingsByDate = (date) => {
  const bookings = getAll('bookings');
  return bookings.filter(booking => booking.bookingDate === date);
};

export const getTodaysBookings = () => {
  const today = new Date().toISOString().split('T')[0];
  return getBookingsByDate(today);
};

export const getCustomerBookings = (customerId) => {
  const bookings = getAll('bookings');
  return bookings.filter(booking => booking.customerId === customerId);
};

// Customer specific operations
export const searchCustomers = (query) => {
  const customers = getAll('customers');
  const lowerQuery = query.toLowerCase();
  return customers.filter(customer => 
    customer.firstName.toLowerCase().includes(lowerQuery) ||
    customer.lastName.toLowerCase().includes(lowerQuery) ||
    customer.email?.toLowerCase().includes(lowerQuery) ||
    customer.phone?.includes(query)
  );
};

// Equipment specific operations
export const getAvailableEquipment = (category) => {
  const equipment = getAll('equipment');
  let filtered = equipment.filter(eq => eq.isAvailable);
  if (category) {
    filtered = filtered.filter(eq => eq.category === category);
  }
  return filtered;
};

// Pricing operations
export const calculatePrice = (numberOfDives, addons = {}) => {
  const config = getAll('pricingConfig')[0];
  const tier = config.tiers.find(t => t.dives >= numberOfDives) || config.tiers[config.tiers.length - 1];
  const basePrice = tier.price * numberOfDives;
  
  let addonPrice = 0;
  if (addons.nightDive) {
    addonPrice += config.addons.nightDive;
  }
  if (addons.personalInstructor) {
    addonPrice += config.addons.personalInstructor;
  }
  
  return basePrice + addonPrice;
};

export const getVolumeDiscountPrice = (cumulativeDives) => {
  const config = getAll('pricingConfig')[0];
  const tier = config.tiers.find(t => t.dives >= cumulativeDives) || config.tiers[config.tiers.length - 1];
  return tier.price;
};

// Statistics
export const getStatistics = () => {
  const bookings = getAll('bookings');
  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b => b.bookingDate === today);
  
  return {
    totalBookings: bookings.length,
    todaysBookings: todaysBookings.length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    todaysRevenue: todaysBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length
  };
};

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  getTodaysBookings,
  getCustomerBookings,
  searchCustomers,
  getAvailableEquipment,
  calculatePrice,
  getVolumeDiscountPrice,
  getStatistics
};

