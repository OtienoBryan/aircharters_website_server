# Flutter + Stripe Integration Guide

## 🚀 Flutter Payment Integration

This guide shows how to integrate your Stripe payment system with Flutter.

## 📦 Required Flutter Packages

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP requests
  http: ^1.1.0
  
  # State management (choose one)
  provider: ^6.1.1
  # OR
  bloc: ^8.1.3
  
  # Local storage
  shared_preferences: ^2.2.2
  
  # UI components
  flutter_stripe: ^10.0.0
  
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

## 🔧 Setup

### 1. **Initialize Stripe in main.dart**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Stripe
  Stripe.publishableKey = 'pk_test_your_publishable_key_here';
  await Stripe.instance.applySettings();
  
  runApp(MyApp());
}
```

### 2. **Payment Service Class**

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class PaymentService {
  static const String baseUrl = 'http://localhost:5000/api';
  static const String authToken = 'YOUR_JWT_TOKEN'; // Get from login

  // Create payment intent
  static Future<Map<String, dynamic>> createPaymentIntent({
    required String bookingId,
    required double amount,
    String currency = 'USD',
    String paymentMethod = 'card',
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/payments/create-intent'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'bookingId': bookingId,
          'amount': amount,
          'currency': currency,
          'paymentMethod': paymentMethod,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create payment intent: ${response.body}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Check payment status
  static Future<Map<String, dynamic>> getPaymentStatus(String paymentIntentId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/payments/status/$paymentIntentId'),
        headers: {
          'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get payment status: ${response.body}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Process booking payment
  static Future<Map<String, dynamic>> processBookingPayment({
    required String bookingId,
    required String paymentTransactionId,
    required String paymentMethod,
    required double amount,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings/$bookingId/process-payment'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'paymentTransactionId': paymentTransactionId,
          'paymentMethod': paymentMethod,
          'amount': amount,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to process booking payment: ${response.body}');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }
}
```

### 3. **Payment Screen Widget**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';

class PaymentScreen extends StatefulWidget {
  final String bookingId;
  final double amount;

  const PaymentScreen({
    Key? key,
    required this.bookingId,
    required this.amount,
  }) : super(key: key);

  @override
  _PaymentScreenState createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  bool _isLoading = false;
  String? _paymentIntentId;
  String? _clientSecret;

  @override
  void initState() {
    super.initState();
    _createPaymentIntent();
  }

  Future<void> _createPaymentIntent() async {
    setState(() => _isLoading = true);

    try {
      final result = await PaymentService.createPaymentIntent(
        bookingId: widget.bookingId,
        amount: widget.amount,
      );

      if (result['success']) {
        setState(() {
          _paymentIntentId = result['data']['paymentIntentId'];
          _clientSecret = result['data']['clientSecret'];
          _isLoading = false;
        });
      } else {
        throw Exception(result['message']);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      _showError('Failed to create payment intent: $e');
    }
  }

  Future<void> _processPayment() async {
    if (_clientSecret == null) {
      _showError('Payment intent not ready');
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Create payment method
      final paymentMethod = await Stripe.instance.createPaymentMethod(
        params: const PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(),
        ),
      );

      // Confirm payment
      final paymentIntent = await Stripe.instance.confirmPayment(
        _clientSecret!,
        PaymentMethodParams.card(
          paymentMethodData: PaymentMethodData(
            billingDetails: BillingDetails(
              email: 'user@example.com', // Get from user profile
            ),
          ),
        ),
      );

      if (paymentIntent.status == PaymentIntentsStatus.Succeeded) {
        await _completePayment(paymentIntent.id);
      } else {
        _showError('Payment failed: ${paymentIntent.status}');
      }
    } catch (e) {
      _showError('Payment error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _completePayment(String transactionId) async {
    try {
      final result = await PaymentService.processBookingPayment(
        bookingId: widget.bookingId,
        paymentTransactionId: transactionId,
        paymentMethod: 'card',
        amount: widget.amount,
      );

      if (result['success']) {
        _showSuccess('Payment successful!');
        Navigator.pop(context, true);
      } else {
        _showError('Failed to process booking: ${result['message']}');
      }
    } catch (e) {
      _showError('Failed to complete payment: $e');
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Payment Summary',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Booking ID:'),
                        Text(widget.bookingId),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Amount:'),
                        Text(
                          '\$${widget.amount.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_clientSecret != null)
              ElevatedButton(
                onPressed: _processPayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'Pay Now',
                  style: TextStyle(fontSize: 18, color: Colors.white),
                ),
              )
            else
              const Center(
                child: Text('Loading payment options...'),
              ),
          ],
        ),
      ),
    );
  }
}
```

### 4. **Booking Confirmation Screen**

```dart
class BookingConfirmationScreen extends StatelessWidget {
  final String bookingId;
  final double amount;

  const BookingConfirmationScreen({
    Key? key,
    required this.bookingId,
    required this.amount,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Confirmation'),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 80,
            ),
            const SizedBox(height: 24),
            Text(
              'Booking Created Successfully!',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Please complete payment to confirm your booking.',
              style: Theme.of(context).textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => PaymentScreen(
                      bookingId: bookingId,
                      amount: amount,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text(
                'Proceed to Payment',
                style: TextStyle(fontSize: 18, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### 5. **Usage Example**

```dart
// Navigate to payment screen
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => PaymentScreen(
      bookingId: 'BK-16JUL25-131023-LPX01',
      amount: 1500.00,
    ),
  ),
).then((success) {
  if (success == true) {
    // Payment successful, navigate to success screen
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => const PaymentSuccessScreen(),
      ),
    );
  }
});
```

## 🔧 Configuration

### **Android Setup**

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<application>
    <!-- ... other configurations ... -->
    <meta-data
        android:name="com.google.android.gms.wallet.api.enabled"
        android:value="true" />
</application>
```

### **iOS Setup**

Add to `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan payment cards</string>
```

## 🧪 Testing

1. **Test Cards**: Use the same test cards from the backend guide
2. **Test Mode**: Make sure you're using test API keys
3. **Error Handling**: Test with declined cards to verify error handling

## 🚀 Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Add proper error handling
- [ ] Implement retry logic
- [ ] Add loading states
- [ ] Test on real devices
- [ ] Add analytics tracking
- [ ] Implement webhook handling

## 📱 UI/UX Tips

1. **Loading States**: Show progress indicators during payment processing
2. **Error Messages**: Display user-friendly error messages
3. **Success Feedback**: Clear confirmation when payment succeeds
4. **Retry Options**: Allow users to retry failed payments
5. **Payment Methods**: Show available payment options

Your Flutter app is now ready to process payments with Stripe! 🎉 