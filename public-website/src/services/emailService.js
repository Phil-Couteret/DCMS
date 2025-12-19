// Email Service for Booking Confirmations
// This is a placeholder for future email integration
// Currently prepares email data but doesn't send (backend integration needed)

/**
 * Prepare booking confirmation email data
 * @param {Object} booking - The booking object
 * @param {Object} customer - The customer object
 * @returns {Object} Email data ready to be sent
 */
export const prepareBookingConfirmationEmail = (booking, customer) => {
  const activityNames = {
    diving: 'Scuba Diving',
    snorkeling: 'Snorkeling',
    discover: 'Discover Scuba',
    orientation: 'Orientation Dive'
  };

  const locationNames = {
    caleta: 'Caleta de Fuste',
    playitas: 'Las Playitas'
  };

  const emailData = {
    to: customer.email,
    subject: `Booking Confirmation - ${activityNames[booking.activityType]} on ${booking.bookingDate}`,
    template: 'booking_confirmation',
    data: {
      customerName: `${customer.firstName} ${customer.lastName}`,
      bookingId: booking.id,
      transactionId: booking.paymentTransactionId,
      activityType: activityNames[booking.activityType],
      location: locationNames[booking.locationId] || booking.locationId,
      date: booking.bookingDate,
      time: booking.time,
      numberOfDives: booking.numberOfDives || 1,
      totalPrice: booking.totalPrice,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      notes: booking.notes || '',
      createdAt: booking.createdAt
    }
  };

  // Log email data (in production, this would be sent via API)
  console.log('Email prepared:', emailData);
  
  // TODO: Integrate with email service API
  // Example:
  // await fetch('/api/send-email', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(emailData)
  // });

  return emailData;
};

/**
 * Send booking confirmation email
 * Currently just prepares the email - actual sending requires backend integration
 */
export const sendBookingConfirmationEmail = async (booking, customer) => {
  const emailData = prepareBookingConfirmationEmail(booking, customer);
  
  // In a real implementation, this would call the backend API
  // For now, we just prepare the data and log it
  console.log('Would send email:', emailData);
  
  // Return success (in real implementation, this would be the API response)
  return {
    success: true,
    message: 'Email prepared (backend integration pending)',
    emailData
  };
};

export default {
  prepareBookingConfirmationEmail,
  sendBookingConfirmationEmail
};

