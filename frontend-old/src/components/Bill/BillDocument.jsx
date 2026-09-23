import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Alert, Chip, Button } from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';
import dataService from '../../services/dataService';
import { getCustomerStayBookings } from '../../services/stayService';

/**
 * Phase 6.5c extraction: the printable bill/invoice document (company
 * header, customer info, itemized activities/extras, totals, and the
 * "Close Stay" action), split out of Bill.jsx. This is the one section
 * that keeps a large inline handler (the Close Stay button's onClick)
 * rather than a named function from the hook - it's 200+ lines of
 * sequential partner-invoice/booking-update calls, moved here verbatim
 * (not retyped) to avoid any risk of transcription error in
 * money-handling logic during this refactor.
 */
export default function BillDocument(props) {
  const {
    orgName,
    settings,
    calculatedBill,
    stay,
    otherItems,
    partners,
    getPartnerName,
    stayBilled, setStayBilled,
    partnerInvoicesCreated, setPartnerInvoicesCreated,
  } = props;

  return (
      <Paper sx={{ p: 4 }}>
        {/* Company Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            {orgName}
          </Typography>
          {(settings?.organisation?.address) && (
            <Typography variant="body2" color="text.secondary">
              {settings.organisation.address}
            </Typography>
          )}
          {(settings?.organisation?.phone || settings?.organisation?.email) && (
            <Typography variant="body2" color="text.secondary">
              {[settings.organisation.phone, settings.organisation.email].filter(Boolean).join(' | ')}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Customer Info */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Bill To:</Typography>
          <Typography>{calculatedBill.customer.firstName} {calculatedBill.customer.lastName}</Typography>
          {calculatedBill.customer.email && (
            <Typography>{calculatedBill.customer.email}</Typography>
          )}
          {calculatedBill.customer.phone && (
            <Typography>{calculatedBill.customer.phone}</Typography>
          )}
        </Box>

        {/* Bill Details */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Invoice Number:</Typography>
            <Typography variant="body1" fontWeight="bold">{calculatedBill.billNumber}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Bill Date:</Typography>
            <Typography variant="body1">{calculatedBill.billDate}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Stay Start:</Typography>
            <Typography variant="body1">{calculatedBill.stayStartDate}</Typography>
          </Box>
        </Box>

        {/* Items Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Unit Price</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Paid By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Partner-Paid Activities (Dives) */}
              {calculatedBill.dives.filter(dive => dive.isPartnerBooking).length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ backgroundColor: 'secondary.light', py: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        <BusinessIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                        Activities Paid by Partner: {calculatedBill.dives.filter(d => d.isPartnerBooking).map(d => getPartnerName(d.partnerId)).filter(Boolean)[0] || 'Partner'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {calculatedBill.dives.filter(dive => dive.isPartnerBooking).map((dive, index) => (
                    <TableRow key={`partner-dive-${index}`}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {dive.diveSite}
                        </Typography>
                        {dive.session && (
                          <Typography variant="caption" color="text.secondary">
                            {dive.session}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{dive.date}</TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{dive.price.toFixed(2)}</TableCell>
                      <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<BusinessIcon />}
                          label={getPartnerName(dive.partnerId) || 'Partner'}
                          size="small"
                          color="secondary"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              
              {/* Customer-Paid Activities (Dives) */}
              {calculatedBill.dives.filter(dive => !dive.isPartnerBooking).length > 0 && (
                <>
                  {calculatedBill.dives.filter(dive => dive.isPartnerBooking).length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 1 }}></TableCell>
                    </TableRow>
                  )}
                  {calculatedBill.dives.filter(dive => !dive.isPartnerBooking).map((dive, index) => (
                    <TableRow key={`customer-dive-${index}`}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {dive.diveSite}
                        </Typography>
                        {dive.session && (
                          <Typography variant="caption" color="text.secondary">
                            {dive.session}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{dive.date}</TableCell>
                      <TableCell align="right">1</TableCell>
                      <TableCell align="right">€{dive.price.toFixed(2)}</TableCell>
                      <TableCell align="right">€{dive.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">Customer</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* Customer-Paid Extras */}
              {(calculatedBill.breakdown.equipment > 0 || calculatedBill.breakdown.diveInsurance > 0 || calculatedBill.additionalCosts.length > 0 || calculatedBill.otherItems.length > 0) && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ backgroundColor: 'info.light', py: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Items Paid by Customer
                      </Typography>
                    </TableCell>
                  </TableRow>
                </>
              )}

              {/* Additional Costs */}
              {calculatedBill.additionalCosts.map((cost, index) => (
                <TableRow key={`cost-${index}`}>
                  <TableCell>{cost.description || cost.category}</TableCell>
                  <TableCell>{cost.date}</TableCell>
                  <TableCell align="right">{cost.quantity || 1}</TableCell>
                  <TableCell align="right">€{(cost.unitPrice || cost.total).toFixed(2)}</TableCell>
                  <TableCell align="right">€{cost.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">Customer</Typography>
                  </TableCell>
                </TableRow>
              ))}

              {/* Equipment */}
              {calculatedBill.breakdown.equipment > 0 && (
                <TableRow>
                  <TableCell>Equipment Rental</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right">€{calculatedBill.breakdown.equipment.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">Customer</Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Dive Insurance */}
              {calculatedBill.breakdown.diveInsurance > 0 && (
                <TableRow>
                  <TableCell>Dive Insurance</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right">€{calculatedBill.breakdown.diveInsurance.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">Customer</Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Other Items */}
              {calculatedBill.otherItems.map((item, index) => (
                <TableRow key={`other-${index}`}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right">1</TableCell>
                  <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                  <TableCell align="right">€{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Typography variant="caption">Customer</Typography>
                  </TableCell>
                </TableRow>
              ))}

              {/* Payment Summary */}
              {calculatedBill.partnerPaidTotal > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 2, borderTop: 2, borderColor: 'divider' }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Payment Summary
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                        <Typography variant="body2" fontWeight="bold">
                          Paid by Partner ({getPartnerName(calculatedBill.dives.find(d => d.isPartnerBooking)?.partnerId) || 'Partner'}):
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        €{calculatedBill.partnerPaidTotal.toFixed(2)}
                        {calculatedBill.partnerTax > 0 && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            + €{calculatedBill.partnerTax.toFixed(2)} tax
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" fontWeight="bold">
                        Paid by Customer:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        €{calculatedBill.customerPaidTotal.toFixed(2)}
                        {calculatedBill.customerTax > 0 && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            + €{calculatedBill.customerTax.toFixed(2)} tax
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
              
              {/* Totals */}
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="body1" fontWeight="bold">Subtotal:</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1" fontWeight="bold">
                    €{calculatedBill.subtotal.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="body1">IGIC (7%):</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body1">€{calculatedBill.tax.toFixed(2)}</Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} align="right">
                  <Typography variant="h6" fontWeight="bold">Total:</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6" fontWeight="bold">
                    €{calculatedBill.total.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 4 }} />

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Thank you for diving with {orgName}!
          </Typography>
          
          {/* Close Stay Button */}
          {!stayBilled && (
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                try {
                  // Ensure bill is calculated before closing
                  if (!calculatedBill) {
                    alert('Please calculate the bill first before closing the stay.');
                    return;
                  }

                  // Create partner invoices if not already created
                  if (!partnerInvoicesCreated && calculatedBill) {
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
                        console.warn('[Bill] No partner bookings found. Customer partnerId:', customerPartnerId);
                        console.warn('[Bill] This might mean bookings don\'t have partnerId set, or customer doesn\'t have partnerId');
                      }
                      
                      let invoicesCreated = 0;
                      for (const [partnerId, bookings] of Object.entries(bookingsByPartner)) {
                        try {
                          // Calculate commission using backend service
                          const bookingIds = bookings.map(b => b.id);
                          
                          // Get partner to check commission rate
                          const partner = await dataService.getById('partners', partnerId);
                          if (!partner || partner.isActive === false) {
                            console.warn(`Partner ${partnerId} not found or inactive, skipping invoice creation`);
                            continue;
                          }

                          const commissionRate = partner.commissionRate || partner.commission_rate || 0;
                          if (!commissionRate || commissionRate === 0) {
                            console.warn(`Partner ${partnerId} has no commission rate, skipping invoice creation`);
                            continue;
                          }

                          // Calculate subtotal and commission from all bookings
                          // Business model: Customer pays full price to partner, partner keeps commission,
                          // partner pays diving center (booking price - commission) + tax
                          const bookingTotal = bookings.reduce((sum, booking) => {
                            return sum + (parseFloat(booking.totalPrice || booking.total_price || booking.price || 0));
                          }, 0);

                          if (bookingTotal === 0) {
                            console.warn(`Partner ${partnerId} has no bookings with prices, skipping invoice creation`);
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
                          const invoiceDate = new Date().toISOString().split('T')[0];
                          const dueDate = new Date();
                          dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

                          await dataService.create('partnerInvoices', {
                            partnerId,
                            customerId: stay.customer.id,
                            // Note: CreatePartnerInvoiceDto.billId is a UUID FK to a real
                            // customerBills row, but no such row is created in this flow -
                            // calculatedBill.billNumber is a display string ("BILL-<ts>"),
                            // not a UUID, so sending it here always failed IsUUID
                            // validation. The bill number is already included in `notes`
                            // below, so omit billId rather than send an invalid value.
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
                          console.error(`Error creating invoice for partner ${partnerId}:`, error);
                          // Continue with other partners even if one fails
                        }
                      }

                      setPartnerInvoicesCreated(true);
                    } catch (error) {
                      console.error('Error creating partner invoices:', error);
                    }
                  }

                  // Save bill to database for tax control
                  try {
                    const stayLocationId = (stay?.stayBookings && stay.stayBookings[0]?.locationId) || 
                                         localStorage.getItem('dcms_current_location');
                    const stayBookings = await getCustomerStayBookings(stay.customer.id, stay.stayStartDate);
                    const bookingIds = stayBookings.map(b => b.id);
                    
                    // Combine all bill items (dives, equipment, insurance, additional costs, other items)
                    const billItems = [
                      ...(calculatedBill.dives || []).map(dive => ({
                        type: 'dive',
                        date: dive.date,
                        session: dive.session,
                        diveSite: dive.diveSite,
                        quantity: dive.dives || 1,
                        unitPrice: dive.pricePerDive || 0,
                        total: dive.total || 0,
                        isPartnerBooking: dive.isPartnerBooking || false,
                      })),
                      ...(calculatedBill.additionalCosts || []).map(cost => ({
                        type: 'additional_cost',
                        date: cost.date,
                        category: cost.category,
                        description: cost.description,
                        quantity: cost.quantity || 1,
                        unitPrice: cost.unitPrice || 0,
                        total: cost.total || 0,
                      })),
                      ...(calculatedBill.otherItems || []).filter(item => item.name && item.price > 0).map(item => ({
                        type: 'other',
                        name: item.name,
                        quantity: 1,
                        unitPrice: item.price || 0,
                        total: item.price || 0,
                      })),
                    ];

                    // Add equipment if any
                    if (calculatedBill.equipmentTotal > 0) {
                      billItems.push({
                        type: 'equipment',
                        description: 'Equipment Rental',
                        quantity: 1,
                        unitPrice: calculatedBill.equipmentTotal,
                        total: calculatedBill.equipmentTotal,
                      });
                    }

                    // Add insurance if any
                    if (calculatedBill.breakdown?.diveInsurance > 0) {
                      billItems.push({
                        type: 'insurance',
                        description: 'Dive Insurance',
                        quantity: 1,
                        unitPrice: calculatedBill.breakdown.diveInsurance,
                        total: calculatedBill.breakdown.diveInsurance,
                      });
                    }

                    await dataService.create('customerBills', {
                      customerId: stay.customer.id,
                      locationId: stayLocationId,
                      billNumber: calculatedBill.billNumber,
                      stayStartDate: stay.stayStartDate,
                      billDate: calculatedBill.billDate,
                      bookingIds,
                      billItems,
                      subtotal: calculatedBill.subtotal,
                      tax: calculatedBill.tax,
                      total: calculatedBill.total,
                      partnerPaidTotal: calculatedBill.partnerPaidTotal || 0,
                      customerPaidTotal: calculatedBill.customerPaidTotal || 0,
                      partnerTax: calculatedBill.partnerTax || 0,
                      customerTax: calculatedBill.customerTax || 0,
                      breakdown: calculatedBill.breakdown || {},
                      notes: `Bill for stay starting ${stay.stayStartDate}`,
                    });
                  } catch (billError) {
                    console.error('[Bill] Error saving bill to database:', billError);
                    // Continue even if bill save fails - still mark as billed in localStorage
                  }

                  // Mark stay as billed by storing bill info (backup in localStorage)
                  const stayKey = `${stay.customer.id}|${stay.stayStartDate}`;
                  const billedStays = JSON.parse(localStorage.getItem('dcms_billed_stays') || '[]');
                  if (!billedStays.includes(stayKey)) {
                    billedStays.push(stayKey);
                    localStorage.setItem('dcms_billed_stays', JSON.stringify(billedStays));
                  }
                  
                  // Note: bookings aren't individually stamped with a bill
                  // reference here - `billId`/`billDate` have never been
                  // real fields on `bookings` (checked schema.prisma), so
                  // this always silently failed to persist. The actual,
                  // working link between a bill and its bookings is the
                  // `bookingIds` array already saved on the `customerBills`
                  // record created above.
                  
                  setStayBilled(true);
                  alert('Stay marked as billed. Bill saved for tax control. It will no longer appear in active stays.');
                } catch (error) {
                  console.error('Error closing stay:', error);
                  alert('Error closing stay. Please try again.');
                }
              }}
              sx={{ mt: 2 }}
            >
              Mark Stay as Billed / Close Stay
            </Button>
          )}
          
          {stayBilled && (
            <Alert severity="success" sx={{ mt: 2 }}>
              This stay has been marked as billed and will no longer appear in active stays.
            </Alert>
          )}
        </Box>
      </Paper>
  );
}
