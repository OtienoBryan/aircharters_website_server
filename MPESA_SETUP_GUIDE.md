# 📱 M-Pesa Integration Setup Guide

## 🔧 **Environment Configuration**

Add these environment variables to your `.env` file:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_BUSINESS_SHORT_CODE=your_business_short_code
MPESA_ENVIRONMENT=sandbox  # or 'live' for production
APP_URL=http://localhost:5000  # Your app URL for callbacks
```

## 🏢 **M-Pesa Business Account Setup**

### **1. Register for M-Pesa Business Account**
1. Visit [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Create a business account
3. Apply for STK Push API access
4. Get your credentials:
   - Consumer Key
   - Consumer Secret
   - Business Short Code
   - Passkey

### **2. Test Credentials (Sandbox)**
For testing, use these sandbox credentials:
```env
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_PASSKEY=your_sandbox_passkey
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_ENVIRONMENT=sandbox
```

## 🚀 **API Endpoints**

### **1. Initiate M-Pesa Payment**
```bash
POST /api/payments/mpesa/stk-push
Authorization: Bearer {user_token}
{
  "bookingId": "booking_123",
  "amount": 1000,
  "phoneNumber": "254700000000",
  "description": "Flight booking payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "M-Pesa STK Push initiated successfully",
  "data": {
    "paymentIntentId": "ws_CO_123456789",
    "status": "pending",
    "requiresAction": true,
    "nextAction": {
      "type": "mpesa_stk_push",
      "message": "Please check your phone and enter M-Pesa PIN",
      "checkoutRequestId": "ws_CO_123456789"
    }
  }
}
```

### **2. M-Pesa Callback (Public)**
```bash
POST /api/payments/mpesa/callback
Content-Type: application/json

{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 1000
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "QK123456789"
          },
          {
            "Name": "TransactionDate",
            "Value": 20231215123456
          },
          {
            "Name": "PhoneNumber",
            "Value": 254700000000
          }
        ]
      }
    }
  }
}
```

## 💳 **Payment Flow**

### **1. User Initiates Payment**
```javascript
// Frontend code
const response = await fetch('/api/payments/mpesa/stk-push', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bookingId: 'booking_123',
    amount: 1000,
    phoneNumber: '254700000000',
    description: 'Flight booking'
  })
});

const result = await response.json();
console.log('STK Push initiated:', result.data);
```

### **2. User Receives STK Push**
- User receives M-Pesa STK Push notification
- User enters M-Pesa PIN
- Payment is processed

### **3. Callback Processing**
- M-Pesa sends callback to your server
- Payment status is updated in database
- Booking status is updated

## 🔐 **Security Features**

### **1. Phone Number Validation**
```javascript
// Format phone number for M-Pesa
const formatPhoneNumber = (phone) => {
  return phone.replace(/^\+/, '').replace(/^0/, '254');
};
```

### **2. Amount Validation**
```javascript
// M-Pesa expects whole numbers (no decimals)
const amount = Math.round(1000.50); // 1001
```

### **3. Callback Verification**
- Verify callback signature (if available)
- Validate transaction data
- Update payment status securely

## 📊 **Integration with Booking Inquiries**

### **M-Pesa Payment for Inquiry Confirmation**
```bash
# 1. User confirms inquiry
PUT /api/booking-inquiries/{id}/confirm

# 2. System creates payment intent
POST /api/payments/mpesa/stk-push
{
  "bookingId": "booking_auto_generated",
  "amount": 5000,
  "phoneNumber": "254700000000",
  "description": "Inquiry confirmation payment"
}
```

## 🧪 **Testing**

### **1. Test Phone Numbers**
```
Sandbox Test Numbers:
- 254708374149
- 254700000000
- 254711111111
```

### **2. Test Amounts**
```
Valid amounts: 1, 10, 100, 1000
Invalid amounts: 0, -1, 0.50
```

### **3. Test Scenarios**
```bash
# Test successful payment
curl -X POST "http://localhost:5000/api/payments/mpesa/stk-push" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "test_booking",
    "amount": 100,
    "phoneNumber": "254708374149",
    "description": "Test payment"
  }'

# Test callback (simulate M-Pesa response)
curl -X POST "http://localhost:5000/api/payments/mpesa/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "test_merchant_id",
        "CheckoutRequestID": "test_checkout_id",
        "ResultCode": 0,
        "ResultDesc": "Success",
        "CallbackMetadata": {
          "Item": [
            {"Name": "Amount", "Value": 100},
            {"Name": "MpesaReceiptNumber", "Value": "TEST123456"},
            {"Name": "PhoneNumber", "Value": 254708374149}
          ]
        }
      }
    }
  }'
```

## 🚨 **Error Handling**

### **Common M-Pesa Errors**
```json
{
  "ResultCode": 1,
  "ResultDesc": "Insufficient funds"
}

{
  "ResultCode": 2,
  "ResultDesc": "Less than minimum transaction value"
}

{
  "ResultCode": 3,
  "ResultDesc": "More than maximum transaction value"
}

{
  "ResultCode": 4,
  "ResultDesc": "Would exceed daily transfer limit"
}
```

### **Error Response Format**
```json
{
  "success": false,
  "message": "M-Pesa STK Push failed: Insufficient funds",
  "error": "Insufficient funds"
}
```

## 📈 **Production Checklist**

### **Before Going Live:**
- [ ] Get production M-Pesa credentials
- [ ] Set `MPESA_ENVIRONMENT=live`
- [ ] Update callback URL to production domain
- [ ] Test with real M-Pesa accounts
- [ ] Implement proper error handling
- [ ] Add logging and monitoring
- [ ] Set up payment reconciliation
- [ ] Implement refund handling

### **Security Checklist:**
- [ ] Validate all input data
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Secure callback endpoint
- [ ] Validate transaction amounts
- [ ] Implement duplicate detection

## 🎯 **Benefits of M-Pesa Integration**

1. **Local Payment Method** - Popular in East Africa
2. **Mobile-First** - Works on any phone
3. **Real-Time** - Instant payment confirmation
4. **Secure** - Uses M-Pesa's secure infrastructure
5. **Cost-Effective** - Lower transaction fees
6. **User-Friendly** - Familiar payment method

The M-Pesa integration is now ready for testing and production use! 🎉 