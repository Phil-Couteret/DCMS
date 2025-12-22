// Stay Costs Service - Manages additional costs during customer stays
// Tracks purchases like insurance, equipment, clothes, goodies, etc.

import dataService from './dataService';

const STORAGE_KEY = 'dcms_stay_costs';

// Get all costs for a customer stay
export const getStayCosts = (customerId, stayStartDate) => {
  try {
    const allCosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return allCosts.filter(cost => 
      cost.customerId === customerId && 
      cost.stayStartDate === stayStartDate
    );
  } catch (error) {
    console.error('Error getting stay costs:', error);
    return [];
  }
};

// Add a cost to a stay
export const addStayCost = (customerId, stayStartDate, costData) => {
  try {
    const allCosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCost = {
      id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      stayStartDate,
      date: costData.date || new Date().toISOString().split('T')[0],
      category: costData.category, // 'insurance', 'equipment', 'clothes', 'goodies', 'other'
      description: costData.description,
      amount: parseFloat(costData.amount) || 0,
      quantity: parseInt(costData.quantity) || 1,
      unitPrice: parseFloat(costData.unitPrice) || parseFloat(costData.amount) || 0,
      total: (parseFloat(costData.unitPrice) || parseFloat(costData.amount) || 0) * (parseInt(costData.quantity) || 1),
      notes: costData.notes || '',
      createdAt: new Date().toISOString()
    };
    
    allCosts.push(newCost);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allCosts));
    return newCost;
  } catch (error) {
    console.error('Error adding stay cost:', error);
    throw error;
  }
};

// Update a cost
export const updateStayCost = (costId, updates) => {
  try {
    const allCosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = allCosts.findIndex(cost => cost.id === costId);
    
    if (index === -1) {
      throw new Error('Cost not found');
    }
    
    const updatedCost = {
      ...allCosts[index],
      ...updates,
      total: (updates.unitPrice !== undefined ? updates.unitPrice : allCosts[index].unitPrice) * 
             (updates.quantity !== undefined ? updates.quantity : allCosts[index].quantity)
    };
    
    allCosts[index] = updatedCost;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allCosts));
    return updatedCost;
  } catch (error) {
    console.error('Error updating stay cost:', error);
    throw error;
  }
};

// Delete a cost
export const deleteStayCost = (costId) => {
  try {
    const allCosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = allCosts.filter(cost => cost.id !== costId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting stay cost:', error);
    throw error;
  }
};

// Get total costs for a stay
export const getStayCostsTotal = (customerId, stayStartDate) => {
  const costs = getStayCosts(customerId, stayStartDate);
  return costs.reduce((sum, cost) => sum + (cost.total || 0), 0);
};

// Get costs by category
export const getStayCostsByCategory = (customerId, stayStartDate) => {
  const costs = getStayCosts(customerId, stayStartDate);
  const grouped = {};
  
  costs.forEach(cost => {
    const category = cost.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(cost);
  });
  
  return grouped;
};

export default {
  getStayCosts,
  addStayCost,
  updateStayCost,
  deleteStayCost,
  getStayCostsTotal,
  getStayCostsByCategory
};

