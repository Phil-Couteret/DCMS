import * as dataService from './dataService';
import { getCustomerStaySummary } from './stayService';

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const recalculateAllBookingPrices = async () => {
  const bookings = await dataService.getAll('bookings') || [];
  const customers = await dataService.getAll('customers') || [];

  if (!bookings.length) {
    return { updated: 0, total: 0 };
  }

  const bookingMap = new Map(bookings.map((booking) => [booking.id, { ...booking }]));
  let updated = 0;

  // For each customer, use the stay service (which already understands cumulative pricing)
  // to recompute the correct total for each booking in their stay.
  for (const customer of customers) {
    try {
      const staySummary = await getCustomerStaySummary(customer.id);
      // Only skip if there are no bookings at all
      if (!staySummary || !staySummary.breakdown || staySummary.breakdown.length === 0) {
        continue;
      }

      staySummary.breakdown.forEach((entry) => {
        const booking = bookingMap.get(entry.bookingId);
        if (!booking) return;

        const newTotal = roundCurrency(entry.totalForBooking);
        const previousTotal = roundCurrency(booking.totalPrice || booking.price || 0);

        if (newTotal >= 0 && Math.abs(newTotal - previousTotal) >= 0.01) {
          updated += 1;
          // Update price and totalPrice, but preserve other booking fields
          // (equipmentRental, diveInsurance, etc. are preserved in the booking object)
          booking.price = newTotal;
          booking.totalPrice = newTotal;
          booking.updatedAt = new Date().toISOString();
        }
      });
    } catch (error) {
      console.warn(`Error recalculating prices for customer ${customer.id}:`, error);
      // Continue with next customer
    }
  }

  const updatedBookings = Array.from(bookingMap.values());

  if (updated > 0) {
    // In API mode, update bookings via API
    for (const booking of updatedBookings) {
      try {
        await dataService.update('bookings', booking.id, {
          price: booking.price,
          totalPrice: booking.totalPrice,
          updatedAt: booking.updatedAt
        });
      } catch (error) {
        console.warn(`Error updating booking ${booking.id}:`, error);
      }
    }
    
    // Also update localStorage for backward compatibility
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dcms_bookings', JSON.stringify(updatedBookings));
    }
    
    window.dispatchEvent(new CustomEvent('dcms_bookings_synced', { detail: updatedBookings }));
    if (typeof window !== 'undefined' && window.syncService) {
      // Trigger a push so public site receives the updated totals
      window.syncService.syncAll?.();
    }
  }

  return { updated, total: bookings.length };
};

