// Financial Service - Manages expenses and manual income entries

import dataService from './dataService';

const STORAGE_KEY_EXPENSES = 'dcms_financial_expenses';
const STORAGE_KEY_INCOME = 'dcms_financial_manual_income';

// Get all expenses
export const getAllExpenses = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
    const expenses = stored ? JSON.parse(stored) : [];
    return Array.isArray(expenses) ? expenses : [];
  } catch (error) {
    console.error('Error loading expenses:', error);
    return [];
  }
};

// Get all manual income entries
export const getAllManualIncome = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_INCOME);
    const income = stored ? JSON.parse(stored) : [];
    return Array.isArray(income) ? income : [];
  } catch (error) {
    console.error('Error loading manual income:', error);
    return [];
  }
};

// Get expenses for a specific date
export const getExpensesByDate = (date) => {
  const expenses = getAllExpenses();
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  return expenses.filter(exp => exp.date === dateStr);
};

// Get manual income for a specific date
export const getManualIncomeByDate = (date) => {
  const income = getAllManualIncome();
  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  return income.filter(inc => inc.date === dateStr);
};

// Add an expense
export const addExpense = (expenseData) => {
  try {
    const expenses = getAllExpenses();
    const newExpense = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...expenseData,
      createdAt: new Date().toISOString()
    };
    expenses.push(newExpense);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
    return newExpense;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

// Add manual income
export const addManualIncome = (incomeData) => {
  try {
    const income = getAllManualIncome();
    const newIncome = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...incomeData,
      createdAt: new Date().toISOString()
    };
    income.push(newIncome);
    localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(income));
    return newIncome;
  } catch (error) {
    console.error('Error adding manual income:', error);
    throw error;
  }
};

// Delete an expense
export const deleteExpense = (expenseId) => {
  try {
    const expenses = getAllExpenses();
    const filtered = expenses.filter(exp => exp.id !== expenseId);
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

// Delete a manual income entry
export const deleteManualIncome = (incomeId) => {
  try {
    const income = getAllManualIncome();
    const filtered = income.filter(inc => inc.id !== incomeId);
    localStorage.setItem(STORAGE_KEY_INCOME, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting manual income:', error);
    throw error;
  }
};

// Calculate daily income from bookings
export const getDailyIncomeFromBookings = async (date) => {
  try {
    const allBookings = await dataService.getAll('bookings');
    if (!Array.isArray(allBookings)) return { diving: 0, discovery: 0, snorkeling: 0, total: 0, details: [] };
    
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    const currentLocationId = localStorage.getItem('dcms_current_location');
    
    // Filter bookings for the selected date and location
    const dayBookings = allBookings.filter(booking => {
      const bookingDate = booking.bookingDate || booking.booking_date;
      const bookingDateStr = bookingDate instanceof Date 
        ? bookingDate.toISOString().split('T')[0] 
        : (bookingDate || '').toString().split('T')[0];
      const locationId = booking.locationId || booking.location_id;
      return bookingDateStr === dateStr && (!currentLocationId || locationId === currentLocationId);
    });
    
    let divingTotal = 0;
    let discoveryTotal = 0;
    let snorkelingTotal = 0;
    const details = [];
    
    dayBookings.forEach(booking => {
      const activityType = (booking.activityType || booking.activity_type || '').toLowerCase();
      const price = parseFloat(booking.price || booking.totalPrice || booking.total_price || 0);
      
      // Count dives for diving activities
      let numberOfDives = 0;
      if (activityType === 'diving') {
        const sessions = booking.diveSessions || booking.sessions || {};
        numberOfDives = (sessions.morning ? 1 : 0) + 
                       (sessions.afternoon ? 1 : 0) + 
                       (sessions.night ? 1 : 0) +
                       (sessions.tenFifteen || sessions['10:15'] ? 1 : 0);
        if (numberOfDives === 0) {
          numberOfDives = booking.numberOfDives || booking.number_of_dives || 1;
        }
      } else if (activityType === 'discover' || activityType === 'discovery' || activityType === 'try_dive' || activityType === 'try_scuba') {
        numberOfDives = 1;
      } else if (activityType === 'snorkeling' || activityType === 'snorkel') {
        numberOfDives = 1;
      }
      
      if (activityType === 'diving') {
        divingTotal += price;
      } else if (activityType === 'discover' || activityType === 'discovery' || activityType === 'try_dive' || activityType === 'try_scuba' || activityType === 'orientation') {
        discoveryTotal += price;
      } else if (activityType === 'snorkeling' || activityType === 'snorkel') {
        snorkelingTotal += price;
      }
      
      // Add to details
      if (price > 0) {
        const bookingDateForDetail = booking.bookingDate || booking.booking_date;
        details.push({
          id: booking.id,
          activityType: activityType,
          numberOfDives: numberOfDives,
          price: price,
          customerId: booking.customerId || booking.customer_id,
          bookingDate: bookingDateForDetail
        });
      }
    });
    
    const total = divingTotal + discoveryTotal + snorkelingTotal;
    
    return {
      diving: divingTotal,
      discovery: discoveryTotal,
      snorkeling: snorkelingTotal,
      total: total,
      details: details
    };
  } catch (error) {
    console.error('Error calculating daily income from bookings:', error);
    return { diving: 0, discovery: 0, snorkeling: 0, total: 0, details: [] };
  }
};

// Get complete daily financial summary
export const getDailyFinancialSummary = async (date) => {
  const bookingIncome = await getDailyIncomeFromBookings(date);
  const manualIncome = getManualIncomeByDate(date);
  const expenses = getExpensesByDate(date);
  
  const manualIncomeTotal = manualIncome.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
  const expensesTotal = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  
  const totalIncome = bookingIncome.total + manualIncomeTotal;
  const netProfit = totalIncome - expensesTotal;
  
  return {
    date: date instanceof Date ? date.toISOString().split('T')[0] : date,
    bookingIncome,
    manualIncome: {
      entries: manualIncome,
      total: manualIncomeTotal
    },
    expenses: {
      entries: expenses,
      total: expensesTotal
    },
    totalIncome,
    netProfit
  };
};

// Default export for backward compatibility
export default {
  getAllExpenses,
  getAllManualIncome,
  getExpensesByDate,
  getManualIncomeByDate,
  addExpense,
  addManualIncome,
  deleteExpense,
  deleteManualIncome,
  getDailyIncomeFromBookings,
  getDailyFinancialSummary
};
