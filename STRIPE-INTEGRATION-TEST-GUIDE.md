# Stripe Integration Test Guide

## 🚀 Quick Start

Your Stripe integration is ready! Here's how to test it:

## 📋 Prerequisites
- ✅ Stripe account created
- ✅ API keys added to `.env`
- ✅ Backend running on `http://localhost:5000`

## 🔑 Environment Variables
Make sure your `.env` has:
```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

## 🧪 Testing Flow

### 1. **Get Available Payment Providers**
```http
GET http://localhost:5000/api/payments/providers
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "Stripe",
        "supportedCurrencies": ["USD", "EUR", "GBP", "CAD", "AUD"],
        "supportedPaymentMethods": ["card", "apple_pay", "google_pay", "bank_transfer", "us_bank_account"]
      }
    ],
    "defaultProvider": "stripe"
  }
}
```

### 2. **Create Payment Intent**
```http
POST http://localhost:5000/api/payments/create-intent
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "bookingId": "BK-16JUL25-131023-LPX01",
  "amount": 1500.00,
  "currency": "USD",
  "paymentMethod": "card"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment intent created successfully",
  "data": {
    "paymentIntentId": "pi_3OqX8Y2eZvKYlo2C1gQ12345",
    "clientSecret": "pi_3OqX8Y2eZvKYlo2C1gQ12345_secret_abc123",
    "status": "requires_payment_method",
    "requiresAction": false,
    "nextAction": null
  }
}
```

### 3. **Confirm Payment (Frontend Integration)**
On your frontend, use the `clientSecret` to complete the payment:

```javascript
// Using Stripe.js
const stripe = Stripe('pk_test_your_publishable_key');
const { error } = await stripe.confirmPayment({
  clientSecret: 'pi_3OqX8Y2eZvKYlo2C1gQ12345_secret_abc123',
  confirmParams: {
    return_url: 'https://your-app.com/payment-success',
  },
});
```

### 4. **Check Payment Status**
```http
GET http://localhost:5000/api/payments/status/pi_3OqX8Y2eZvKYlo2C1gQ12345
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_3OqX8Y2eZvKYlo2C1gQ12345",
    "status": "succeeded",
    "amount": 1500.00,
    "currency": "USD",
    "transactionId": "ch_3OqX8Y2eZvKYlo2C1gQ12345",
    "paymentMethod": "card",
    "metadata": {
      "bookingId": "BK-16JUL25-131023-LPX01",
      "userId": "user_1752533042834_nsyj4iqyf"
    }
  }
}
```

### 5. **Process Booking Payment**
After successful payment, update your booking:
```http
POST http://localhost:5000/api/bookings/BK-16JUL25-131023-LPX01/process-payment
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "paymentTransactionId": "ch_3OqX8Y2eZvKYlo2C1gQ12345",
  "paymentMethod": "card",
  "amount": 1500.00
}
```

## 🧪 Test Card Numbers

Use these Stripe test cards:

| Card Type | Number | CVC | Expiry |
|-----------|--------|-----|--------|
| Visa | 4242424242424242 | 123 | 12/25 |
| Mastercard | 5555555555554444 | 123 | 12/25 |
| American Express | 378282246310005 | 1234 | 12/25 |
| Declined | 4000000000000002 | 123 | 12/25 |

## 🔄 Complete Payment Flow

1. **User creates booking** → Gets booking ID
2. **Create payment intent** → Gets client secret
3. **Frontend processes payment** → Using Stripe.js
4. **Check payment status** → Verify success
5. **Process booking payment** → Update booking and earn points

## 🛠️ Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| `Invalid API key` | Check your STRIPE_SECRET_KEY |
| `Currency not supported` | Use USD, EUR, GBP, CAD, or AUD |
| `Payment method not supported` | Use card, apple_pay, google_pay, or bank_transfer |

## 🔧 Integration with Booking System

The payment system is designed to work seamlessly with your existing booking flow:

1. **Booking Creation** → Returns booking with payment instructions
2. **Payment Processing** → Uses new Stripe integration
3. **Confirmation** → Updates booking status and earns loyalty points
4. **Database Records** → Creates payment and user trip records

## 🚀 Next Steps

1. **Test the endpoints** using the examples above
2. **Integrate with frontend** using Stripe.js
3. **Add webhook handling** for real-time payment updates
4. **Add M-Pesa provider** when ready

## 📞 Support

If you encounter issues:
1. Check Stripe dashboard for payment status
2. Verify API keys are correct
3. Ensure all required fields are provided
4. Check server logs for detailed error messages

Your payment system is now ready for production! 🎉 