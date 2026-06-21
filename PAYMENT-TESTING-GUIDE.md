# Payment System Testing Guide

## Overview

This guide provides comprehensive instructions for testing the Air Charters payment system implementation. The testing covers all payment flows, error scenarios, and integration points.

## Prerequisites

1. **Node.js and npm** installed
2. **Postman** installed for API testing
3. **Database** running (MySQL/PostgreSQL)
4. **Environment variables** configured

## Quick Start

### 1. Setup Environment

```bash
# Navigate to air_backend directory
cd air_backend

# Make test script executable
chmod +x test-payment-system.sh

# Check environment and install dependencies
./test-payment-system.sh check
./test-payment-system.sh install
```

### 2. Configure Environment Variables

Create or update your `.env` file with the following variables:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=air_charters

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# M-Pesa (Test Keys)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_BUSINESS_SHORT_CODE=174379
MPESA_ENVIRONMENT=sandbox

# App Configuration
APP_URL=http://localhost:3000
```

### 3. Start the Server

```bash
# Start the development server
./test-payment-system.sh server

# Or use npm directly
npm run start:dev
```

## Testing with Postman

### 1. Import Collection

1. Open Postman
2. Click "Import" button
3. Select the file: `PAYMENT-TESTING-POSTMAN-COLLECTION.json`
4. The collection will be imported with all test scenarios

### 2. Configure Variables

1. Open the collection
2. Go to "Variables" tab
3. Update the following variables:
   - `base_url`: `http://localhost:3000` (or your server URL)
   - `jwt_token`: Will be automatically set by tests
   - `test_user_id`: Will be automatically set by tests
   - `test_booking_id`: Will be automatically set by tests

### 3. Run Tests in Order

**Important**: Run the tests in the exact order they appear in the collection:

#### Step 1: Authentication Setup
1. **Register Test User** - Creates a test user and sets JWT token
2. **Login Test User** - Logs in and updates JWT token

#### Step 2: Create Test Booking
1. **Create Booking for Payment Testing** - Creates a booking for testing

#### Step 3: Payment Provider Tests
1. **Get Available Payment Providers** - Lists supported payment methods
2. **Create Stripe Payment Intent** - Tests Stripe payment intent creation
3. **Create M-Pesa STK Push** - Tests M-Pesa payment initiation
4. **Get Payment Status** - Checks payment status
5. **Confirm Payment** - Confirms a payment

#### Step 4: Unified Payment System Tests
1. **Process Unified Payment (Card)** - Tests unified payment with card
2. **Process Unified Payment (M-Pesa)** - Tests unified payment with M-Pesa
3. **Get Transaction Details** - Retrieves transaction information
4. **Confirm Unified Payment** - Confirms unified payment
5. **Get Company Transactions** - Lists company transactions

#### Step 5: Legacy Payment System Tests
1. **Create Legacy Payment** - Tests legacy payment creation
2. **Get User Payments** - Lists user payments
3. **Get Booking Payments** - Lists booking-specific payments
4. **Update Payment Status** - Updates payment status
5. **Get Payment Statistics** - Retrieves payment statistics

#### Step 6: Error Handling Tests
1. **Invalid Amount (Negative)** - Tests negative amount validation
2. **Invalid Currency** - Tests unsupported currency
3. **Missing Booking ID** - Tests missing required fields
4. **Non-existent Booking** - Tests invalid booking reference
5. **Invalid Phone Number (M-Pesa)** - Tests phone number validation

#### Step 7: Authentication Error Tests
1. **No Authentication** - Tests missing authentication
2. **Invalid Token** - Tests invalid JWT token

## Test Scenarios Explained

### 1. Payment Provider Tests

These tests verify the core payment provider functionality:

- **Stripe Integration**: Tests payment intent creation, confirmation, and status checking
- **M-Pesa Integration**: Tests STK push initiation and callback processing
- **Provider Selection**: Tests automatic provider selection based on currency and payment method

### 2. Unified Payment System Tests

These tests verify the unified payment orchestration:

- **Automatic Provider Selection**: Tests provider selection logic
- **Transaction Ledger**: Tests transaction recording and tracking
- **Commission Calculation**: Tests platform fee and company amount calculations
- **Multi-currency Support**: Tests USD and KES payments

### 3. Legacy Payment System Tests

