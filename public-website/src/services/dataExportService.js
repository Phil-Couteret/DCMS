// Data Export Service for GDPR Right to Data Portability (Article 20)
// Allows customers to export all their personal data

import bookingService from './bookingService';
import consentService from './consentService';

/**
 * Export all customer data in a structured format (JSON)
 * @param {string} email - Customer email
 * @returns {Object} Complete customer data export
 */
export const exportCustomerData = (email) => {
  const customer = bookingService.getCustomerByEmail(email);
  
  if (!customer) {
    throw new Error('Customer not found');
  }

  // Get all bookings for this customer
  const allBookings = bookingService.getAllBookings();
  const customerBookings = allBookings.filter(b => 
    b.customerId === customer.id || b.email?.toLowerCase() === email.toLowerCase()
  );

  // Get consent history
  const consentHistory = consentService.getConsentHistory(customer.id);

  // Construct complete data export
  const exportData = {
    exportDate: new Date().toISOString(),
    customerId: customer.id,
    personalInformation: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      nationality: customer.nationality,
      gender: customer.gender,
      dateOfBirth: customer.dob,
      customerType: customer.customerType,
      centerSkillLevel: customer.centerSkillLevel,
      address: customer.address || {},
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    },
    bookings: customerBookings.map(booking => ({
      id: booking.id,
      date: booking.date || booking.bookingDate,
      locationId: booking.locationId,
      location: booking.location,
      activityType: booking.activityType,
      numberOfDives: booking.numberOfDives,
      status: booking.status,
      price: booking.price,
      totalPrice: booking.totalPrice,
      discount: booking.discount,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      specialRequirements: booking.specialRequirements,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    })),
    certifications: (customer.certifications || []).map(cert => ({
      id: cert.id,
      agency: cert.agency,
      level: cert.level,
      certificationNumber: cert.certificationNumber,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      verified: cert.verified
    })),
    medicalInformation: {
      medicalConditions: customer.medicalConditions || [],
      medicalCertificate: customer.medicalCertificate || {},
      divingInsurance: customer.divingInsurance || {}
    },
    preferences: customer.preferences || {},
    uploadedDocuments: customer.uploadedDocuments || [],
    consentRecords: consentHistory.map(consent => ({
      consentType: consent.consentType,
      consentGiven: consent.consentGiven,
      consentDate: consent.consentDate,
      consentMethod: consent.consentMethod,
      withdrawalDate: consent.withdrawalDate,
      isActive: consent.isActive
    })),
    metadata: {
      totalBookings: customerBookings.length,
      totalConsents: consentHistory.length,
      activeConsents: consentHistory.filter(c => c.isActive && c.consentGiven).length,
      accountCreated: customer.createdAt,
      lastUpdated: customer.updatedAt
    }
  };

  return exportData;
};

/**
 * Download customer data as JSON file
 * @param {string} email - Customer email
 */
export const downloadCustomerDataAsJSON = (email) => {
  try {
    const data = exportCustomerData(email);
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dcms-data-export-${email}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, filename: link.download };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

/**
 * Download customer data as CSV (simplified version)
 * @param {string} email - Customer email
 */
export const downloadCustomerDataAsCSV = (email) => {
  try {
    const data = exportCustomerData(email);
    
    // Create CSV content
    let csv = 'DCMS Data Export\n';
    csv += `Export Date,${data.exportDate}\n`;
    csv += `Customer ID,${data.customerId}\n\n`;
    
    // Personal Information
    csv += 'Personal Information\n';
    csv += 'Field,Value\n';
    csv += `First Name,${data.personalInformation.firstName}\n`;
    csv += `Last Name,${data.personalInformation.lastName}\n`;
    csv += `Email,${data.personalInformation.email}\n`;
    csv += `Phone,${data.personalInformation.phone || ''}\n`;
    csv += `Nationality,${data.personalInformation.nationality || ''}\n`;
    csv += `Gender,${data.personalInformation.gender || ''}\n`;
    csv += `Customer Type,${data.personalInformation.customerType || ''}\n\n`;
    
    // Bookings
    csv += 'Bookings\n';
    csv += 'Date,Location,Activity,Status,Total Price\n';
    data.bookings.forEach(booking => {
      csv += `${booking.date || ''},${booking.location || ''},${booking.activityType || ''},${booking.status || ''},${booking.totalPrice || 0}\n`;
    });
    
    // Certifications
    csv += '\nCertifications\n';
    csv += 'Agency,Level,Certification Number,Issue Date\n';
    data.certifications.forEach(cert => {
      csv += `${cert.agency || ''},${cert.level || ''},${cert.certificationNumber || ''},${cert.issueDate || ''}\n`;
    });
    
    // Consents
    csv += '\nConsent Records\n';
    csv += 'Type,Given,Date,Method,Withdrawn\n';
    data.consentRecords.forEach(consent => {
      csv += `${consent.consentType || ''},${consent.consentGiven ? 'Yes' : 'No'},${consent.consentDate || ''},${consent.consentMethod || ''},${consent.withdrawalDate || 'No'}\n`;
    });
    
    const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dcms-data-export-${email}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, filename: link.download };
  } catch (error) {
    console.error('Error exporting data as CSV:', error);
    throw error;
  }
};

// Default export
const dataExportService = {
  exportCustomerData,
  downloadCustomerDataAsJSON,
  downloadCustomerDataAsCSV
};

export default dataExportService;

