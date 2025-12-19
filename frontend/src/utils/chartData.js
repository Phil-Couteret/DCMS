// Chart Data Utilities
// Process raw data into chart-friendly formats

import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

/**
 * Get revenue data for the last N days
 */
export const getRevenueData = (bookings, days = 7) => {
  const today = new Date();
  const startDate = subDays(today, days - 1);
  const dates = eachDayOfInterval({ start: startDate, end: today });

  return dates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.bookingDate === dateStr);
    const revenue = dayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    return {
      date: format(date, 'MMM dd'),
      fullDate: dateStr,
      revenue: revenue,
      bookings: dayBookings.length
    };
  });
};

/**
 * Get booking trends data (daily bookings count)
 */
export const getBookingTrends = (bookings, days = 14) => {
  const today = new Date();
  const startDate = subDays(today, days - 1);
  const dates = eachDayOfInterval({ start: startDate, end: today });

  return dates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.bookingDate === dateStr);
    
    return {
      date: format(date, 'MMM dd'),
      fullDate: dateStr,
      count: dayBookings.length,
      confirmed: dayBookings.filter(b => b.status === 'confirmed').length,
      pending: dayBookings.filter(b => b.status === 'pending').length,
      completed: dayBookings.filter(b => b.status === 'completed').length
    };
  });
};

/**
 * Get revenue by activity type
 */
export const getRevenueByActivity = (bookings) => {
  const activityMap = {};
  
  bookings.forEach(booking => {
    const activity = booking.activityType || 'other';
    if (!activityMap[activity]) {
      activityMap[activity] = 0;
    }
    activityMap[activity] += booking.totalPrice || 0;
  });

  return Object.entries(activityMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  }));
};

/**
 * Get booking status distribution
 */
export const getStatusDistribution = (bookings) => {
  const statusMap = {};
  
  bookings.forEach(booking => {
    const status = booking.status || 'unknown';
    statusMap[status] = (statusMap[status] || 0) + 1;
  });

  return Object.entries(statusMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  }));
};

/**
 * Get weekly revenue summary
 */
export const getWeeklyRevenue = (bookings) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const dates = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return dates.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.bookingDate === dateStr);
    const revenue = dayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    return {
      day: format(date, 'EEE'),
      fullDay: format(date, 'EEEE'),
      date: dateStr,
      revenue: revenue,
      bookings: dayBookings.length
    };
  });
};

/**
 * Get monthly revenue summary
 */
export const getMonthlyRevenue = (bookings) => {
  const monthMap = {};
  
  bookings.forEach(booking => {
    if (booking.bookingDate) {
      const month = booking.bookingDate.substring(0, 7); // YYYY-MM
      if (!monthMap[month]) {
        monthMap[month] = { revenue: 0, bookings: 0 };
      }
      monthMap[month].revenue += booking.totalPrice || 0;
      monthMap[month].bookings += 1;
    }
  });

  return Object.entries(monthMap)
    .map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'MMM yyyy'),
      fullMonth: month,
      ...data
    }))
    .sort((a, b) => a.fullMonth.localeCompare(b.fullMonth))
    .slice(-6); // Last 6 months
};

/**
 * Get top customers by revenue
 */
export const getTopCustomers = (bookings, customers, limit = 5) => {
  const customerRevenue = {};
  
  bookings.forEach(booking => {
    const customerId = booking.customerId;
    if (!customerRevenue[customerId]) {
      customerRevenue[customerId] = { revenue: 0, bookings: 0 };
    }
    customerRevenue[customerId].revenue += booking.totalPrice || 0;
    customerRevenue[customerId].bookings += 1;
  });

  return Object.entries(customerRevenue)
    .map(([customerId, data]) => {
      const customer = customers.find(c => c.id === customerId);
      return {
        id: customerId,
        name: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
        revenue: data.revenue,
        bookings: data.bookings
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

