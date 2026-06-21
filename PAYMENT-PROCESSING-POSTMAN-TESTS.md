# Payment Processing Postman Tests

## Overview

This document provides Postman test URLs and request examples for the new payment processing endpoints that implement payment-based points and reference population.

## Authentication

All endpoints require JWT authentication. Include the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Test Scenarios

### 1. Create Booking (No Points/Reference Yet)

**POST** `{{base_url}}/bookings`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
```

**Body:**
```json
{
  "dealId": 1,
  "totalPrice": 1500.00,
  "onboardDining": true,
  "groundTransportation": false,
  "specialRequirements": "Window seat preferred",
  "billingRegion": "US",
  "paymentMethod": "card",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "age": 35,
      "nationality": "US",
      "idPassportNumber": "US123456789"
    },
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "age": 32,
      "nationality": "US",
      "idPassportNumber": "US987654321"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Booking created successfully. Please complete payment to confirm.",
  "data": {
    "id": "BK#15JAN25-143022-ABC01",
    "referenceNumber": null,
    "dealId": 1,
    "totalPrice": 1500.00,
    "bookingStatus": "pending",
    "paymentStatus": "pending",
    "loyaltyPointsEarned": 0,
    "passengers": [...],
    "paymentInstructions": {
      "amount": 1500.00,
      "paymentMethods": ["card", "mpesa", "wallet"],
      "paymentUrl": "/payments/process/BK#15JAN25-143022-ABC01",
      "expiresAt": "2025-01-15T15:00:22.000Z"
    }
  }
}
```

### 2. Process Payment (Generate Points & Reference)

**POST** `{{base_url}}/bookings/{{booking_id}}/process-payment`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
```

**Body:**
```json
{
  "paymentTransactionId": "tx_1705321222000_abc123def",
  "paymentMethod": "card",
  "amount": 1500.00
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully. Booking confirmed and loyalty points earned.",
  "data": {
    "id": "BK#15JAN25-143022-ABC01",
    "referenceNumber": "AC122200ABC",
    "bookingStatus": "confirmed",
    "paymentStatus": "paid",
    "loyaltyPointsEarned": 7500,
    "paymentTransactionId": "tx_1705321222000_abc123def"
  }
}
```

### 3. Verify User Loyalty Points Updated

