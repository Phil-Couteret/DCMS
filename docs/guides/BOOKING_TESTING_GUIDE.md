# Booking Flow Testing Guide

## 🚀 Servers Running

- **Public Website (Customer Booking)**: http://localhost:3002
- **Admin Frontend (DCMS)**: http://localhost:3001

## 📋 Testing the Booking Flow

### Step 1: Access the Booking Page
1. Open http://localhost:3002 in your browser
2. Navigate to "Book a Dive" in the navigation menu
3. You should see a 5-step booking form

### Step 2: Select Activity (Step 1)
**Test Cases:**
- ✅ Select "Scuba Diving" activity
- ✅ Choose location: "Caleta de Fuste" or "Las Playitas"
- ✅ Select a date (future date)
- ✅ Choose time slot (varies by activity type)
- ✅ Set number of dives (1-10)
- ✅ Select experience level

**Expected Behavior:**
- Time slots change based on activity type
- Price updates automatically
- Availability indicator shows if time slot is available

### Step 3: Enter Details (Step 2)
**Test Cases:**
- ✅ Enter first name
- ✅ Enter last name
- ✅ Enter valid email address
- ✅ Enter phone number
- ✅ (Optional) Add special requirements

**Expected Behavior:**
- Form validates required fields
- Email format is validated
- Can proceed to next step only if all required fields are filled

### Step 4: Review & Confirm (Step 3)
**Test Cases:**
- ✅ Review all booking details
- ✅ Verify pricing is correct
- ✅ Check availability status

**Expected Behavior:**
- All information is displayed correctly
- Price matches calculation
- Availability status is shown

### Step 5: Payment (Step 4)
**Test Cases:**
- ✅ Select payment method:
  - **Credit/Debit Card**: Enter card details (dummy - no real processing)
  - **Pay at Location**: Skip payment, pay at dive center
- ✅ Accept terms and conditions
- ✅ Click "Pay & Confirm Booking"

**Expected Behavior:**
- Card form validates input
- Payment processing shows loading state (2 second delay)
- Booking is created successfully

### Step 6: Confirmation (Step 5)
**Test Cases:**
- ✅ Booking confirmation displayed
- ✅ Booking ID shown
- ✅ Transaction ID shown
- ✅ All booking details displayed
- ✅ Options to view bookings or book another dive

**Expected Behavior:**
- Success message with checkmark
- All booking information displayed
- Booking stored in localStorage
- Booking appears in admin system (if admin is open)

## 🔄 Testing Data Synchronization

### Test Admin Integration:
1. Open http://localhost:3001 (Admin Frontend)
2. Log in with admin credentials
3. Navigate to "Bookings" page
4. You should see the booking created from the public website
5. Navigate to "Customers" page
6. You should see the customer created during booking

### Test My Account:
1. On public website, navigate to "My Account"
2. You should see your bookings listed
3. Booking details should match what was created

## 💳 Payment Testing

### Dummy Payment System:
- **Card Payment**: Enter any card number (e.g., 4111 1111 1111 1111)
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **Name**: Any name

**Note**: No real payment is processed. All payments are marked as "paid" for testing purposes.

## 📊 Expected Results

After completing a booking:
- ✅ Booking stored in `localStorage` under `dcms_bookings`
- ✅ Customer stored in `localStorage` under `dcms_customers`
- ✅ Booking appears in admin system immediately
- ✅ Email data prepared (logged to console)
- ✅ Booking confirmation displayed to user

## 🐛 Troubleshooting

### Booking not appearing in admin:
- Check that both servers are running
- Verify localStorage is shared (same browser)
- Check browser console for errors

### Payment not processing:
- Ensure all payment fields are filled
- Check that terms are accepted
- Look for error messages in the form

### Availability not showing:
- Ensure date and time are selected
- Check browser console for errors

## 📝 Test Data Examples

### Test Booking 1: Scuba Diving
- Activity: Scuba Diving
- Location: Caleta de Fuste
- Date: Tomorrow
- Time: 9:00 AM
- Dives: 2
- Price: €92.00

### Test Booking 2: Snorkeling
- Activity: Snorkeling
- Location: Las Playitas
- Date: Day after tomorrow
- Time: 10:00 AM
- Sessions: 1
- Price: €38.00

### Test Booking 3: Discover Scuba
- Activity: Discover Scuba
- Location: Caleta de Fuste
- Date: Next week
- Time: 10:00 AM
- Sessions: 1
- Price: €100.00

## ✅ Checklist

- [ ] Public website loads at http://localhost:3002
- [ ] Admin frontend loads at http://localhost:3001
- [ ] Booking form displays all 5 steps
- [ ] Activity selection works
- [ ] Customer details form validates
- [ ] Payment form accepts dummy data
- [ ] Booking is created successfully
- [ ] Booking appears in admin system
- [ ] Customer is created/updated
- [ ] My Account shows bookings
- [ ] Email data is prepared (check console)

## 🎯 Next Steps

After testing:
1. Verify all bookings appear in admin
2. Check customer data is correct
3. Test multiple bookings for same customer
4. Test availability limits
5. Test different activity types
6. Test payment methods

