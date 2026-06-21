# 🚀 Paystack Integration Setup Guide

## ✅ Implementation Status
- [x] Backend PaystackProvider created
- [x] PaystackController with secure endpoints
- [x] Flutter PaystackService and Widget
- [x] Environment variables configured
- [x] Server-side key management
- [x] Integration examples created

## 🔑 Environment Variables

### Backend (.env file)
```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_6d92a84f658a9f9c4d2d2e4f3d222da3c1c582af
PAYSTACK_PUBLIC_KEY=pk_test_6ad02ec12f811018e0d4c920ad79738d25d885ac
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret
```

## 🧪 Testing

### 1. Start Backend Server
```bash
cd air_backend
npm run start:dev
```

### 2. Run Integration Test
```bash
node test-paystack.js
```

### 3. Test Endpoints Manually

#### Get Paystack Info
```bash
curl -X GET http://localhost:5000/api/payments/paystack/info
```

#### Initialize Payment
```bash
curl -X POST http://localhost:5000/api/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "currency": "KES",
    "email": "test@example.com",
    "bookingId": "test_123",
    "companyId": 1,
    "userId": "user_456",
    "description": "Test payment"
  }'
```

## 📱 Flutter Integration

### 1. Add to Existing Payment Page
```dart
import 'package:your_app/features/payment/paystack_integration_example.dart';

// In your payment page
ExistingPaymentPageIntegration.showPaystackPayment(
  context: context,
  bookingId: booking.id,
  companyId: booking.companyId,
  userId: currentUser.id,
  amount: booking.totalAmount,
  currency: 'KES',
  email: currentUser.email,
  onSuccess: (response) {
    // Handle successful payment
    Navigator.pushReplacement(context, 
      MaterialPageRoute(builder: (context) => BookingConfirmationPage())
    );
  },
  onError: (error) {
    // Handle payment error
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment failed: $error'))
    );
  },
  onCancelled: () {
    // Handle cancellation
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment cancelled'))
    );
  },
);
```

### 2. Direct Service Usage
```dart
final paystackService = PaystackService();

// Card Payment
final response = await paystackService.processCardPayment(
  amount: 100.0,
  currency: 'KES',
  email: 'user@example.com',
  bookingId: 'booking_123',
  companyId: 1,
  userId: 'user_456',
);

// M-Pesa Payment
final response = await paystackService.processMpesaPayment(
  amount: 100.0,
  currency: 'KES',
  email: 'user@example.com',
  phoneNumber: '+254712345678',
  bookingId: 'booking_123',
  companyId: 1,
  userId: 'user_456',
);
```

## 🏢 Paystack Subaccount Setup

### 1. Create Subaccounts for Each Airline
```bash
curl -X POST http://localhost:5000/api/payments/paystack/subaccount \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 1,
    "businessName": "Airline Company Name",
    "settlementBank": "Access Bank",
    "accountNumber": "1234567890",
    "percentageCharge": 5.0,
    "description": "Airline charter services"
  }'
```

### 2. Update Company Payment Accounts
```sql
INSERT INTO company_payment_accounts (
  company_id, 
  payment_provider, 
  account_id, 
  account_status, 
  provider_metadata
) VALUES (
  1, 
  'paystack', 
  'subaccount_id_from_paystack', 
  'active', 
  '{"splitCode": "SPL_xxxxx", "percentageCharge": 5.0}'
);
```

## 🔒 Security Best Practices

### 1. Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement idempotency for webhook processing

### 2. Key Management
- Never commit keys to version control
- Use environment variables for all keys
- Rotate keys regularly
- Use different keys for test/production

### 3. IP Whitelisting
Add your server IP to Paystack dashboard:
- Go to Settings > API Keys & Webhooks
- Add your server IP address

## 📊 Payment Flow

```
1. User selects payment method in Flutter
2. Flutter calls /api/payments/paystack/initialize
3. Backend creates Paystack transaction with subaccount
4. Backend returns authorization URL/access code
5. Flutter launches Paystack payment UI
6. User completes payment (card/M-Pesa)
7. Paystack sends webhook to backend
8. Backend verifies and updates booking status
9. Flutter receives payment confirmation
```

## 🚨 Troubleshooting

### Common Issues

1. **"Public key not configured"**
   - Check PAYSTACK_PUBLIC_KEY in .env file
   - Restart backend server

2. **"No subaccount found"**
   - Create subaccount for the company
   - Update company_payment_accounts table

3. **"Payment initialization failed"**
   - Check Paystack secret key
   - Verify company has active Paystack account

4. **Flutter can't get public key**
   - Check backend is running
   - Verify /api/payments/paystack/info endpoint
   - Check network connectivity

### Debug Mode
Enable debug logs in backend:
```bash
NODE_ENV=development npm run start:dev
```

## 📈 Next Steps

1. **Set up production keys** when ready to go live
2. **Configure webhooks** in Paystack dashboard
3. **Test with real transactions** using test cards
4. **Set up monitoring** for payment failures
5. **Implement retry logic** for failed payments
6. **Add payment analytics** and reporting

## 🔗 Useful Links

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks)
- [Paystack Subaccounts](https://paystack.com/docs/subaccounts)
