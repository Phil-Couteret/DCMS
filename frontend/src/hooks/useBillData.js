import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dataService from '../services/dataService';
import stayService, { getCustomerStayBookings } from '../services/stayService';
import stayCostsService from '../services/stayCostsService';
import { calculateActivityPrice, calculateDivePrice, getCustomerType } from '../services/pricingService';

/**
 * Phase 6.5c extraction (roadmap item 5, same shared-hook pattern as the
 * other three splits): all state/effects/handlers for the Bill page. This
 * page has no tabs or view modes - it's a single printable invoice - so
 * unlike BoatPrep/Financial/Equipment/Schedule there's only one JSX
 * consumer of this hook's return value (BillDocument), plus a small header
 * actions block, both in components/Bill/.
 */
export default function useBillData() {
  const navigate = useNavigate();
  const location = useLocation();
  const stay = location.state?.stay;

  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [billData, setBillData] = useState({
    dives: [],
    equipment: [],
    otherItems: []
  });
  const [otherItems, setOtherItems] = useState([{ name: '', price: 0 }]);
  const [calculatedBill, setCalculatedBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partnerInvoicesCreated, setPartnerInvoicesCreated] = useState(false);
  const [stayBilled, setStayBilled] = useState(false);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    if (stay) {
      // Check if stay is already billed
      const stayKey = `${stay.customer.id}|${stay.stayStartDate}`;
      const billedStays = JSON.parse(localStorage.getItem('dcms_billed_stays') || '[]');
      setStayBilled(billedStays.includes(stayKey));

      loadSettings().catch(err => console.error('[Bill] Error loading settings:', err));
      loadLocations().catch(err => console.error('[Bill] Error loading locations:', err));
      loadPartners().catch(err => console.error('[Bill] Error loading partners:', err));
      initializeBillData().catch(err => console.error('[Bill] Error initializing bill data:', err));
    } else {
      // No stay data - redirect back to stays
      navigate('/stays');
    }
  }, [stay, navigate]);

  const loadSettings = async () => {
    try {
      const settingsData = await dataService.getAll('settings');
      setSettings(Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : null);
    } catch (error) {
      console.warn('[Bill] Failed to load settings:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const locationsData = await dataService.getAll('locations');
      setLocations(Array.isArray(locationsData) ? locationsData : []);
    } catch (error) {
      console.warn('[Bill] Failed to load locations:', error);
      setLocations([]);
    }
  };

  const loadPartners = useCallback(async () => {
    try {
      const partnersData = await dataService.getAll('partners');
      setPartners(Array.isArray(partnersData) ? partnersData : []);
    } catch (error) {
      console.warn('[Bill] Failed to load partners:', error);
      setPartners([]);
    }
  }, []);

  const getPartnerName = (partnerId) => {
    if (!partnerId) return null;
    const partner = partners.find(p => p.id === partnerId);
    if (partner) {
      return partner.name || partner.companyName || partner.company_name || 'Partner';
    }
    return null;
  };

  const initializeBillData = async () => {
    if (!stay) return;

    // Get boat preparations to find dive sites (may not exist in API mode)
    let boatPreps = [];
    let diveSites = [];

    try {
      boatPreps = await dataService.getAll('boatPreps');
      if (!Array.isArray(boatPreps)) {
        boatPreps = [];
      }
    } catch (error) {
      boatPreps = [];
    }

    try {
      diveSites = await dataService.getAll('diveSites');
      if (!Array.isArray(diveSites)) {
        diveSites = [];
      }
    } catch (error) {
      console.warn('[Bill] Failed to load dive sites:', error);
      diveSites = [];
    }

    // Get stay bookings and format them as bill items
    const stayBookings = await stayService.getCustomerStayBookings(stay.customer.id, stay.stayStartDate);
    const dives = [];

    for (const booking of stayBookings) {
      // Get dive site name from boat prep or dive site list
      let diveSiteName = 'Dive Site TBD';
      const boatPrep = boatPreps.find(bp =>
        bp.date === booking.bookingDate &&
        bp.session === (booking.diveSessions?.morning ? 'morning' : booking.diveSessions?.afternoon ? 'afternoon' : 'night')
      );

      if (boatPrep?.diveSiteId) {
        const site = diveSites.find(ds => ds.id === boatPrep.diveSiteId);
        if (site) {
          diveSiteName = site.name;
        }
      }

      // Calculate price based on activity type
      const activityType = booking.activityType || booking.activity_type;
      const numberOfDives = booking.diveSessions ?
        (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
        (booking.numberOfDives || booking.number_of_dives || 1);

      // Get location and customer info for pricing
      const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) ||
                             booking.locationId || booking.location_id ||
                             localStorage.getItem('dcms_current_location');
      const customer = stay.customer;
      const customerType = getCustomerType(customer);

      // Check if booking is from a partner
      const isPartnerBooking = !!(booking.partnerId || booking.partner_id || booking.source === 'partner');

      // Calculate price based on activity type
      let calculatedPrice = 0;
      const normalizedActivityType = activityType === 'try_dive' || activityType === 'discovery' ? 'discover' : activityType;

      if (normalizedActivityType === 'diving') {
        // Use dive pricing (cumulative tiered pricing)
        calculatedPrice = calculateDivePrice(stayLocationId, customerType, numberOfDives);
      } else if (normalizedActivityType === 'discover' || normalizedActivityType === 'snorkeling' || normalizedActivityType === 'orientation') {
        // Use activity-specific pricing
        calculatedPrice = calculateActivityPrice(normalizedActivityType, numberOfDives, stayLocationId);
      } else {
        // Fallback to booking price if activity type unknown
        calculatedPrice = booking.totalPrice || booking.total_price || booking.price || 0;
      }

      // Create a line item for each dive/activity
      for (let i = 0; i < numberOfDives; i++) {
        const session = booking.diveSessions?.morning ? 'Morning' :
                       booking.diveSessions?.afternoon ? 'Afternoon' :
                       booking.diveSessions?.night ? 'Night' : 'Morning';

        dives.push({
          date: booking.bookingDate || booking.booking_date,
          diveSite: diveSiteName,
          session,
          activityType: normalizedActivityType,
          price: calculatedPrice / numberOfDives,
          total: calculatedPrice / numberOfDives,
          isPartnerBooking: isPartnerBooking,
          partnerId: booking.partnerId || booking.partner_id || null
        });
      }
    }

    setBillData({ dives, equipment: [], otherItems: [] });
    setLoading(false);
  };

  const calculateBill = useCallback(() => {
    if (!stay || !settings || !billData.dives.length) {
      return;
    }

    // Calculate dive totals (each dive is now a separate line)
    const diveTotal = (billData.dives || []).reduce((sum, dive) => {
      return sum + (dive.total || 0);
    }, 0);

    // Resolve location-specific pricing (using locations from state)
    const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) || localStorage.getItem('dcms_current_location');
    const location = Array.isArray(locations) ? locations.find(l => l.id === stayLocationId) : null;
    const pricing = (location?.pricing) || (settings.prices || {});

    // Calculate other items totals
    const otherTotal = (otherItems || []).reduce((sum, item) => sum + (item.price || 0), 0);

    // Get additional costs from stay costs service
    let additionalCostsTotal = 0;
    const stayAdditionalCosts = stayCostsService.getStayCosts(stay.customer.id, stay.stayStartDate);
    additionalCostsTotal = stayAdditionalCosts.reduce((sum, cost) => sum + (cost.total || 0), 0);

    // Calculate equipment rental from stay bookings
    let equipmentTotal = 0;
    if (stay.stayBookings && Array.isArray(stay.stayBookings)) {
      stay.stayBookings.forEach(booking => {
        if (booking.rentedEquipment) {
          Object.entries(booking.rentedEquipment).forEach(([equipment, isRented]) => {
            const eqKey = equipment.toLowerCase();
            if (isRented && settings.prices.equipment && settings.prices.equipment[eqKey] != null) {
              const equipmentPrice = settings.prices.equipment[eqKey];
              const bookingDives = booking.diveSessions ?
                (booking.diveSessions.morning ? 1 : 0) + (booking.diveSessions.afternoon ? 1 : 0) + (booking.diveSessions.night ? 1 : 0) :
                (booking.numberOfDives || 0);
              equipmentTotal += equipmentPrice * bookingDives;
            }
          });
        }
      });
    }

    // Calculate dive insurance
    let diveInsuranceTotal = 0;
    const customerInsurance = stay.customer?.divingInsurance;
    const hasYearlyInsurance = customerInsurance?.hasInsurance === true && customerInsurance?.expiryDate;
    let yearlyInsuranceValid = false;

    if (hasYearlyInsurance && customerInsurance.expiryDate) {
      try {
        const expiryDate = new Date(customerInsurance.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);

        if (!isNaN(expiryDate.getTime())) {
          yearlyInsuranceValid = expiryDate >= today;
        }
      } catch (e) {
        console.warn('[Bill] Error parsing insurance expiry date:', e);
        yearlyInsuranceValid = false;
      }
    }

    const hasInsuranceInStayCosts = stayAdditionalCosts.some(cost => cost.category === 'insurance');

    if (!yearlyInsuranceValid && !hasInsuranceInStayCosts && pricing.diveInsurance) {
      const stayStart = new Date(stay.stayStartDate);
      const today = new Date();
      const daysDifference = Math.ceil((today - stayStart) / (1000 * 60 * 60 * 24));

      if (daysDifference >= 365 && pricing.diveInsurance.one_year) {
        diveInsuranceTotal = pricing.diveInsurance.one_year || 45.00;
      } else if (daysDifference >= 30 && pricing.diveInsurance.one_month) {
        diveInsuranceTotal = pricing.diveInsurance.one_month || 25.00;
      } else if (daysDifference >= 7 && pricing.diveInsurance.one_week) {
        diveInsuranceTotal = pricing.diveInsurance.one_week || 18.00;
      } else {
        diveInsuranceTotal = pricing.diveInsurance.one_day || 7.00;
      }
    }

    // Separate partner-paid (activities/dives) from customer-paid (extras)
    let partnerPaidTotal = 0;
    let customerPaidTotal = 0;

    billData.dives.forEach(dive => {
      if (dive.isPartnerBooking) {
        partnerPaidTotal += dive.total || 0;
      } else {
        customerPaidTotal += dive.total || 0;
      }
    });

    // Customer pays for extras (equipment, insurance, additional costs, other items)
    customerPaidTotal += equipmentTotal + diveInsuranceTotal + additionalCostsTotal + otherTotal;

    const subtotal = diveTotal + otherTotal + equipmentTotal + diveInsuranceTotal + additionalCostsTotal;
    const tax = subtotal * ((pricing.tax && pricing.tax.igic_rate) || 0.07);
    const total = subtotal + tax;

    // Calculate tax split proportionally
    const partnerTax = partnerPaidTotal > 0 && subtotal > 0 ? (partnerPaidTotal / subtotal) * tax : 0;
    const customerTax = customerPaidTotal > 0 && subtotal > 0 ? (customerPaidTotal / subtotal) * tax : 0;

    const bill = {
      customer: stay.customer,
      stayStartDate: stay.stayStartDate,
      billDate: new Date().toISOString().split('T')[0],
      billNumber: `BILL-${Date.now()}`,
      dives: billData.dives,
      otherItems: (otherItems || []).filter(item => item.name && item.price > 0),
      equipmentTotal,
      additionalCosts: stayAdditionalCosts,
      additionalCostsTotal,
      subtotal,
      tax,
      total,
      partnerPaidTotal,
      customerPaidTotal,
      partnerTax,
      customerTax,
      breakdown: {
        dives: diveTotal,
        equipment: equipmentTotal,
        diveInsurance: diveInsuranceTotal,
        additionalCosts: additionalCostsTotal,
        other: otherTotal
      }
    };

    setCalculatedBill(bill);
  }, [stay, settings, locations, billData, otherItems]);

  useEffect(() => {
    if (settings && locations.length > 0 && billData.dives.length > 0 && stay) {
      calculateBill();
    }
  }, [settings, locations, billData, stay, calculateBill]);

  // Create partner invoices when bill is calculated
  useEffect(() => {
    const createPartnerInvoices = async () => {
      if (!calculatedBill || partnerInvoicesCreated || !stay) return;

      try {
        // Get all bookings for this stay
        const stayBookings = await getCustomerStayBookings(stay.customer.id, stay.stayStartDate);

        // Group bookings by partner
        // First check bookings for partnerId, then fall back to customer's partnerId
        const bookingsByPartner = {};
        const customerPartnerId = stay.customer.partnerId || stay.customer.partner_id || stay.customer.created_by_partner_id;

        stayBookings.forEach(booking => {
          // Check booking first, then customer
          const partnerId = booking.partnerId || booking.partner_id || customerPartnerId;
          if (partnerId) {
            if (!bookingsByPartner[partnerId]) {
              bookingsByPartner[partnerId] = [];
            }
            bookingsByPartner[partnerId].push(booking);
          }
        });

        // Create invoice for each partner
        const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) ||
                               localStorage.getItem('dcms_current_location');

        if (Object.keys(bookingsByPartner).length === 0) {
          console.warn('[Bill] useEffect: No partner bookings found. Customer partnerId:', customerPartnerId);
          console.warn('[Bill] useEffect: This might mean bookings don\'t have partnerId set, or customer doesn\'t have partnerId');
        }

        let invoicesCreated = 0;
        for (const [partnerId, bookings] of Object.entries(bookingsByPartner)) {
          try {
            // Calculate commission using backend service
            const bookingIds = bookings.map(b => b.id);

            // Get partner to check commission rate
            const partner = await dataService.getById('partners', partnerId);
            if (!partner || partner.isActive === false) {
              console.warn(`[Bill] useEffect: Partner ${partnerId} not found or inactive, skipping`);
              continue;
            }

            const commissionRate = partner.commissionRate || partner.commission_rate || 0;
            if (!commissionRate || commissionRate === 0) {
              console.warn(`[Bill] useEffect: Partner ${partnerId} has no commission rate, skipping`);
              continue;
            }

            // Calculate subtotal and commission from ALL bookings
            // Business model: Customer pays full price to partner, partner keeps commission,
            // partner pays diving center (booking price - commission) + tax
            const bookingTotal = bookings.reduce((sum, booking) => {
              return sum + (parseFloat(booking.totalPrice || booking.total_price || booking.price || 0));
            }, 0);

            if (bookingTotal === 0) {
              console.warn(`[Bill] useEffect: Partner ${partnerId} has no bookings with prices, skipping`);
              continue;
            }

            // Calculate commission (what partner keeps)
            const commissionAmount = bookingTotal * parseFloat(commissionRate);

            // Partner pays diving center: booking total minus commission
            const amountDueBeforeTax = bookingTotal - commissionAmount;

            // Tax is 7% IGIC on the amount the partner pays to diving center
            const tax = amountDueBeforeTax * 0.07;

            // Total invoice amount: amount due + tax
            const invoiceTotal = amountDueBeforeTax + tax;

            // Create invoice
            // Note: For partner invoices:
            // - subtotal: Amount partner owes before tax (booking total - commission)
            // - commissionAmount: Partner's commission (what they keep)
            // - tax: IGIC tax (7% on amount due)
            // - total: Total amount partner pays to diving center (subtotal + tax)
            const invoiceDate = new Date().toISOString().split('T')[0];
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

            await dataService.create('partnerInvoices', {
              partnerId,
              customerId: stay.customer.id,
              billId: calculatedBill.billNumber,
              locationId: stayLocationId,
              invoiceDate,
              dueDate: dueDate.toISOString().split('T')[0],
              paymentTermsDays: 30,
              subtotal: amountDueBeforeTax, // Amount partner owes before tax (booking total - commission)
              tax: tax, // Tax (7% IGIC on amount due)
              total: invoiceTotal, // Total amount partner pays to diving center
              bookingIds,
              notes: `Partner invoice for bill ${calculatedBill.billNumber} - ${bookings.length} booking(s). Customer paid: €${bookingTotal.toFixed(2)}, Partner commission (${(parseFloat(commissionRate) * 100).toFixed(1)}%): €${commissionAmount.toFixed(2)}, Amount due before tax: €${amountDueBeforeTax.toFixed(2)}, Tax (7% IGIC): €${tax.toFixed(2)}, Total due: €${invoiceTotal.toFixed(2)}`
            });

            invoicesCreated++;
          } catch (error) {
            console.error(`[Bill] useEffect: Error creating invoice for partner ${partnerId}:`, error);
            // Continue with other partners even if one fails, but don't set partnerInvoicesCreated to true
          }
        }

        if (invoicesCreated > 0) {
          setPartnerInvoicesCreated(true);
        } else if (Object.keys(bookingsByPartner).length === 0) {
          setPartnerInvoicesCreated(true); // No partner bookings – expected for non-partner customers
        } else {
          // Partner bookings exist but invoice creation failed - don't set to true so it can retry
          console.warn('[Bill] useEffect: Partner bookings found but no invoices were created. Will retry on close stay.');
        }
      } catch (error) {
        console.error('Error creating partner invoices:', error);
      }
    };

    createPartnerInvoices();
  }, [calculatedBill, stay, partnerInvoicesCreated]);

  const printBill = () => {
    window.print();
  };

  const downloadBill = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const billHtml = generateBillHTML();
    printWindow.document.write(billHtml);
    printWindow.document.close();
    printWindow.print();
  };

  const orgName = settings?.organisation?.name || 'Dive Center';

  const emailBill = () => {
    if (!calculatedBill || !stay.customer.email) {
      alert('Customer email address not available.');
      return;
    }

    const subject = encodeURIComponent(`Invoice ${calculatedBill.billNumber} - ${orgName}`);
    const body = encodeURIComponent(
      `Dear ${stay.customer.firstName} ${stay.customer.lastName},\n\n` +
      `Please find attached your invoice for your stay.\n\n` +
      `Invoice Number: ${calculatedBill.billNumber}\n` +
      `Stay Start Date: ${calculatedBill.stayStartDate}\n` +
      `Total Amount: €${calculatedBill.total.toFixed(2)}\n\n` +
      `Best regards,\n${orgName}`
    );

    // Create mailto link
    window.location.href = `mailto:${stay.customer.email}?subject=${subject}&body=${body}`;
  };

  const generateBillHTML = () => {
    if (!calculatedBill) return '';
    const org = settings?.organisation;
    const name = org?.name || 'Dive Center';
    const address = org?.address || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${calculatedBill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .bill-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${name}</h1>
          ${address ? `<p>${address}</p>` : ''}
          <h2>Invoice ${calculatedBill.billNumber}</h2>
        </div>
        <div class="bill-info">
          <p><strong>Customer:</strong> ${calculatedBill.customer.firstName} ${calculatedBill.customer.lastName}</p>
          <p><strong>Email:</strong> ${calculatedBill.customer.email || 'N/A'}</p>
          <p><strong>Bill Date:</strong> ${calculatedBill.billDate}</p>
          <p><strong>Stay Start:</strong> ${calculatedBill.stayStartDate}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${calculatedBill.dives.map(dive => `
              <tr>
                <td>${dive.diveSite} - ${dive.session}</td>
                <td>${dive.date}</td>
                <td>1</td>
                <td>€${dive.price.toFixed(2)}</td>
                <td>€${dive.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            ${calculatedBill.additionalCosts.map(cost => `
              <tr>
                <td>${cost.description || cost.category}</td>
                <td>${cost.date}</td>
                <td>${cost.quantity || 1}</td>
                <td>€${(cost.unitPrice || cost.total).toFixed(2)}</td>
                <td>€${cost.total.toFixed(2)}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="4" class="total">Subtotal:</td>
              <td>€${calculatedBill.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" class="total">IGIC (7%):</td>
              <td>€${calculatedBill.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" class="total">Total:</td>
              <td>€${calculatedBill.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  return {
    navigate,
    stay,
    settings,
    locations,
    billData,
    otherItems, setOtherItems,
    calculatedBill,
    loading,
    partnerInvoicesCreated, setPartnerInvoicesCreated,
    stayBilled, setStayBilled,
    partners,
    getPartnerName,
    printBill,
    downloadBill,
    emailBill,
    orgName,
  };
}