These tests verify backward compatibility:

- **Payment Creation**: Tests legacy payment creation
- **Status Management**: Tests payment status updates
- **Statistics**: Tests payment analytics and reporting

### 4. Error Handling Tests

These tests verify proper error handling:

- **Input Validation**: Tests field validation and sanitization
- **Business Logic**: Tests business rule enforcement
- **Authentication**: Tests security measures

## Expected Test Results

### Successful Responses

All successful API calls should return:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Responses

Error responses should return:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error type"
}
```

## Common Issues and Solutions

### 1. Authentication Errors (401)

**Problem**: JWT token is invalid or expired
**Solution**: 
- Re-run the "Register Test User" or "Login Test User" request
- Check that the JWT token is being set correctly in collection variables

### 2. Database Connection Errors

**Problem**: Cannot connect to database
**Solution**:
- Verify database is running
- Check database credentials in `.env` file
- Ensure database schema is up to date

### 3. Payment Provider Errors

**Problem**: Stripe or M-Pesa API errors
**Solution**:
- Verify API keys are correct in `.env` file
- Use test keys for testing (not production keys)
- Check provider service status

### 4. Validation Errors (400)

**Problem**: Request validation fails
**Solution**:
- Check request body format
- Ensure all required fields are provided
- Verify data types and formats

## Running Automated Tests

### Unit Tests

```bash
# Run unit tests
./test-payment-system.sh unit

# Or use npm
npm run test
```

### E2E Tests

```bash
# Run e2e tests
./test-payment-system.sh e2e

# Or use npm
npm run test:e2e
```

### Complete Test Suite

```bash
# Run all tests
./test-payment-system.sh all
```

## Monitoring and Debugging

### 1. Server Logs

Monitor server logs for errors and debugging information:

```bash
# View server logs
tail -f logs/app.log
```

### 2. Database Queries

Check database for payment records:

```sql
-- Check payments table
SELECT * FROM payments ORDER BY createdAt DESC LIMIT 10;

-- Check transaction ledger
SELECT * FROM transaction_ledger ORDER BY createdAt DESC LIMIT 10;

-- Check booking payments
SELECT b.id, b.totalPrice, p.paymentStatus, p.totalAmount 
FROM bookings b 
LEFT JOIN payments p ON b.id = p.bookingId 
ORDER BY b.createdAt DESC LIMIT 10;
```

### 3. Payment Provider Logs

Check payment provider specific logs:

```bash
# Stripe logs (if using Stripe CLI)
stripe logs tail

# M-Pesa logs (check server logs)
grep "M-Pesa" logs/app.log
```

## Security Testing

### 1. Authentication Testing

- Test with invalid JWT tokens
- Test with expired tokens
- Test without authentication headers

### 2. Input Validation Testing

- Test with malformed JSON
- Test with SQL injection attempts
- Test with XSS payloads
- Test with oversized payloads

### 3. Business Logic Testing

- Test duplicate payment prevention
- Test amount validation
- Test currency validation
- Test booking existence validation

## Performance Testing

### 1. Load Testing

Use tools like Apache Bench or Artillery:

```bash
# Test payment endpoint with load
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   -T "application/json" \
   -p payment_request.json \
   http://localhost:3000/api/payments/create-intent
```

### 2. Database Performance

Monitor database performance during tests:

```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'air_charters';
```

## Reporting Test Results

### 1. Test Summary

After running all tests, document:

- Number of tests passed/failed
- Critical issues found
- Performance metrics
- Security vulnerabilities

### 2. Bug Reports

For each failed test, document:

- Test name and description
- Expected vs actual result
- Steps to reproduce
- Environment details
- Error logs

### 3. Recommendations

Based on test results, provide:

- Security improvements needed
- Performance optimizations
- Code quality improvements
- Documentation updates

## Next Steps

After completing the tests:

1. **Fix Issues**: Address any failed tests or security vulnerabilities
2. **Implement Security Fixes**: Apply the security improvements identified in the audit
3. **Performance Optimization**: Optimize based on performance test results
4. **Documentation**: Update documentation based on test findings
5. **Production Deployment**: Deploy to production with monitoring

## Support

If you encounter issues during testing:

1. Check the server logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure the database is properly configured
4. Test with a minimal request to isolate the issue
5. Check the API documentation for endpoint specifications