**GET** `{{base_url}}/users/wallet`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Wallet information retrieved successfully",
  "data": {
    "balance": 0.00,
    "loyaltyPoints": 7500,
    "loyaltyTier": "bronze",
    "currency": "USD",
    "lastTransaction": "2025-01-15T14:30:22.000Z",
    "recentTransactions": [
      {
        "id": "tx_1705321222000_abc123def",
        "type": "loyalty_earned",
        "amount": 0,
        "pointsAmount": 7500,
        "description": "Booking AC122200ABC - Earned 7500 miles from $1500.00 payment",
        "status": "completed",
        "createdAt": "2025-01-15T14:30:22.000Z"
      }
    ]
  }
}
```

### 4. Get Booking Timeline

**GET** `{{base_url}}/bookings/{{booking_id}}/timeline`

**Headers:**
```
Authorization: Bearer {{jwt_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Booking timeline retrieved successfully",
  "data": [
    {
      "id": 2,
      "bookingId": "BK#15JAN25-143022-ABC01",
      "eventType": "payment_status_changed",
      "title": "Payment Processed",
      "description": "Payment of $1500.00 processed successfully. 7500 loyalty points earned.",
      "newValue": "paid",
      "metadata": {
        "paymentTransactionId": "tx_1705321222000_abc123def",
        "paymentMethod": "card",
        "amount": 1500.00,
        "loyaltyPointsEarned": 7500,
        "referenceNumber": "AC122200ABC"
      },
      "createdAt": "2025-01-15T14:30:22.000Z"
    },
    {
      "id": 3,
      "bookingId": "BK#15JAN25-143022-ABC01",
      "eventType": "booking_confirmed",
      "title": "Booking Confirmed",
      "description": "Booking confirmed after successful payment. Reference: AC122200ABC",
      "metadata": {
        "paymentTransactionId": "tx_1705321222000_abc123def",
        "referenceNumber": "AC122200ABC"
      },
      "createdAt": "2025-01-15T14:30:22.000Z"
    },
    {
      "id": 1,
      "bookingId": "BK#15JAN25-143022-ABC01",
      "eventType": "booking_created",
      "title": "Booking Created",
      "description": "Booking BK#15JAN25-143022-ABC01 has been created successfully. Reference number and loyalty points will be generated upon payment.",
      "metadata": {
        "passengerCount": 2,
        "companyId": 1,
        "totalPrice": 1500.00
      },
      "createdAt": "2025-01-15T14:25:15.000Z"
    }
  ]
}
```

### 5. Process Refund (Deduct Points)

**POST** `{{base_url}}/bookings/{{booking_id}}/refund`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
```

**Body:**
```json
{
  "refundAmount": 750.00,
  "refundReason": "Customer requested partial cancellation"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Refund processed successfully. Loyalty points adjusted accordingly.",
  "data": {
    "id": "BK#15JAN25-143022-ABC01",
    "bookingStatus": "cancelled",
    "paymentStatus": "refunded",
    "refundAmount": 750.00,
    "refundReason": "Customer requested partial cancellation"
  }
}
```

### 6. Verify Points Deducted

**GET** `{{base_url}}/users/wallet`

**Expected Response:**
```json
{
  "success": true,
  "message": "Wallet information retrieved successfully",
  "data": {
    "balance": 0.00,
    "loyaltyPoints": 3750,
    "loyaltyTier": "bronze",
    "currency": "USD",
    "lastTransaction": "2025-01-15T14:35:10.000Z",
    "recentTransactions": [
      {
        "id": "tx_1705321510000_def456ghi",
        "type": "loyalty_adjustment",
        "amount": 0,
        "pointsAmount": -3750,
        "description": "Refund for booking AC122200ABC - Deducted 3750 miles",
        "status": "completed",
        "createdAt": "2025-01-15T14:35:10.000Z"
      },
      {
        "id": "tx_1705321222000_abc123def",
        "type": "loyalty_earned",
        "amount": 0,
        "pointsAmount": 7500,
        "description": "Booking AC122200ABC - Earned 7500 miles from $1500.00 payment",
        "status": "completed",
        "createdAt": "2025-01-15T14:30:22.000Z"
      }
    ]
  }
}
```

## Error Test Cases

### 1. Duplicate Booking Prevention

**POST** `{{base_url}}/bookings` (same dealId, same user)

**Expected Response:**
```json
{
  "statusCode": 409,
  "message": "A booking for this deal is already in progress or confirmed.",
  "error": "Conflict"
}
```

### 2. Payment Already Processed

**POST** `{{base_url}}/bookings/{{booking_id}}/process-payment` (already paid booking)

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Payment already processed",
  "error": "Bad Request"
}
```

### 3. Invalid Payment Amount

**POST** `{{base_url}}/bookings/{{booking_id}}/process-payment`

**Body:**
```json
{
  "paymentTransactionId": "tx_1705321222000_abc123def",
  "paymentMethod": "card",
  "amount": 1000.00
}
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Payment amount does not match booking total",
  "error": "Bad Request"
}
```

### 4. Insufficient Loyalty Points for Redemption

**POST** `{{base_url}}/wallet/redeem-points`

**Body:**
```json
{
  "miles": 10000,
  "description": "Redeem for discount"
}
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Insufficient loyalty points",
  "error": "Bad Request"
}
```

## Environment Variables

Set up these environment variables in Postman:

```
base_url: http://localhost:3000
jwt_token: <your_jwt_token>
booking_id: <booking_id_from_create_response>
```

## Test Flow Summary

1. **Create Booking** → Verify no reference number, no points
2. **Process Payment** → Verify reference generated, points earned
3. **Check User Wallet** → Verify loyalty points updated
4. **View Timeline** → Verify payment events recorded
5. **Process Refund** → Verify points deducted proportionally
6. **Check Final State** → Verify all balances correct

## Validation Points

- Reference numbers are only generated after payment
- Loyalty points are only earned after payment
- Timeline events track all payment activities
- Refunds deduct points proportionally
- Duplicate bookings are prevented
- All operations are transactional and safe 