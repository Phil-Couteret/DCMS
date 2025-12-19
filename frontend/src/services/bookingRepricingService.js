import * as dataService from './dataService';
import { getCustomerStaySummary } from './stayService';

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const recalculateAllBookingPrices = () => {
  const bookings = dataService.getAll('bookings') || [];
  const customers = dataService.getAll('customers') || [];

  if (!bookings.length) {
    return { updated: 0, total: 0 };
  }

  const bookingMap = new Map(bookings.map((booking) => [booking.id, { ...booking }]));
  let updated = 0;

  // For each customer, use the stay service (which already understands cumulative pricing)
  // to recompute the correct total for each booking in their stay.
  customers.forEach((customer) => {
    const staySummary = getCustomerStaySummary(customer.id);
    // Only skip if there are no bookings at all
    if (!staySummary || !staySummary.breakdown || staySummary.breakdown.length === 0) {
      return;
    }

    staySummary.breakdown.forEach((entry) => {
      const booking = bookingMap.get(entry.bookingId);
      if (!booking) return;

      const newTotal = roundCurrency(entry.totalForBooking);
      const previousTotal = roundCurrency(booking.totalPrice || booking.price || 0);

      if (newTotal >= 0 && Math.abs(newTotal - previousTotal) >= 0.01) {
        updated += 1;
        booking.price = newTotal;
        booking.totalPrice = newTotal;
        booking.updatedAt = new Date().toISOString();
      }
    });
  });

  const updatedBookings = Array.from(bookingMap.values());

  if (updated > 0) {
    localStorage.setItem('dcms_bookings', JSON.stringify(updatedBookings));
    window.dispatchEvent(new CustomEvent('dcms_bookings_synced', { detail: updatedBookings }));
    if (typeof window !== 'undefined' && window.syncService) {
      // Trigger a push so public site receives the updated totals
      window.syncService.syncAll?.();
    }
  }

  return { updated, total: bookings.length };
};

