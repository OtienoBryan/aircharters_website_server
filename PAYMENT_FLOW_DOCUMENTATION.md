# 💳 Payment Flow After Inquiry Confirmation

## 🔄 **Complete Payment Flow**

### **Step 1: User Creates Inquiry**
```bash
POST /api/booking-inquiries
{
  "aircraftId": 5,
  "requestedSeats": 4,
  "specialRequirements": "Luxury service",
  "onboardDining": true,
  "groundTransportation": false,
  "billingRegion": "United States",
  "userNotes": "Business trip",
  "stops": [
    {
      "stopName": "Wilson Airport",
      "longitude": 36.8147,
      "latitude": -1.3217,
      "datetime": "2024-01-15T10:00:00Z",
      "stopOrder": 1
    }
  ]
}
```

**Response:**
```json
{
  "id": "inquiry_1703123456789_abc123",
  "referenceNumber": "INQ-34567890-ABC1",
  "inquiryStatus": "pending",
  "requestedSeats": 4,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### **Step 2: Admin Reviews & Prices**
```bash
PUT /api/booking-inquiries/inquiry_1703123456789_abc123
{
  "inquiryStatus": "priced",
  "proposedPrice": 5000.00,
  "proposedPriceType": "total",
  "adminNotes": "Price includes fuel and landing fees"
}
```

**Response:**
```json
{
  "id": "inquiry_1703123456789_abc123",
  "inquiryStatus": "priced",
  "proposedPrice": 5000.00,
  "proposedPriceType": "total",
  "pricedAt": "2024-01-15T11:00:00Z"
}
```

### **Step 3: User Confirms Inquiry**
```bash
PUT /api/booking-inquiries/inquiry_1703123456789_abc123/confirm
Authorization: Bearer {user_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Inquiry confirmed successfully",
  "data": {
    "inquiry": {
      "id": "inquiry_1703123456789_abc123",
      "referenceNumber": "INQ-34567890-ABC1",
      "inquiryStatus": "confirmed",
      "proposedPrice": 5000.00,
      "confirmedAt": "2024-01-15T12:00:00Z"
    },
    "paymentIntent": {
      "paymentIntentId": "pi_3OqR8t2eZvKYlo2C1gFEMnSe",
      "clientSecret": "pi_3OqR8t2eZvKYlo2C1gFEMnSe_secret_abc123",
      "status": "requires_payment_method",
      "requiresAction": false,
      "nextAction": null
    }
  }
}
```

### **Step 4: Frontend Processes Payment**
```javascript
// Frontend code (Flutter/React)
const paymentIntent = response.data.paymentIntent;

// Use Stripe to confirm payment
const result = await stripe.confirmCardPayment(
  paymentIntent.clientSecret,
  {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: 'John Doe',
      },
    }
  }
);

if (result.error) {
  // Handle payment error
} else {
  // Payment successful
  // Call payment confirmation endpoint
}
```

### **Step 5: Confirm Payment**
```bash
POST /api/payments/confirm
Authorization: Bearer {user_token}
{
  "paymentIntentId": "pi_3OqR8t2eZvKYlo2C1gFEMnSe",
  "paymentMethodId": "pm_1OqR8t2eZvKYlo2C1gFEMnSe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "data": {
    "id": "payment_1703123456789_xyz789",
    "status": "paid",
    "amount": 5000.00,
    "currency": "USD",
    "bookingId": "booking_1703123456789_def456"
  }
}
```

## 🗄️ **Database Changes**

### **What Happens When User Confirms:**

1. **Inquiry Status Updated:**
   ```sql
   UPDATE booking_inquiries 
   SET inquiryStatus = 'confirmed', confirmedAt = NOW() 
   WHERE id = 'inquiry_1703123456789_abc123'
   ```

2. **New Booking Created:**
   ```sql
   INSERT INTO bookings (
     id, userId, dealId, company_id, totalPrice, 
     bookingStatus, referenceNumber, specialRequirements,
     onboardDining, groundTransportation, billingRegion
   ) VALUES (
     'booking_1703123456789_def456',
     'user_123',
     5, -- aircraftId as dealId
     1, -- company_id
     5000.00,
     'confirmed',
     'INQ-34567890-ABC1',
     'Luxury service',
     true,
     false,
     'United States'
   )
   ```

3. **Payment Intent Created:**
   - Stripe payment intent created
   - Amount: $5000.00 (500000 cents)
   - Currency: USD
   - Metadata includes inquiry details

## 💰 **Payment Integration Points**

### **Existing Payment System:**
- ✅ **Stripe Integration** - Already implemented
- ✅ **Payment Provider Service** - Handles payment processing
- ✅ **Payment Status Tracking** - Pending, Paid, Failed, Refunded
- ✅ **Transaction IDs** - Links to Stripe transactions

### **New Inquiry Payment Flow:**
- ✅ **Inquiry to Booking Conversion** - Automatic booking creation
- ✅ **Payment Intent Creation** - Stripe payment intent
- ✅ **Payment Confirmation** - Frontend payment processing
- ✅ **Status Updates** - Real-time payment status

## 🔐 **Security & Validation**

### **Payment Security:**
- ✅ **JWT Authentication** - All endpoints require valid tokens
- ✅ **User Ownership** - Users can only confirm their own inquiries
- ✅ **Status Validation** - Only priced inquiries can be confirmed
- ✅ **Amount Validation** - Proposed price must be set

### **Data Integrity:**
- ✅ **Transaction Management** - Database transactions ensure consistency
- ✅ **Reference Numbers** - Unique inquiry and booking references
- ✅ **Audit Trail** - Timestamps for all status changes
- ✅ **Metadata Tracking** - Payment includes inquiry details

## 📊 **API Endpoints Summary**

### **Inquiry Management:**
```
POST /api/booking-inquiries - Create inquiry
GET /api/booking-inquiries - Get user inquiries
PUT /api/booking-inquiries/:id - Update inquiry (admin pricing)
PUT /api/booking-inquiries/:id/confirm - Confirm inquiry & create payment
PUT /api/booking-inquiries/:id/cancel - Cancel inquiry
```

### **Payment Processing:**
```
POST /api/payments/create-intent - Create payment intent
POST /api/payments/confirm - Confirm payment
GET /api/payments/status/:paymentIntentId - Get payment status
```

## 🎯 **Frontend Integration**

### **Flutter Implementation:**
```dart
// 1. Confirm inquiry
final response = await apiService.confirmInquiry(inquiryId);
final paymentIntent = response.data['paymentIntent'];

// 2. Process payment with Stripe
final paymentResult = await Stripe.instance.confirmPayment(
  paymentIntent['clientSecret'],
  PaymentMethodParams.card(
    paymentMethod: PaymentMethodParams.Card(
      token: cardToken,
    ),
  ),
);

// 3. Handle payment result
if (paymentResult.status == PaymentIntentsStatus.Succeeded) {
  // Payment successful - navigate to booking confirmation
} else {
  // Handle payment error
}
```

## 🚀 **Benefits of This Flow**

1. **Seamless Integration** - Works with existing payment system
2. **User-Friendly** - Clear inquiry → pricing → confirmation flow
3. **Admin Control** - Admins set prices before payment
4. **Payment Security** - Uses proven Stripe payment processing
5. **Data Consistency** - Automatic booking creation from confirmed inquiries
6. **Audit Trail** - Complete tracking of inquiry to booking conversion

The payment flow is now fully integrated and ready for production use! 🎉 